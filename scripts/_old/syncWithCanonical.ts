import { ParsedJson5, CommentedLine } from "./parseJson5File";

/**
 * Synchronizes a canonical JSON object with existing parsed JSON5 data,
 * preserving comments and formatting while ensuring structure matches the canonical version.
 *
 * This function rebuilds the JSON5 structure from the canonical object while injecting
 * preserved comments, trailing comments, and maintaining consistent formatting.
 * Handles proper comma placement for version control benefits (trailing commas in arrays/objects).
 *
 * @param parsed - The existing parsed JSON5 data with comments and formatting
 * @param canonical - The canonical object structure to match
 * @returns New ParsedJson5 structure with canonical data and preserved comments
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function syncWithCanonical(
  parsed: ParsedJson5,
  canonical: object,
): ParsedJson5 {
  // Build comment map from existing parsed data to preserve comments during reconstruction
  const commentMap = new Map<
    string,
    { precedingComments: string[]; trailingComment?: string }
  >();

  // Extract comments from parsed data and map them by their JSON path for later lookup
  for (const entry of parsed) {
    if (entry.rawLine.trim() !== "") {
      let pathKey = JSON.stringify(entry.path);

      // Skip array closing brackets to avoid overwriting opening bracket comments
      // (closing brackets don't need their own comments)
      if (entry.rawLine.trim() === "]" || entry.rawLine.trim() === "],") {
        continue;
      }

      // For root-level properties, the path is [] but we need to map by property name
      // Extract the key from lines like: "name": "value"
      if (entry.path.length === 0 && entry.rawLine.includes(":")) {
        const match = entry.rawLine.match(/"([^"]+)"\s*:/);
        if (match) {
          pathKey = JSON.stringify([match[1]]);
        }
      }
      // For nested properties, extract the key and build the full path
      // Handles cases where the path might already include the key to avoid duplication
      else if (
        entry.rawLine.includes(":") &&
        !entry.rawLine.includes("{") &&
        !entry.rawLine.includes("[")
      ) {
        const match = entry.rawLine.match(/"([^"]+)"\s*:/);
        if (match) {
          const key = match[1];
          // Check if the path already includes this key to avoid duplication
          if (entry.path[entry.path.length - 1] === key) {
            // Path already includes the key, use as-is
            pathKey = JSON.stringify(entry.path);
          } else {
            // Build the full path based on the existing path + this key
            const fullPath = [...entry.path, key];
            pathKey = JSON.stringify(fullPath);
          }
        }
      }
      // For array items and other entries (like opening braces), use the path as-is
      // Array items have numeric indices in their paths like ["pnpm","onlyBuiltDependencies",0]
      else {
        pathKey = JSON.stringify(entry.path);
      }

      // Store the comments in the map for later retrieval during reconstruction
      commentMap.set(pathKey, {
        precedingComments: entry.precedingComments,
        trailingComment: entry.trailingComment,
      });
    }
  }

  let lineNumber = 1;
  const result: ParsedJson5 = [];

  /**
   * Emits a line to the result with proper line numbering and comment preservation
   */
  function emitLine(
    path: string[],
    rawLine: string,
    precedingComments: string[] = [],
    trailingComment?: string,
  ) {
    result.push({
      lineNumber: lineNumber++,
      rawLine,
      precedingComments,
      trailingComment,
      path,
    });
  }

  /**
   * Recursively builds an object structure with proper indentation and comment preservation
   */
  function buildObject(
    obj: any,
    path: string[],
    indentLevel: number,
    isLast: boolean = false,
  ) {
    const indent = "  ".repeat(indentLevel);

    if (path.length === 0) {
      // Root object opening brace (no key, no comments)
      emitLine([], "{");
    } else {
      // Named object opening with potential comments
      const comments = commentMap.get(JSON.stringify(path));
      emitLine(
        path,
        `${indent}"${path[path.length - 1]}": {`,
        comments?.precedingComments ?? [],
        comments?.trailingComment,
      );
    }

    // Process all object properties
    const keys = Object.keys(obj);
    keys.forEach((key, index) => {
      const childPath = [...path, key];
      const value = obj[key];
      const isLastKey = index === keys.length - 1;

      // Always pass true for trailing comma to maintain consistent formatting
      buildValue(value, childPath, indentLevel + 1, true);
    });

    // Closing brace - add comma except for root object
    const comma = path.length > 0 ? "," : "";
    emitLine(path, `${indent}}${comma}`);
  }

  /**
   * Builds an array structure with proper comment preservation for array items
   */
  function buildArray(
    arr: any[],
    path: string[],
    indentLevel: number,
    isLast: boolean = false,
  ) {
    const indent = "  ".repeat(indentLevel);
    const comments = commentMap.get(JSON.stringify(path));

    // Array opening with preserved comments
    emitLine(
      path,
      `${indent}"${path[path.length - 1]}": [`,
      comments?.precedingComments ?? [],
      comments?.trailingComment,
    );

    // Process each array item with numeric path indexing
    arr.forEach((item, index) => {
      // Use numeric index for comment lookup (matches parseJson5File.ts behavior)
      const itemPathWithNumber = [...path, index];
      const itemComments = commentMap.get(JSON.stringify(itemPathWithNumber));

      const itemIndent = "  ".repeat(indentLevel + 1);
      // Always add trailing comma for version control benefits (reduces diff noise)
      const comma = ",";

      // Convert numeric index to string for emitLine path (for consistency)
      const itemPathForEmit = [...path, index.toString()];
      emitLine(
        itemPathForEmit,
        `${itemIndent}${JSON.stringify(item)}${comma}`,
        itemComments?.precedingComments ?? [],
        itemComments?.trailingComment,
      );
    });

    // Closing bracket - add comma unless this is the last property in parent object
    const closingComma = isLast ? "" : ",";
    emitLine(path, `${indent}]${closingComma}`);
  }

  /**
   * Routes value building to appropriate handler based on type
   */
  function buildValue(
    value: any,
    path: string[],
    indentLevel: number,
    isLast: boolean = false,
  ) {
    if (Array.isArray(value)) {
      buildArray(value, path, indentLevel, isLast);
    } else if (typeof value === "object" && value !== null) {
      buildObject(value, path, indentLevel, isLast);
    } else {
      // Primitive value (string, number, boolean, null)
      const indent = "  ".repeat(indentLevel);
      const comments = commentMap.get(JSON.stringify(path));
      // Always add comma for primitive values (trailing commas are good for version control)
      const comma = ",";

      let rawLine: string;
      // Check if this is an array item (numeric path) vs object property (string path)
      if (path.length > 0 && !isNaN(Number(path[path.length - 1]))) {
        // Array item - no key, just value
        rawLine = `${indent}${JSON.stringify(value)}${comma}`;
      } else {
        // Object property - key: value format
        const key = path[path.length - 1];
        rawLine = `${indent}"${key}": ${JSON.stringify(value)}${comma}`;
      }

      emitLine(
        path,
        rawLine,
        comments?.precedingComments ?? [],
        comments?.trailingComment,
      );
    }
  }

  // Start building from the root canonical object
  buildObject(canonical, [], 0);

  return result;
}
