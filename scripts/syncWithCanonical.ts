import { ParsedJson5, CommentedLine } from "./parseJson5File";

/**
 * Extracts the key from a line like `  "name": "value",` — accounting for indentation.
 */
function extractKey(line: string): string | null {
  const match = line.match(/^\s*"(.+?)":/);
  return match ? match[1] : null;
}

/**
 * Syncs a parsed JSON5 file with the canonical JSON structure.
 * Adds, removes, and reorders entries based on the canonical object.
 */
export function syncWithCanonical(
  parsed: ParsedJson5,
  canonical: object,
): ParsedJson5 {
  const commentMap = new Map<
    string,
    { precedingComments: string[]; trailingComment?: string }
  >();

  // Populate the comment map using keys extracted from each parsed line
  for (const entry of parsed) {
    const key = extractKey(entry.keyOrValue);
    if (key) {
      commentMap.set(key, {
        precedingComments: entry.precedingComments,
        trailingComment: entry.trailingComment,
      });
    }
  }

  const result: ParsedJson5 = [];

  for (const [index, [key, value]] of Object.entries(canonical).entries()) {
    const jsonLine = `"${key}": ${JSON.stringify(value, null, 2)}`;
    const comments = commentMap.get(key);

    const entry: CommentedLine = {
      keyOrValue: jsonLine,
      precedingComments: comments?.precedingComments ?? [],
      trailingComment: comments?.trailingComment,
      lineNumber: index, // Dummy value
      rawLine: jsonLine, // For now we treat rawLine as identical to keyOrValue
    };

    result.push(entry);
  }

  return result;
}
