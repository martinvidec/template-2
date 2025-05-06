import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, where, doc, getDoc, getDocs, collectionGroup, limit, startAt, endAt } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useError } from '@/lib/hooks/useError';
import Todo from './Todo';
import { useTheme } from '@/lib/contexts/ThemeContext';

// Import Tiptap
import { useEditor, EditorContent } from '@tiptap/react';
import { useTiptapConfig } from '@/lib/hooks/useTiptapConfig';

// Import Suggestion List and its Ref type
import TiptapToolbar from './TiptapToolbar';

// Import the extracted suggestion config
import { suggestionConfigUtility } from '@/lib/tiptap/mentionSuggestion';

// Import list items manually
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import CodeBlock from '@tiptap/extension-code-block'; // Import CodeBlock
import { extractHashtags } from '@/lib/utils/textUtils'; // Import helper

interface TodoItem {
  id: string;
  // Switch to storing content as JSON
  text?: string; // Keep for potential fallback/migration
  content: any | null; // Store Tiptap JSON content
  completed: boolean;
  createdAt: Date;
  sharedWith?: string[];
  ownerId: string;
  mentionedUsers?: string[]; // Existing
  tags?: string[]; // Add tags field
}

// Helper function to extract mention UIDs from Tiptap JSON
const extractMentionIds = (node: any): string[] => {
  let ids: string[] = [];
  if (node.type === 'mention' && node.attrs?.id) {
    ids.push(node.attrs.id);
  }
  if (node.content) {
    node.content.forEach((childNode: any) => {
      ids = ids.concat(extractMentionIds(childNode));
    });
  }
  // Remove duplicates
  return [...new Set(ids)]; 
};

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [sharedTodos, setSharedTodos] = useState<TodoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading: authLoading } = useAuth();
  const { reportError } = useError();
  const { resolvedTheme } = useTheme();
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);
  const [isInCodeBlock, setIsInCodeBlock] = useState(false); // State for code block hint

  // Get editor config from the hook, now passing currentUserId
  const { extensions, editorProps } = useTiptapConfig({
    editable: true,
    placeholder: 'Add a new todo... Type @ to mention users or # for tags.', // Updated placeholder
    enableMentionSuggestion: true,
    currentUserId: user?.uid, // Pass the current user's ID
  });

  // --- Tiptap Editor Initialization using the hook config ---
  const editor = useEditor({
    extensions,
    editorProps,
    content: '', // Initial content remains empty
    immediatelyRender: false,
    // Add event listener for selection updates
    onSelectionUpdate: ({ editor }) => {
      setIsInCodeBlock(editor.isActive('codeBlock'));
    },
    // Also check on initial creation or content updates
    onCreate: ({ editor }) => {
      setIsInCodeBlock(editor.isActive('codeBlock'));
    },
    onUpdate: ({ editor }) => {
       // Optional: Also update on general updates if needed, but selection is often enough
       // setIsInCodeBlock(editor.isActive('codeBlock'));
    },
  });

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setSharedTodos([]);
      setLoadingOwn(false);
      setLoadingShared(false);
      console.log("No user logged in, clearing todos.");
      return;
    }

    console.log(`Setting up listeners for user ${user.uid}`);
    setLoadingOwn(true);
    setLoadingShared(true);

    // Adapt onSnapshot callbacks to handle potential 'content' field
    const handleSnapshot = (snapshot: any, isOwn: boolean) => {
      const todosData = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          const ownerId = isOwn ? user.uid : doc.ref.parent.parent?.id;
          if (!isOwn && ownerId === user.uid) return null; // Filter own todos from shared
          if (!ownerId) return null; // Should not happen for own, check for shared
          
          return {
            id: doc.id,
            ownerId: ownerId,
            // Prioritize content field, fall back to text
            content: data.content || null, 
            text: data.text || '', // Keep text for now
            completed: data.completed ?? false,
            // Convert Firestore Timestamp to Date
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(), 
            sharedWith: data.sharedWith || [],
            mentionedUsers: data.mentionedUsers || [],
            tags: data.tags || [],
          };
      }).filter((todo: any): todo is TodoItem => todo !== null);

      if (isOwn) {
          setTodos(todosData);
          setLoadingOwn(false);
      } else {
          // Filter out potential duplicates if a todo is both owned and shared (shouldn't happen with current logic)
          const uniqueShared = todosData.filter((st: TodoItem) => !todos.some(ot => ot.id === st.id));
          setSharedTodos(uniqueShared);
          setLoadingShared(false);
      }
    };

    // Own Todos Listener
    const qOwn = query(collection(db, `users/${user.uid}/todos`), orderBy('createdAt', 'desc'));
    const unsubscribeOwn = onSnapshot(qOwn, (snapshot) => handleSnapshot(snapshot, true), (error) => {
       console.error("Error fetching own todos:", error);
       reportError(error, { component: 'TodoList', operation: 'fetchOwnTodosSnapshot' });
       setLoadingOwn(false);
    });

    // Shared Todos Listener
    const qShared = query(collectionGroup(db, 'todos'), where('sharedWith', 'array-contains', user.uid));
    const unsubscribeShared = onSnapshot(qShared, (snapshot) => handleSnapshot(snapshot, false), (error) => {
       console.error("Error fetching shared todos snapshot:", error);
       reportError(error, { component: 'TodoList', operation: 'fetchSharedTodosSnapshot' });
       setLoadingShared(false);
    });

    return () => {
      console.log(`Cleaning up listeners for user ${user.uid}`);
      unsubscribeOwn();
      unsubscribeShared();
    };
  }, [user, reportError]);

  // --- Update Add Todo function to save JSON content AND mentionedUsers ---
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editor) return;

    const contentJSON = editor.getJSON();
    const contentText = editor.getText().trim();

    if (!contentText) { 
       console.log("Cannot add empty todo.");
       editor.commands.clearContent();
       return;
    }

    const mentionedUserIds = extractMentionIds(contentJSON);
    const extractedTags = extractHashtags(editor.getText()); // Extract tags

    try {
      await addDoc(collection(db, `users/${user.uid}/todos`), {
        content: contentJSON, 
        text: editor.getText(),
        completed: false,
        createdAt: new Date(),
        sharedWith: [],
        mentionedUsers: mentionedUserIds,
        tags: extractedTags, // Save tags
      });
      editor.commands.clearContent(true);
    } catch (error) {
      console.error("Error adding todo:", error);
      if (error instanceof Error) {
        reportError(error, { component: 'TodoList', operation: 'addTodo' });
      } else {
        reportError(new Error('Unknown error adding todo'), { component: 'TodoList', operation: 'addTodo' });
      }
    }
  };

  // Cleanup editor instance
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Filter todos based on search query (multiple tags)
  const filteredTodos = useMemo(() => {
    const searchTerms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);

    console.log('[Debug] Search Terms (My Todos):', searchTerms); // Log search terms

    if (searchTerms.length === 0) {
      return todos;
    }

    return todos.filter(todo => {
      const todoTagsLower = todo.tags?.map(tag => tag.toLowerCase()) || [];
      const doesMatch = searchTerms.every(term =>
        todoTagsLower.some(tag => tag.includes(term))
      );

      // Log details for each todo being filtered
      console.log(`[Debug] My Todo ${todo.id}: Tags:`, todo.tags, ` | Lower Tags:`, todoTagsLower, ` | Matches All Terms (${searchTerms.join(', ')}):`, doesMatch);

      return doesMatch;
    });
  }, [todos, searchQuery]);

  const filteredSharedTodos = useMemo(() => {
    const searchTerms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);

    console.log('[Debug] Search Terms (Shared Todos):', searchTerms); // Log search terms

    if (searchTerms.length === 0) {
      return sharedTodos;
    }

    return sharedTodos.filter(todo => {
      const todoTagsLower = todo.tags?.map(tag => tag.toLowerCase()) || [];
      const doesMatch = searchTerms.every(term =>
        todoTagsLower.some(tag => tag.includes(term))
      );

      // Log details for each shared todo being filtered
      console.log(`[Debug] Shared Todo ${todo.id} (Owner: ${todo.ownerId}): Tags:`, todo.tags, ` | Lower Tags:`, todoTagsLower, ` | Matches All Terms (${searchTerms.join(', ')}):`, doesMatch);

      return doesMatch;
    });
  }, [sharedTodos, searchQuery]);

  const isLoading = authLoading || loadingOwn || loadingShared;

  if (isLoading) {
    return (
      <div className="text-center p-4 text-gray-900 dark:text-gray-100">
        Loading Todos...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-4 text-gray-900 dark:text-gray-100">
        Please sign in to manage your todos.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={addTodo} className="mb-6">
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg">
          <TiptapToolbar editor={editor} />
          <div className="flex-1 p-2 bg-white dark:bg-gray-700">
            <EditorContent 
              editor={editor} 
            />
          </div>
        </div>

        {/* Container for button and hint */}
        <div className="flex justify-between items-center mt-2"> 
           {/* Hint text - shown only when in code block */}
           <div className="flex-1 text-left"> {/* Takes up space to push button right */} 
             {isInCodeBlock && (
               <p className="text-xs text-gray-500 dark:text-gray-400">
                 Use Cmd/Ctrl+Enter to exit code block.
               </p>
             )}
           </div>
           {/* Add Todo Button */}
           <button
             type="submit"
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm ml-2" // Add margin if needed
             disabled={!editor || editor.getText().trim().length === 0}
           >
             Add Todo
           </button>
        </div>
      </form>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tags (e.g., work important)..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">My Todos</h2>
          <div className="space-y-2">
            {filteredTodos.length === 0 && <p className="text-gray-500 dark:text-gray-400">{searchQuery ? 'No matching todos found.' : 'No todos yet.'}</p>}
            {filteredTodos.map((todo) => (
              <Todo
                key={`${todo.ownerId}-${todo.id}`}
                id={todo.id}
                content={todo.content}
                text={todo.text || ''}
                completed={todo.completed}
                userId={todo.ownerId} 
                sharedWith={todo.sharedWith}
                isOwner={true}
                tags={todo.tags}
              />
            ))}
          </div>
        </div>

        {(sharedTodos.length > 0 || (searchQuery && filteredSharedTodos.length > 0)) && (
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Shared with Me</h2>
            <div className="space-y-2">
              {filteredSharedTodos.length === 0 && searchQuery && <p className="text-gray-500 dark:text-gray-400">No matching shared todos found.</p>}
              {filteredSharedTodos.map((todo) => (
                <Todo
                  key={`${todo.ownerId}-${todo.id}`}
                  id={todo.id}
                  content={todo.content}
                  text={todo.text || ''}
                  completed={todo.completed}
                  userId={todo.ownerId}
                  sharedWith={todo.sharedWith}
                  isOwner={false}
                  originalUserId={todo.ownerId}
                  tags={todo.tags}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 