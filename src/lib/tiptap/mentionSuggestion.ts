import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { ReactRenderer } from '@tiptap/react';
import { MentionOptions } from '@tiptap/extension-mention';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

// Import Suggestion List and its Ref type - Assuming path relative to this file
import SuggestionList, { SuggestionListRef, SuggestionItem, SuggestionListProps } from '@/components/SuggestionList';

// Define the Suggestion utility configuration
export const suggestionConfigUtility: Omit<MentionOptions['suggestion'], 'char' | 'allow'> = {
  // items: async ({ query: searchQuery }: { query: string }): Promise<SuggestionItem[]> => {
  //   // console.log("Mention query:", searchQuery); 
  //   try {
  //     const usersRef = collection(db, 'users');
  //     const q = query(usersRef, limit(5)); 
      
  //     const snapshot = await getDocs(q);
  //     const users = snapshot.docs.map(doc => {
  //       const data = doc.data() as { displayName?: string, email?: string, photoURL?: string }; 
  //       return {
  //         id: doc.id,
  //         label: data.displayName || data.email || doc.id,
  //         photoURL: data.photoURL,
  //       };
  //     });
  //     // console.log("Mention suggestions:", users);
  //     return users;
  //   } catch (error) {
  //     console.error("Error fetching mention suggestions:", error);
  //     return [];
  //   }
  // },

  render: () => {
    let component: ReactRenderer<SuggestionListRef, SuggestionListProps>;
    let popup: any;

    return {
      onStart: (props: SuggestionProps<SuggestionItem>) => {
        const listProps: SuggestionListProps = { items: props.items, command: props.command }; 
        component = new ReactRenderer(SuggestionList, {
          props: listProps,
          editor: props.editor,
        });

        const clientRect = props.clientRect?.(); 
        if (!clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: () => clientRect, 
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'light-border', // Use appropriate theme
        });
      },

      onUpdate: (props: SuggestionProps<SuggestionItem>) => {
        const listProps: SuggestionListProps = { items: props.items, command: props.command }; 
        component.updateProps(listProps);
        const clientRect = props.clientRect?.();
        if (!clientRect || !popup || !popup[0]) return;
        popup[0].setProps({ getReferenceClientRect: () => clientRect });
      },

      onKeyDown: (props: SuggestionKeyDownProps): boolean => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        const listRef = component.ref;
        if (listRef?.onKeyDown) { 
           return listRef.onKeyDown({ event: props.event });
        }
        return false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
}; 