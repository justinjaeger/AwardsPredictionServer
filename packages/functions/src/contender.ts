import { dbWrapper } from './helper/wrapper';

export const post = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

export const put = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});
