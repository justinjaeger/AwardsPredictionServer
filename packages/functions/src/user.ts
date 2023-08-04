import { dbWrapper } from './helper/wrapper';
import { type User } from './types/models';
import { type ApiResponse } from './types/responses';

export const get = dbWrapper(
  async ({ db }): Promise<ApiResponse<Partial<User>>> => {
    return {
      statusCode: 200,
      data: {}
    };
  }
);

export const list = dbWrapper(
  async ({ db }): Promise<ApiResponse<Partial<User[]>>> => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

export const listFollowings = dbWrapper(
  async ({ db }): Promise<ApiResponse<Partial<User[]>>> => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

export const listFollowers = dbWrapper(
  async ({ db }): Promise<ApiResponse<Partial<User[]>>> => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

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
