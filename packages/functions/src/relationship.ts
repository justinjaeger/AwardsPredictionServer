import { dbWrapper } from './helper/wrapper';

// returns Relationship (could be used to see if you have a relationship with a user)
export const get = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

export const post = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

export const remove = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});
