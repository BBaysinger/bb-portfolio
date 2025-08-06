import { ParsedJson5, CommentedLine } from "./parseJson5File";

/**
 * Recursively builds the ParsedJson5 structure from a canonical object,
 * injecting preserved comments and blank lines where available.
 */
export function syncWithCanonical(
  parsed: ParsedJson5,
  canonical: object
): ParsedJson5 {
  // Build comment map from existing parsed data
  const commentMap = new Map<
    string,
    { precedingComments: string[]; trailingComment?: string }
  >();

  // Build a more sophisticated comment map based on the actual structure
  for (const entry of parsed) {
    if (entry.rawLine.trim() !== "") {
      let pathKey = JSON.stringify(entry.path);
      
      // For root-level properties, the path is [] but we need to map by property name
      if (entry.path.length === 0 && entry.rawLine.includes(':')) {
        const match = entry.rawLine.match(/"([^"]+)"\s*:/);
        if (match) {
          pathKey = JSON.stringify([match[1]]);
        }
      }
      // For nested properties, we need to extract the key from the raw line
      else if (entry.rawLine.includes(':') && !entry.rawLine.includes('{') && !entry.rawLine.includes('[')) {
        const match = entry.rawLine.match(/"([^"]+)"\s*:/);
        if (match) {
          const key = match[1];
          // Build the full path based on the existing path + this key
          const fullPath = [...entry.path, key];
          pathKey = JSON.stringify(fullPath);
        }
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
    trailingComment?: string
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
    isLast: boolean = false
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
        comments?.trailingComment
      );
    }

    const keys = Object.keys(obj);
    keys.forEach((key, index) => {
      const childPath = [...path, key];
      const value = obj[key];
      const isLastKey = index === keys.length - 1;
      
      buildValue(value, childPath, indentLevel + 1, isLastKey);
    });

    // Closing brace
    const comma = path.length > 0 && !isLast ? "," : "";
    emitLine(path, `${indent}}${comma}`);
  }

  function buildArray(
    arr: any[],
    path: string[],
    indentLevel: number,
    isLast: boolean = false
  ) {
    const indent = "  ".repeat(indentLevel);
    const comments = commentMap.get(JSON.stringify(path));
    
    // Array opening with optional trailing comment
    const trailingComment = comments?.trailingComment ? ` ${comments.trailingComment}` : "";
    emitLine(
      path,
      `${indent}"${path[path.length - 1]}": [${trailingComment}`,
      comments?.precedingComments ?? []
    );

    arr.forEach((item, index) => {
      const itemPath = [...path, index.toString()];
      const isLastItem = index === arr.length - 1;
      buildValue(item, itemPath, indentLevel + 1, isLastItem);
    });

    // Closing bracket
    const comma = !isLast ? "," : "";
    emitLine(path, `${indent}]${comma}`);
  }

  function buildValue(
    value: any,
    path: string[],
    indentLevel: number,
    isLast: boolean = false
  ) {
    if (Array.isArray(value)) {
      buildArray(value, path, indentLevel, isLast);
    } else if (typeof value === "object" && value !== null) {
      buildObject(value, path, indentLevel, isLast);
    } else {
      // Primitive value
      const indent = "  ".repeat(indentLevel);
      const comments = commentMap.get(JSON.stringify(path));
      const comma = !isLast ? "," : "";
      
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
        comments?.trailingComment
      );
    }
  }

  // Start building from root
  buildObject(canonical, [], 0);

  return result;
}
