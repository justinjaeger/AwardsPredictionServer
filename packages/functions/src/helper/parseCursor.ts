export const parseCursor = async <T>(cursor: any) => {
  const docs: T[] = [];
  for await (const doc of cursor) {
    docs.push(doc);
  }
  return docs;
};
