import { ParsedJson5, CommentedLine } from "./parseJson5File";

/**
 * Recursively builds the ParsedJson5 structure from a canonical object,
 * injecting preserved comments and blank lines where available.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function syncWithCanonical(
  parsed: ParsedJson5,
  canonical: object,
): ParsedJson5 {
  // Build comment map from existing parsed data
  const commentMap = new Map<
    string,
    { precedingComments: string[]; trailingComment?: string }
  >();

  // Replace the comment map building section with this debug version:
  for (const entry of parsed) {
    if (entry.rawLine.trim() !== "") {
      let pathKey = JSON.stringify(entry.path);

      // Skip array closing brackets to avoid overwriting opening bracket comments
      if (entry.rawLine.trim() === "]" || entry.rawLine.trim() === "],") {
        continue;
      }

      // For root-level properties, the path is [] but we need to map by property name
      if (entry.path.length === 0 && entry.rawLine.includes(":")) {
        const match = entry.rawLine.match(/"([^"]+)"\s*:/);
        if (match) {
          pathKey = JSON.stringify([match[1]]);
        }
      }
      // For nested properties, we need to extract the key from the raw line
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
      // For array items and other entries, use the path as-is
      else {
        pathKey = JSON.stringify(entry.path);
      }

      commentMap.set(pathKey, {
        precedingComments: entry.precedingComments,
        trailingComment: entry.trailingComment,
      });
    }
  }

  let lineNumber = 1;
  const result: ParsedJson5 = [];

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

  function buildObject(
    obj: any,
    path: string[],
    indentLevel: number,
    isLast: boolean = false,
  ) {
    const indent = "  ".repeat(indentLevel);

    if (path.length === 0) {
      // Root object opening brace
      emitLine([], "{");
    } else {
      // Named object opening
      const comments = commentMap.get(JSON.stringify(path));
      emitLine(
        path,
        `${indent}"${path[path.length - 1]}": {`,
        comments?.precedingComments ?? [],
        comments?.trailingComment,
      );
    }

    const keys = Object.keys(obj);
    keys.forEach((key, index) => {
      const childPath = [...path, key];
      const value = obj[key];
      const isLastKey = index === keys.length - 1;

      buildValue(value, childPath, indentLevel + 1, true); // Always pass true for trailing comma
    });

    // Closing brace - always add comma except for root object
    const comma = path.length > 0 ? "," : "";
    emitLine(path, `${indent}}${comma}`);
  }

  function buildArray(
    arr: any[],
    path: string[],
    indentLevel: number,
    isLast: boolean = false,
  ) {
    const indent = "  ".repeat(indentLevel);
    const comments = commentMap.get(JSON.stringify(path));

    // Array opening
    emitLine(
      path,
      `${indent}"${path[path.length - 1]}": [`,
      comments?.precedingComments ?? [],
      comments?.trailingComment,
    );

    arr.forEach((item, index) => {
      const itemPathWithNumber = [...path, index];
      const itemComments = commentMap.get(JSON.stringify(itemPathWithNumber));

      const itemIndent = "  ".repeat(indentLevel + 1);
      // ALWAYS add trailing comma for version control benefits
      const comma = ",";

      const itemPathForEmit = [...path, index.toString()];
      emitLine(
        itemPathForEmit,
        `${itemIndent}${JSON.stringify(item)}${comma}`,
        itemComments?.precedingComments ?? [],
        itemComments?.trailingComment,
      );
    });

    // Closing bracket
    const closingComma = isLast ? "" : ",";
    emitLine(path, `${indent}]${closingComma}`);
  }

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
      // Primitive value
      const indent = "  ".repeat(indentLevel);
      const comments = commentMap.get(JSON.stringify(path));
      // Always add comma for primitive values
      const comma = ",";

      let rawLine: string;
      if (path.length > 0 && !isNaN(Number(path[path.length - 1]))) {
        // Array item - no key, just value
        rawLine = `${indent}${JSON.stringify(value)}${comma}`;
      } else {
        // Object property - key: value
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

  // Start building from root
  buildObject(canonical, [], 0);

  return result;
}
