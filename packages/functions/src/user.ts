import { type Document, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type RelationshipWithUser,
  type Relationship,
  type User
} from './types/models';
import { paginateCursor, paginateAggregate } from './helper/utils';

export const get = dbWrapper<{}, Partial<User>>(async ({ db, params }) => {
  const { id, email, oauthId, excludeNestedFields } = params;
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
  const users = db.collection<User>('users');
  const user = await users.findOne(filter, { projection });
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

// TODO: Be careful using this because it can be expensive. Don't debounce, just submit on blur or with a button
export const search = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db, params }) => {
    const { query, limit, pageNumber } = params;
    if (!query) {
      return { statusCode: 400, error: 'BadRequest' };
    }
    // https://www.mongodb.com/docs/manual/core/link-text-indexes/
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

export const listFollowings = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db, params }) => {
    const { userId, limit, pageNumber, includeRecentPredictionSets } = params;
    if (!userId) {
      return { statusCode: 400, error: 'BadRequest' };
    }
    const relationships = db.collection<Relationship>('relationships');
    const aggregate: Document[] = [
      {
        $match: {
          followingUserId: new ObjectId(userId)
        }
      }
    ];
    paginateAggregate(aggregate, pageNumber, limit);
    aggregate.push({
      $project: { _id: 0, followedUserId: 1 }
    });
    aggregate.push({
      $lookup: {
        from: 'users',
        localField: 'followedUserId',
        foreignField: '_id',
        as: 'followedUserList',
        pipeline: includeRecentPredictionSets
          ? [
              {
                $project: { eventsPredicting: 0 }
              }
            ]
          : [
              {
                $project: { eventsPredicting: 0, recentPredictionSets: 0 }
              }
            ]
      }
    });
    const followedUsers = await relationships
      .aggregate<RelationshipWithUser>(aggregate)
      .map(({ followedUserList }) => followedUserList[0])
      .toArray();

    return {
      statusCode: 200,
      data: followedUsers
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
