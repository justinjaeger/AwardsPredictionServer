import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type User } from './types/models';

export const get = dbWrapper<{}, Partial<User>>(async ({ db, params }) => {
  const { id, excludeNestedFields } = params;
  if (!id) {
    return { statusCode: 400, error: 'BadRequest' };
  }
  const projection = excludeNestedFields
    ? { eventsPredicting: 0, recentPredictionSets: 0 }
    : {};
  const users = db.collection<User>('users');
  const user = await users.findOne({ _id: new ObjectId(id) }, { projection });
  if (!user) {
    return {
      statusCode: 400,
      error: 'NotFound',
      message: 'User not found'
    };
  }
  return {
    statusCode: 200,
    data: user
  };
});

export const list = dbWrapper<{}, Array<Partial<User>>>(async ({ db }) => {
  return {
    statusCode: 200,
    data: []
  };
});

export const listFollowings = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db }) => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

export const listFollowers = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db }) => {
    return {
      statusCode: 200,
      data: []
    };
  }
);

export const post = dbWrapper<{}, {}>(async ({ db }) => {
  return {
    statusCode: 200
  };
});

export const put = dbWrapper<{}, {}>(async ({ db }) => {
  return {
    statusCode: 200
  };
});
