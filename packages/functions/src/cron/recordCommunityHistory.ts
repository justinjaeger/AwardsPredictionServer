import { wrapper } from "src/helper/wrapper";

export const handler = wrapper(async (event, context) => {
  return {
    statusCode: 200,
  };
});
