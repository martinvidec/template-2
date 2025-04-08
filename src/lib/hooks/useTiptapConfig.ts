import StarterKit from '@tiptap/starter-kit';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import CodeBlock from '@tiptap/extension-code-block';
import Mention, { MentionOptions } from '@tiptap/extension-mention';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorOptions } from '@tiptap/react';
import { Editor, Extension } from '@tiptap/core';

// Import the suggestion utility
import { suggestionConfigUtility } from '@/lib/tiptap/mentionSuggestion';

// Extend CodeBlock to add keyboard shortcuts and attributes
const CustomCodeBlock = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(), // Keep existing options
      HTMLAttributes: {
        class: 'font-sans', // Apply sans-serif font directly
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      // Exit node on Mod+Enter
      'Mod-Enter': ({ editor }: { editor: Editor }) => {
        if (!editor.isActive(this.name)) return false;
        const { state } = editor;
        const { selection } = state;
        const { $head, $anchor } = selection;
        // Ensure cursor is at the end of the code block
        if (!$head.parent.eq($anchor.parent) || $head.parentOffset !== $head.parent.content.size) {
          return false;
        }
        const end = $head.after();
        return editor
          .chain()
          .insertContentAt(end, { type: 'paragraph' })
          .focus(end + 1)
          .run();
      },
      // Prevent default Tab behavior (keeps focus in editor)
      // This might be optional depending on desired behavior
      'Tab': ({ editor }: { editor: Editor }) => {
         if (!editor.isActive(this.name)) return false;
         return editor.commands.insertContent('\t');
      },
      // Prevent default Shift+Tab behavior
      'Shift-Tab': () => true, // Just prevent browser behavior
    };
  },
});

interface UseTiptapConfigOptions {
  editable: boolean;
  placeholder?: string;
  enableMentionSuggestion: boolean;
}

// This hook RETURNS configuration objects, it does NOT call useEditor itself.
export function useTiptapConfig({
  editable,
  placeholder,
  enableMentionSuggestion,
}: UseTiptapConfigOptions): {
  extensions: EditorOptions['extensions'];
  editorProps: EditorOptions['editorProps'];
} {
  // Base options for Mention extension
  const mentionOptions: Partial<MentionOptions> = {
    HTMLAttributes: { class: 'mention' },
  };
  
  // Conditionally add the suggestion configuration
  if (enableMentionSuggestion) {
    mentionOptions.suggestion = suggestionConfigUtility;
  }

  const extensions: EditorOptions['extensions'] = [
    StarterKit.configure({
      horizontalRule: false,
      // Explicitly disable StarterKit lists and code block
      bulletList: false,
      orderedList: false,
      listItem: false,
      codeBlock: false,
    }),
    // Add standard lists MANUALLY before TaskList
    OrderedList,
    BulletList,
    ListItem,
    // Use the extended CustomCodeBlock
    CustomCodeBlock,
    // Then add TaskList
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    // Other extensions
    Underline,
    Link.configure({
      // Always autolink and link on paste
      autolink: true,
      linkOnPaste: true,
      // Open on click only for non-editable editors
      openOnClick: !editable,
    }),
    Highlight,
    Mention.configure(mentionOptions), // Pass the constructed options
    // Conditionally add Placeholder
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];

  const editorProps: EditorOptions['editorProps'] = {
    attributes: {
      // REMOVE prose classes again - Use manual CSS overrides instead
      class: `focus:outline-none`, 
    },
  };

  return { extensions, editorProps };
} 