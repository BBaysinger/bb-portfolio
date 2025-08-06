import fs from "fs";

export interface CommentedLine {
  lineNumber: number;
  rawLine: string;
  keyOrValue: string;
  precedingComments: string[];
  trailingComment?: string;
}

export type ParsedJson5 = CommentedLine[];

/**
 * Parses a JSON5 file line by line, extracting key/value lines with associated comments.
 */
export function parseJson5File(filePath: string): ParsedJson5 {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  // console.info(lines);
  const parsed: ParsedJson5 = [];

  let insideBlockComment = false;
  let pendingComments: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (!trimmed) return; // skip empty lines

    // Check for start/end of block comment
    if (trimmed.startsWith("/*")) {
      insideBlockComment = true;
    }
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

    // Inline comment detection
    let mainContent = line;
    let trailingComment: string | undefined;
    const inlineCommentIdx = line.indexOf("//");
    if (inlineCommentIdx !== -1) {
      mainContent = line.slice(0, inlineCommentIdx).trimEnd();
      trailingComment = line.slice(inlineCommentIdx).trim();
    }

    parsed.push({
      lineNumber,
      rawLine: line,
      keyOrValue: mainContent,
      precedingComments: pendingComments,
      trailingComment,
    });

    pendingComments = []; // reset after attaching to line
  });
  // console.info(parsed);

  return parsed;
}
