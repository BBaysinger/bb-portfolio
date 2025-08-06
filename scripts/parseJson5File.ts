import fs from "fs";

export interface CommentedLine {
  lineNumber: number;
  rawLine: string;
  precedingComments: string[];
  trailingComment?: string;
  path: (string | number)[];
}

export type ParsedJson5 = CommentedLine[];

export function parseJson5File(filePath: string): ParsedJson5 {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const parsed: ParsedJson5 = [];

  let insideBlockComment = false;
  let pendingComments: string[] = [];
  const pathStack: (string | number)[] = [];
  const arrayIndexStack: number[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (!trimmed) return;

    // Block comment
    if (trimmed.startsWith("/*")) insideBlockComment = true;
    if (insideBlockComment) {
      pendingComments.push(line);
      if (trimmed.endsWith("*/") || trimmed.includes("*/")) {
        insideBlockComment = false;
      }
      return;
    }

    // Single-line comment
    if (trimmed.startsWith("//")) {
      pendingComments.push(line);
      return;
    }

    // Closing brace or bracket
    if (trimmed === "}," || trimmed === "}" || trimmed === "],") {
      const last = pathStack[pathStack.length - 1];
      if (typeof last === "number") arrayIndexStack.pop();
      pathStack.pop();
      return;
    }

    // Start of nested object
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

    // Start of array
    const arrayStartMatch = trimmed.match(/^"([^"]+)":\s*\[.*$/);
    if (arrayStartMatch) {
      const key = arrayStartMatch[1];
      pathStack.push(key);
      arrayIndexStack.push(0);
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

    // Inline comment
    let mainContent = line;
    let trailingComment: string | undefined;
    const inlineCommentIdx = line.indexOf("//");
    if (inlineCommentIdx !== -1) {
      mainContent = line.slice(0, inlineCommentIdx).trim();
      trailingComment = line.slice(inlineCommentIdx).trim();
    }

    // Array item
    if (arrayIndexStack.length > 0 && mainContent.startsWith('"')) {
      const index = arrayIndexStack[arrayIndexStack.length - 1];
      const currentPath = [...pathStack, index];
      parsed.push({
        lineNumber,
        rawLine: line,
        precedingComments: pendingComments,
        trailingComment,
        path: currentPath,
      });
      arrayIndexStack[arrayIndexStack.length - 1]++;
      pendingComments = [];
      return;
    }

    // Key-value pair
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

  console.log(parsed);
  return parsed;
}
