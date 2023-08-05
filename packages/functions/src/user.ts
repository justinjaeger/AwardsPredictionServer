import { dbWrapper } from './helper/wrapper';
import { type User } from './types/models';

export const get = dbWrapper<Partial<User>>(async ({ db }) => {
  return {
    statusCode: 200,
    data: {}
  };
});

export const list = dbWrapper<Array<Partial<User>>>(async ({ db }) => {
  return {
    statusCode: 200,
    data: []
  };
});

export const listFollowings = dbWrapper<Array<Partial<User>>>(
  async ({ db }) => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

export const listFollowers = dbWrapper<Array<Partial<User>>>(async ({ db }) => {
  return {
    statusCode: 200,
    data: []
  };
});

export const post = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
    data: null
  };
});

export const put = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200,
    data: null
  };
});
