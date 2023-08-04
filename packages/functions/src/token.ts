import { dbWrapper } from './helper/wrapper';

// returns Token[]
export const get = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

// returns Token[]
export const list = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

export const post = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});
