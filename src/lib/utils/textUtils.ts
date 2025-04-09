/**
 * Extracts hashtags (words following a #) from a given text.
 * 
 * @param text The input text string.
 * @returns An array of unique hashtag strings (without the leading #).
 */
export function extractHashtags(text: string): string[] {
  if (!text) {
    return [];
  }
  // Regex to find # followed by word characters (letters, numbers, underscore)
  const regex = /#([a-zA-Z0-9_]+)/g;
  const matches = text.match(regex);

  if (!matches) {
    return [];
  }

  // Extract the word part and remove duplicates
  const tags = matches.map(match => match.substring(1)); // Remove the leading #
  return [...new Set(tags)]; // Return unique tags
}

/**
 * Extracts mention UIDs from a Tiptap JSON node structure.
 * 
 * @param node The Tiptap node (or the editor's JSON content).
 * @returns An array of unique mention UIDs.
 */
export function extractMentionIds(node: any): string[] {
  let ids: string[] = [];
  if (!node) return ids;

  // Check the current node
  if (node.type === 'mention' && node.attrs?.id) {
    ids.push(node.attrs.id);
  }

  // Recursively check content if it exists
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((childNode: any) => {
      ids = ids.concat(extractMentionIds(childNode));
    });
  }
  // Remove duplicates
  return [...new Set(ids)];
} 