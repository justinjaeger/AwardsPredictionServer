import { dbWrapper } from './helper/wrapper';

// returns Event[]
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

export const put = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});
