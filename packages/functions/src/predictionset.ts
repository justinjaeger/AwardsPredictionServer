import { dbWrapper } from './helper/wrapper';

// returns Predictionset
export const get = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

export const post = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});
