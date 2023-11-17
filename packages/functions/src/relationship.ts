import { MongoClient, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Relationship } from './types/models';
import { SERVER_ERROR } from './types/responses';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

// used to see if you have a relationship with a user
export const get = dbWrapper<{}, Relationship | null>(
  client,
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
>(
  client,
  async ({ db, client, payload: { followedUserId }, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
    }

    const createRelationshipRequest = db
      .collection<Relationship>('relationships')
      .insertOne({
        followedUserId: new ObjectId(followedUserId),
        followingUserId: new ObjectId(authenticatedUserId)
      });

    const incrementFollowingCountRequest = db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(authenticatedUserId) },
        { $inc: { followingCount: 1 } }
      );

    const incrementFollowerCountRequest = db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(followedUserId) },
        { $inc: { followerCount: 1 } }
      );

    const session = client.startSession();
    let relationshipId;
    try {
      session.startTransaction();
      const res = await Promise.all([
        createRelationshipRequest,
        incrementFollowingCountRequest,
        incrementFollowerCountRequest
      ]);
      relationshipId = res[0].insertedId.toString();
      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
      return {
        ...SERVER_ERROR.Error,
        message: `Error creating relationship`
      };
    } finally {
      await session.endSession();
    }

    return {
      statusCode: 200,
      data: relationshipId
    };
  }
);

export const remove = dbWrapper<{ followedUserId: string }, {}>(
  client,
  async ({ db, client, params: { followedUserId }, authenticatedUserId }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
    }

    const deleteRelationshipRequest = db
      .collection<Relationship>('relationships')
      .deleteOne({
        followedUserId: new ObjectId(followedUserId),
        followingUserId: new ObjectId(authenticatedUserId)
      });

    const decrementFollowingCountRequest = db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(authenticatedUserId) },
        { $inc: { followingCount: -1 } }
      );

    const decrementFollowerCountRequest = db
      .collection('users')
      .updateOne(
        { _id: new ObjectId(followedUserId) },
        { $inc: { followerCount: -1 } }
      );

    const session = client.startSession();
    try {
      session.startTransaction();
      await Promise.all([
        deleteRelationshipRequest,
        decrementFollowingCountRequest,
        decrementFollowerCountRequest
      ]);
      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
      return {
        ...SERVER_ERROR.Error,
        message: `Error removing relationship`
      };
    } finally {
      await session.endSession();
    }

    return {
      statusCode: 200
    };
  }
);
