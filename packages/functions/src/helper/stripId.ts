export const stripId = (object: any) => ({
  ...object,
  _id: undefined
});
