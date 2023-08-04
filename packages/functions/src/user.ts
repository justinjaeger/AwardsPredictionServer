import { dbWrapper } from './helper/wrapper';
import { type User } from './types/models';
import { type ApiResponse } from './types/responses';

// returns User
export const get = dbWrapper(
  async ({ db }): Promise<ApiResponse<Partial<User>>> => {
    return {
      statusCode: 200,
      data: {}
    };
  }
);

// returns User[]
export const list = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

// returns User[]
export const listFollowings = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

// returns User[]
export const listFollowers = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});

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
