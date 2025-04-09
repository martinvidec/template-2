import { Mark, mergeAttributes, InputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

// Define the Extension directly, including mark definition and input rules
const Hashtag = Mark.create({
  name: 'hashtag', // Use the mark name directly here

  // Make it inclusive so typing after it doesn't automatically continue the mark
  inclusive: false,

  // Excludes whitespace at the beginning and end for better styling
  // and to prevent issues when deleting space after tag
  excludes: "_",

  // Define how the mark is rendered in the DOM
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'hashtag' }), 0];
  },

  // Define how to parse this mark from HTML
  parseHTML() {
    return [
      {
        tag: 'span.hashtag',
        // No attributes needed for simple hashtag
      },
    ];
  },

  // Add the input rule to trigger the mark
  addInputRules() {
    return [
      new InputRule({
        // Regex to find #word followed by a space, capturing the #word part.
        find: /(?:^|\s)(#([a-zA-Z0-9_]+))\s$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const fullMatch = match[0];         // e.g., " #tag " or "#tag "
          const hashtagWithSymbol = match[1]; // e.g., "#tag"

          // Preserve leading space if it existed in the match
          const replacementText = fullMatch.startsWith(' ')
                                   ? ' ' + hashtagWithSymbol + ' '
                                   : hashtagWithSymbol + ' ';

          // Replace the original range with the potentially space-preserved text
          tr.replaceWith(start, end, state.schema.text(replacementText));

          // Calculate start/end for the mark, accounting for potential leading space
          const markStartOffset = replacementText.indexOf(hashtagWithSymbol);
          const markStart = start + markStartOffset;
          const markEnd = markStart + hashtagWithSymbol.length;

          // Apply the mark only to the hashtag itself (#tag)
          tr.addMark(markStart, markEnd, this.type.create());

          // Calculate cursor position after the trailing space
          const cursorPosition = start + replacementText.length;
          const resolvedPos = tr.doc.resolve(cursorPosition);
          tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
        },
      }),
    ];
  },
  
  // Add paste rule? (Optional: Detect hashtags on paste)
  // addPasteRules() { ... }
});

export default Hashtag; 