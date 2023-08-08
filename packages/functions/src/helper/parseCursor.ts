export const parseCursor = async <T>(cursor) => {
  const docs: T[] = [];
  for await (const doc of cursor) {
    docs.push(doc);
  }
  return docs;
};

export const parseOneFromCursor = async <T>(cursor) => {
  const docs: T[] = await parseCursor(cursor);
  return docs[0];
};
