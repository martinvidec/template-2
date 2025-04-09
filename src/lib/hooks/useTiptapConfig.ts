import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Mention, { MentionOptions } from '@tiptap/extension-mention';
import Hashtag from '@/lib/tiptap/hashtagExtension';
import { EditorOptions } from '@tiptap/react';
// Re-import previously commented extensions
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Editor } from '@tiptap/core'; // Keep Editor import for CustomCodeBlock

// Import the suggestion utility again
import { suggestionConfigUtility } from '@/lib/tiptap/mentionSuggestion';

// Re-enable CustomCodeBlock definition
const CustomCodeBlock = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: { class: 'font-sans' },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': ({ editor }: { editor: Editor }) => {
        const { $head, $anchor } = editor.state.selection;
        if ($head.parent.type.name === 'codeBlock' && 
            $head.parentOffset === $head.parent.content.size &&
            $head.pos === $anchor.pos) { 
          return editor.chain().focus().exitCode().run();
        }
        return false;
      },
      'Tab': ({ editor }: { editor: Editor }) => {
        if (editor.isActive('codeBlock')) {
            return editor.commands.insertContent('  ');
        }
        return false;
      },
      'Shift-Tab': () => {
        return true; 
      },
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
  // Re-enable mentionOptions setup
  const mentionOptions: Partial<MentionOptions> = {
     HTMLAttributes: { class: 'mention' },
  };
  if (enableMentionSuggestion) {
    mentionOptions.suggestion = suggestionConfigUtility;
  }

  const extensions: EditorOptions['extensions'] = [
    StarterKit.configure({
      // Re-enable blockquote
      code: false, // Keep inline code disabled?
      codeBlock: false, // Use CustomCodeBlock instead
      dropcursor: false,
      gapcursor: false,
      hardBreak: false,
      // heading: undefined, // Default is enabled
      // history: undefined, // Default is enabled
      horizontalRule: false,
      // Disable lists in StarterKit as they are added separately
      orderedList: false, 
      bulletList: false, 
      listItem: false,
    }),
    // Re-add all extensions in intended order
    OrderedList,
    BulletList,
    ListItem,
    CustomCodeBlock,
    TaskList,
    TaskItem.configure({ nested: true }),
    Underline,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: !editable,
    }),
    Highlight,
    Mention.configure(mentionOptions),
    Hashtag,
    // Re-enable Placeholder
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];

  const editorProps: EditorOptions['editorProps'] = {
    attributes: {
      class: `focus:outline-none`,
    },
  };

  return { extensions, editorProps };
} 