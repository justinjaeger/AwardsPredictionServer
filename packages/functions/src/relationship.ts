import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Relationship } from './types/models';

// used to see if you have a relationship with a user
export const get = dbWrapper<{}, Relationship | null>(
  async ({ db, params: { followingUserId, followedUserId } }) => {
    const relationship = await db
      .collection<Relationship>('relationships')
      .findOne({
        followingUserId: new ObjectId(followingUserId),
        followedUserId: new ObjectId(followedUserId)
      });
    return {
      statusCode: 200,
      data: relationship
    };
  }
);

export const post = dbWrapper<{ followedUserId: string }>(
  async ({
    db,
    payload: { followedUserId },
    authenticatedUserId: followingUserId
  }) => {
    return {
      statusCode: 200
    };
  }
);

export const remove = dbWrapper(async ({ db }) => {
  return {
    statusCode: 200
  };
});
