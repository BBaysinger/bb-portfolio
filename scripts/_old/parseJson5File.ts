import fs from "fs";

export interface CommentedLine {
  lineNumber: number;
  rawLine: string;
  precedingComments: string[];
  trailingComment?: string;
  path: (string | number)[];
}

export type ParsedJson5 = CommentedLine[];

/**
 * Parses a JSON5 file and extracts its structure along with all comments and formatting information.
 *
 * This parser handles:
 * - Single-line comments (//) and block comments (/ * * /)
 * - Trailing comments on the same line as JSON content
 * - Nested objects and arrays with proper path tracking
 * - Array items with numeric indices in their paths
 * - Comment detection that skips "//" inside URL strings
 *
 * The parser builds a structured representation that preserves all formatting
 * and comments while tracking the JSON path to each element for later reconstruction.
 *
 * @param filePath - Path to the JSON5 file to parse
 * @returns Parsed structure with comments, paths, and line information
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function parseJson5File(filePath: string): ParsedJson5 {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const parsed: ParsedJson5 = [];

  let insideBlockComment = false;
  let pendingComments: string[] = [];
  // Track current path in JSON structure (e.g., ["scripts", "build"])
  const pathStack: (string | number)[] = [];
  // Track array indices for proper array item path generation
  const arrayIndexStack: number[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;

    // Skip empty lines
    if (!trimmed) return;

    // Block comment handling (/* ... */)
    if (trimmed.startsWith("/*")) insideBlockComment = true;
    if (insideBlockComment) {
      pendingComments.push(line);
      if (trimmed.endsWith("*/") || trimmed.includes("*/")) {
        insideBlockComment = false;
      }
      return;
    }

    // Single-line comment (//)
    if (trimmed.startsWith("//")) {
      pendingComments.push(line);
      return;
    }

    // Closing brace or bracket - pop from path stack
    if (trimmed === "}," || trimmed === "}" || trimmed === "],") {
      const last = pathStack[pathStack.length - 1];
      // If last path element is a number, we're closing an array
      if (typeof last === "number") arrayIndexStack.pop();
      pathStack.pop();
      return;
    }

    // Start of nested object: "key": {
    const objectStartMatch = trimmed.match(/^"([^"]+)":\s*{\s*$/);
    if (objectStartMatch) {
      const key = objectStartMatch[1];
      pathStack.push(key);
      parsed.push({
        lineNumber,
        rawLine: line,
        precedingComments: pendingComments,
        trailingComment: undefined,
        path: [...pathStack],
      });
      pendingComments = [];
      return;
    }

    // Start of array: "key": [
    const arrayStartMatch = trimmed.match(/^"([^"]+)":\s*\[.*$/);
    if (arrayStartMatch) {
      const key = arrayStartMatch[1];
      pathStack.push(key);
      // Initialize array index counter at 0
      arrayIndexStack.push(0);

      // Extract trailing comment from array start line if present
      let trailingComment: string | undefined;
      const inlineCommentIdx = line.indexOf("//");
      if (inlineCommentIdx !== -1) {
        trailingComment = line.slice(inlineCommentIdx).trim();
      }

      parsed.push({
        lineNumber,
        rawLine: line,
        precedingComments: pendingComments,
        trailingComment,
        path: [...pathStack],
      });
      pendingComments = [];
      return;
    }

    // Trailing comment detection - handle multiple "//" occurrences correctly
    let mainContent = line;
    let trailingComment: string | undefined;

    // Find the correct "//" that represents an actual comment (not part of a URL)
    let inlineCommentIdx = -1;
    let searchStart = 0;
    while (true) {
      const idx = line.indexOf("//", searchStart);
      if (idx === -1) break;

      // Check if this "//" is inside a string by counting quotes before it
      const beforeComment = line.slice(0, idx);
      const quoteCount = (beforeComment.match(/"/g) || []).length;

      // If we have an even number of quotes, we're outside a string (so it's a comment)
      if (quoteCount % 2 === 0) {
        inlineCommentIdx = idx;
        break;
      }

      // This "//" is inside a string (like a URL), keep searching
      searchStart = idx + 2;
    }

    // Extract the trailing comment if found
    if (inlineCommentIdx !== -1) {
      const beforeComment = line.slice(0, inlineCommentIdx);

      // Check for key-value pattern: "key": "value", (with optional comma)
      const keyValuePattern = /^[^"]*"[^"]*":\s*"[^"]*",?\s*$/;
      const isAfterValue = keyValuePattern.test(beforeComment);

      // Check for array item pattern: "value", or "value" (with optional comma)
      const arrayItemPattern = /^\s*"[^"]*",?\s*$/;
      const isArrayItem = arrayItemPattern.test(beforeComment);

      // If it's after a complete key-value pair OR it's an array item, extract the comment
      if (isAfterValue || isArrayItem || !beforeComment.includes('"')) {
        mainContent = beforeComment.trim();
        trailingComment = line.slice(inlineCommentIdx).trim();
      }
    }

    // Array item detection and processing
    if (
      arrayIndexStack.length > 0 &&
      mainContent.trim().startsWith('"') &&
      !mainContent.trim().includes(":")
    ) {
      // Get current array index and build path with numeric index
      const index = arrayIndexStack[arrayIndexStack.length - 1];
      const currentPath = [...pathStack, index];

      parsed.push({
        lineNumber,
        rawLine: line,
        precedingComments: pendingComments,
        trailingComment,
        path: currentPath,
      });

      // Increment array index for next item
      arrayIndexStack[arrayIndexStack.length - 1]++;
      pendingComments = [];
      return;
    }

    // Key-value pair processing
    const keyMatch = mainContent.match(/^"([^"]+)":/);
    const key = keyMatch?.[1];
    const currentPath = key ? [...pathStack, key] : [...pathStack];

    parsed.push({
      lineNumber,
      rawLine: line,
      precedingComments: pendingComments,
      trailingComment,
      path: currentPath,
    });

    pendingComments = [];
  });

  // console.info(parsed);
  return parsed;
}
