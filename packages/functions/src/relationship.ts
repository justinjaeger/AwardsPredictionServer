import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Relationship } from './types/models';
import { SERVER_ERROR } from './types/responses';

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

export const post = dbWrapper<
  { followedUserId: string },
  string // sends back the new relationship id
>(async ({ db, payload: { followedUserId }, authenticatedUserId }) => {
  if (!authenticatedUserId) {
    return SERVER_ERROR.Unauthenticated;
  }

  const relationship = await db
    .collection<Relationship>('relationships')
    .insertOne({
      followedUserId: new ObjectId(followedUserId),
      followingUserId: new ObjectId(authenticatedUserId)
    });

  return {
    statusCode: 200,
    data: relationship.insertedId.toString()
  };
});

export const remove = dbWrapper<{ followedUserId: string }, {}>(
  async ({ db, payload: { followedUserId }, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
    }

    await db.collection<Relationship>('relationships').deleteOne({
      followedUserId: new ObjectId(followedUserId),
      followingUserId: new ObjectId(authenticatedUserId)
    });

    return {
      statusCode: 200
    };
  }
);
