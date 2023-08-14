import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type RelationshipWithUser,
  type Relationship,
  type User
} from './types/models';
import { paginateCursor, getAggregatePagination } from './helper/utils';

/**
 * https://www.mongodb.com/docs/manual/tutorial/measure-index-use/
 *
 * To use "explain()" on aggregate, remove ?retryWrites=true&w=majority from MONGODB_URI
 * .explain('executionStats'); (to get info on indexes)
 *
 * If experimenting with index speed, can use this to toggle indexes on and off:
 * https://www.mongodb.com/docs/manual/tutorial/measure-index-use/
 */

export const get = dbWrapper<{}, Partial<User>>(
  async ({ db, params: { id, email, oauthId, excludeNestedFields } }) => {
    const projection = excludeNestedFields
      ? { eventsPredicting: 0, recentPredictionSets: 0 }
      : {};
    const filter = id
      ? { _id: new ObjectId(id) }
      : email
      ? { email }
      : oauthId
      ? { oauthId }
      : {};

    if (Object.keys(filter).length === 0) {
      return { statusCode: 400, error: 'BadRequest' };
    }

    const user = await db
      .collection<User>('users')
      .findOne(filter, { projection });
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
  }
);

// TODO: Be careful using this because it can be expensive. Don't debounce, just submit on blur or with a button
export const search = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db, params: { query, limit, pageNumber } }) => {
    if (!query) {
      return { statusCode: 400, error: 'BadRequest' };
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
  }
);

/**
 * If I want the recent predictions from who user is following,
 * I can include includeRecentPredictionSets.
 * Otherwise, I'll just basic information on who user is following.
 */
export const listFollowings = dbWrapper<{}, Array<Partial<User>>>(
  async ({
    db,
    params: { userId, limit, pageNumber, includeRecentPredictionSets }
  }) => {
    if (!userId) {
      return { statusCode: 400, error: 'BadRequest' };
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
        {
          $lookup: {
            from: 'users',
            localField: 'followedUserId',
            foreignField: '_id',
            as: 'followedUserList',
            pipeline: [
              {
                $project: includeRecentPredictionSets
                  ? { eventsPredicting: 0 }
                  : { username: 1, name: 1, image: 1 }
              }
            ]
          }
        }
      ])
      .map(({ followedUserList }) => followedUserList[0])
      .toArray();

    return {
      statusCode: 200,
      data: followedUsers
    };
  }
);

export const listFollowers = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db, params: { userId, limit, pageNumber } }) => {
    if (!userId) {
      return { statusCode: 400, error: 'BadRequest' };
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
