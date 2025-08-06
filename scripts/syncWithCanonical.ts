import { ParsedJson5, CommentedLine } from "./parseJson5File";

/**
 * Recursively flattens an object into dot-path → value pairs.
 */
function* walkObject(
  obj: any,
  parentPath: string[] = [],
): Generator<[string[], any]> {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const currentPath = [...parentPath, key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      yield [currentPath, value];
      yield* walkObject(value, currentPath);
    } else {
      yield [currentPath, value];
    }
  }
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
    string, // joined path as key
    { precedingComments: string[]; trailingComment?: string }
  >();

  for (const entry of parsed) {
    const key = entry.path.join(".");
    commentMap.set(key, {
      precedingComments: entry.precedingComments,
      trailingComment: entry.trailingComment,
    });
  }

  const result: ParsedJson5 = [];
  const flattened = Array.from(walkObject(canonical));

  const openBraces = new Set<string>();
  let lastDepth = 0;

  result.push({
    rawLine: "{",
    precedingComments: [],
    trailingComment: undefined,
    lineNumber: 0,
    path: [],
  });

  for (let i = 0; i < flattened.length; i++) {
    const [pathArr, value] = flattened[i];
    const key = pathArr[pathArr.length - 1];
    const parentPathArr = pathArr.slice(0, -1);
    const depth = pathArr.length - 1;
    const indent = "  ".repeat(depth + 1);
    const pathKey = pathArr.join(".");
    const comments = commentMap.get(pathKey);

    // Open nested object braces
    for (let d = lastDepth; d < depth; d++) {
      const openPathArr = pathArr.slice(0, d + 1);
      const openPathKey = openPathArr.join(".");
      if (!openBraces.has(openPathKey)) {
        const openKey = openPathArr[d];
        const openIndent = "  ".repeat(d + 1);
        const openComments = commentMap.get(openPathKey);

        result.push({
          rawLine: `${openIndent}"${openKey}": {`,
          precedingComments: openComments?.precedingComments ?? [],
          trailingComment: openComments?.trailingComment,
          lineNumber: i + 1,
          path: [...openPathArr],
        });

        openBraces.add(openPathKey);
      }
    }

    const isLast = i === flattened.length - 1;
    const nextPathArr = !isLast ? flattened[i + 1][0] : [];
    const nextDepth = nextPathArr.length - 1;

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      const valueStr = JSON.stringify(value);
      const needsComma = depth >= nextDepth;
      const line = `${indent}"${key}": ${valueStr}${needsComma ? "," : ""}`;

      result.push({
        rawLine: line,
        precedingComments: comments?.precedingComments ?? [],
        trailingComment: comments?.trailingComment,
        lineNumber: i + 1,
        path: [...pathArr],
      });
    }

    // Close braces if moving up
    for (let d = lastDepth; d > nextDepth; d--) {
      const closeIndent = "  ".repeat(d);
      result.push({
        rawLine: `${closeIndent}},`,
        precedingComments: [],
        trailingComment: undefined,
        lineNumber: i + 2,
        path: [`__close__${d}`],
      });
    }

    lastDepth = nextDepth;
  }

  // Final closing brace
  result.push({
    rawLine: "}",
    precedingComments: [],
    trailingComment: undefined,
    lineNumber: flattened.length + 1,
    path: [],
  });

  return result;
}
