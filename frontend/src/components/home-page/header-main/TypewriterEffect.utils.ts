const shuffleArray = (array: number[]) => {
  return array.sort(() => Math.random() - 0.5);
};

export const buildParagraphQueue = (paragraphCount: number) => {
  const indices = Array.from({ length: paragraphCount }, (_, index) => index);

  if (indices.length <= 1) return indices;

  const [firstIndex, ...remainingIndices] = indices;
  return [firstIndex, ...shuffleArray(remainingIndices)];
};