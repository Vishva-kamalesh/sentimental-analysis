let sharedAnalyzedText = "";

export const setSharedAnalyzedText = (text: string) => {
  sharedAnalyzedText = text;
};

export const getSharedAnalyzedText = () => {
  return sharedAnalyzedText;
};
