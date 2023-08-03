import { dbWrapper } from './helper/wrapper';

// returns User
export const get = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

// returns User[]
export const list = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

// returns User[]
export const listFollowings = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
  };
});

  // returns User[]
export const listFollowers = dbWrapper(async ({ db }) => {
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
