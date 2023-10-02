import { ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type RelationshipWithUser,
  type Relationship,
  type User,
  type Token,
  UserRole
} from './types/models';
import { paginateCursor, getAggregatePagination } from './helper/utils';
import { SERVER_ERROR } from './types/responses';

/**
 * https://www.mongodb.com/docs/manual/tutorial/measure-index-use/
 *
 * To use "explain()" on aggregate, remove ?retryWrites=true&w=majority from MONGODB_URI
 * .explain('executionStats'); (to get info on indexes)
 *
 * If experimenting with index speed, can use this to toggle indexes on and off:
 * https://www.mongodb.com/docs/manual/tutorial/measure-index-use/
 */

export const get = dbWrapper<
  {
    email?: string;
    oauthId?: string;
    excludeNestedFields?: boolean;
  },
  Partial<User>
>(async ({ db, params: { userId, email, oauthId, excludeNestedFields } }) => {
  const projection = excludeNestedFields
    ? { eventsPredicting: 0, recentPredictionSets: 0 }
    : {};

  const filter = userId
    ? { _id: new ObjectId(userId) }
    : email
    ? { email }
    : oauthId
    ? { oauthId }
    : {};

  if (Object.keys(filter).length === 0) {
    return SERVER_ERROR.BadRequest;
  }

  const user = await db
    .collection<User>('users')
    .findOne(filter, { projection });

  if (!user) {
    return {
      ...SERVER_ERROR.NotFound,
      message: 'User not found'
    };
  }
  return {
    statusCode: 200,
    data: user
  };
});

// TODO: Be careful using this because it can be expensive. Don't debounce, just submit on blur or with a button
export const search = dbWrapper<
  { query: string; limit?: number; pageNumber?: number },
  Array<Partial<User>>
>(async ({ db, payload: { query, limit, pageNumber } }) => {
  if (!query) {
    return SERVER_ERROR.BadRequest;
  }

  const searchCursor = db.collection<User>('users').find({
    $text: { $search: 'bro' }
  });
  paginateCursor(searchCursor, pageNumber, limit);
  const userList = await searchCursor.toArray();

  return {
    statusCode: 200,
    data: userList
  };
});

/**
 * If I want the recent predictions from who user is following,
 * I can include includeRecentPredictionSets.
 * Otherwise, I'll just basic information on who user is following.
 */
export const listFollowings = dbWrapper<undefined, Array<Partial<User>>>(
  async ({
    db,
    params: {
      userId,
      limit: limitAsString,
      pageNumber: pageNumberAsString,
      includeNestedFields: includeNestedFieldsAsString
    }
  }) => {
    const limit = limitAsString ? parseInt(limitAsString) : undefined;
    const pageNumber = pageNumberAsString
      ? parseInt(pageNumberAsString)
      : undefined;
    const includeNestedFields = includeNestedFieldsAsString === 'true';

    if (!userId) {
      return SERVER_ERROR.BadRequest;
    }

    const lookup: any = {
      from: 'users',
      localField: 'followedUserId',
      foreignField: '_id',
      as: 'followedUserList'
    };
    if (!includeNestedFields) {
      lookup.pipeline = [
        {
          $project: { username: 1, name: 1, image: 1 }
        }
      ];
    }

    const followedUsers = await db
      .collection<Relationship>('relationships')
      .aggregate<RelationshipWithUser>([
        {
          $match: {
            followingUserId: new ObjectId(userId)
          }
        },
        {
          $project: { _id: 0, followedUserId: 1 }
        },
        ...getAggregatePagination(pageNumber, limit),
        { $lookup: lookup }
      ])
      .map(({ followedUserList }) => followedUserList[0])
      .toArray();

    return {
      statusCode: 200,
      data: followedUsers
    };
  }
);

export const listFollowers = dbWrapper<undefined, Array<Partial<User>>>(
  async ({
    db,
    params: { userId, limit: limitAsString, pageNumber: pageNumberAsString }
  }) => {
    const limit = limitAsString ? parseInt(limitAsString) : undefined;
    const pageNumber = pageNumberAsString
      ? parseInt(pageNumberAsString)
      : undefined;

    if (!userId) {
      return SERVER_ERROR.BadRequest;
    }

    const followedUsers = await db
      .collection<Relationship>('relationships')
      .aggregate<RelationshipWithUser>([
        {
          $match: {
            followedUserId: new ObjectId(userId)
          }
        },
        ...getAggregatePagination(pageNumber, limit),
        {
          $project: { _id: 0, followingUserId: 1 }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'followingUserId',
            foreignField: '_id',
            as: 'followingUserList',
            pipeline: [
              {
                $project: { username: 1, name: 1, image: 1 }
              }
            ]
          }
        }
      ])
      .map(({ followingUserList }) => followingUserList[0])
      .toArray();

    return {
      statusCode: 200,
      data: followedUsers
    };
  }
);

// UNTESTED: should use an index
export const listMostFollowed = dbWrapper<undefined, Array<Partial<User>>>(
  async ({
    db,
    params: { limit: limitAsString, pageNumber: pageNumberAsString }
  }) => {
    const limit = limitAsString ? parseInt(limitAsString) : undefined;
    const pageNumber = pageNumberAsString
      ? parseInt(pageNumberAsString)
      : undefined;

    const searchCursor = db
      .collection<User>('users')
      .find({})
      .sort({ followerCount: -1 }); // should be supported by an index!!
    paginateCursor(searchCursor, pageNumber, limit);
    const userList = await searchCursor.toArray();

    return {
      statusCode: 200,
      data: userList
    };
  }
);

export const post = dbWrapper<
  { email: string; name?: string; username?: string },
  WithId<User> // returns the user id
>(async ({ db, payload }) => {
  const res = await db.collection<User>('users').insertOne(payload);
  const userId = res.insertedId.toString();
  const user = await db
    .collection<User>('users')
    .findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return SERVER_ERROR.Error;
  }
  return {
    statusCode: 200,
    data: user
  };
});

export const put = dbWrapper<Partial<User>, {}>(
  async ({ db, authenticatedUserId, payload }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    if (
      payload.email ??
      payload.oauthId ??
      payload.followerCount ??
      payload.followingCount ??
      payload.eventsPredicting ??
      payload.role
    ) {
      return {
        ...SERVER_ERROR.Forbidden,
        message: 'One or more fields are not directly editable'
      };
    }

    await db.collection<User>('users').updateOne(
      {
        _id: new ObjectId(authenticatedUserId)
      },
      { $set: payload }
    );

    return {
      statusCode: 200
    };
  }
);

export const remove = dbWrapper<Partial<User>, {}>(
  async ({ db, authenticatedUserId, params, client }) => {
    const { userId } = params;
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    if (!userId) {
      return SERVER_ERROR.BadRequest;
    }

    const removeUserRelationshipsRequest = db
      .collection<Relationship>('relationships')
      .deleteMany({
        $or: [
          { followingUserId: new ObjectId(userId) },
          { followedUserId: new ObjectId(userId) }
        ]
      });

    const removeUserTokensRequest = db.collection<Token>('tokens').deleteMany({
      userId: new ObjectId(userId)
    });

    const removeUserDataRequest = db.collection<User>('users').updateOne(
      {
        _id: new ObjectId(authenticatedUserId)
      },
      {
        $set: {
          followerCount: 0,
          followingCount: 0,
          eventsPredicting: [],
          recentPredictionSets: [],
          role: UserRole.USER
        }
      }
    );

    const session = client.startSession();
    try {
      session.startTransaction();
      const res = await Promise.allSettled([
        removeUserRelationshipsRequest,
        removeUserTokensRequest,
        removeUserDataRequest
      ]);
      if (res.some(({ status }) => status === 'rejected')) {
        throw new Error();
      }
      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
      return {
        ...SERVER_ERROR.Error,
        message: `Error deleting user`
      };
    } finally {
      await session.endSession();
    }

    return {
      statusCode: 200
    };
  }
);
