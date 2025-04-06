import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, where, doc, getDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useError } from '@/lib/hooks/useError';
import Todo from './Todo';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  sharedWith?: string[];
  ownerId: string;
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [sharedTodos, setSharedTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const { user, loading: authLoading } = useAuth();
  const { reportError } = useError();
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);

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

    // --- Listener for Own Todos ---
    const qOwn = query(
      collection(db, `users/${user.uid}/todos`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOwn = onSnapshot(qOwn,
      (snapshot) => {
        console.log("Own todos snapshot received");
        const todosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ownerId: user.uid,
          ...(doc.data() as Omit<TodoItem, 'id' | 'ownerId'>),
        }));
        setTodos(todosData);
        setLoadingOwn(false);
      },
      (error) => {
        console.error("Error fetching own todos:", error);
        reportError(error, { component: 'TodoList', operation: 'fetchOwnTodosSnapshot' });
        setLoadingOwn(false);
      }
    );

    // --- Listener for Shared Todos (using collectionGroup) ---
    console.log(`Setting up shared todos listener for user ${user.uid}`);
    const qShared = query(
      collectionGroup(db, 'todos'),
      where('sharedWith', 'array-contains', user.uid)
    );

    const unsubscribeShared = onSnapshot(qShared, 
      (snapshot) => {
        console.log("Shared todos snapshot received", snapshot.docs.length, "docs");
        const sharedTodosData = snapshot.docs.map((doc) => {
          const ownerId = doc.ref.parent.parent?.id;
          if (!ownerId) {
             console.warn("Could not determine ownerId for shared todo:", doc.id);
             return null; 
          }
          if (ownerId === user.uid) {
              return null;
          }
          return {
            id: doc.id,
            ownerId: ownerId,
            ...(doc.data() as Omit<TodoItem, 'id' | 'ownerId'>),
          };
        }).filter((todo): todo is TodoItem => todo !== null);

        console.log("Processed shared todos:", sharedTodosData);
        setSharedTodos(sharedTodosData);
        setLoadingShared(false);
      },
      (error) => {
        console.error("Error fetching shared todos snapshot:", error);
        reportError(error, { component: 'TodoList', operation: 'fetchSharedTodosSnapshot' });
        setLoadingShared(false);
      }
    );

    return () => {
      console.log(`Cleaning up listeners for user ${user.uid}`);
      unsubscribeOwn();
      unsubscribeShared();
    };
  }, [user, reportError]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) {
      console.log("Cannot add todo: no text or no user logged in.");
      return;
    }

    try {
      console.log(`Adding new todo for user ${user.uid}`);
      await addDoc(collection(db, `users/${user.uid}/todos`), {
        text: newTodo,
        completed: false,
        createdAt: new Date(),
        sharedWith: [],
      });
      console.log("Todo added successfully");
      setNewTodo('');
    } catch (error) {
      console.error("Error adding todo:", error);
      if (error instanceof Error) {
        reportError(error, { component: 'TodoList', operation: 'addTodo' });
      } else {
        reportError(new Error('Unknown error adding todo'), { component: 'TodoList', operation: 'addTodo' });
      }
    }
  };

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
      <form onSubmit={addTodo} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={!newTodo.trim()}
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">My Todos</h2>
          <div className="space-y-2">
            {todos.length === 0 && <p className="text-gray-500 dark:text-gray-400">No todos yet.</p>}
            {todos.map((todo) => (
              <Todo
                key={`${todo.ownerId}-${todo.id}`}
                id={todo.id}
                text={todo.text}
                completed={todo.completed}
                userId={todo.ownerId}
                sharedWith={todo.sharedWith}
                isOwner={true}
              />
            ))}
          </div>
        </div>

        {sharedTodos.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Shared with Me</h2>
            <div className="space-y-2">
              {sharedTodos.map((todo) => (
                <Todo
                  key={`${todo.ownerId}-${todo.id}`}
                  id={todo.id}
                  text={todo.text}
                  completed={todo.completed}
                  userId={todo.ownerId}
                  sharedWith={todo.sharedWith}
                  isOwner={false}
                  originalUserId={todo.ownerId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 