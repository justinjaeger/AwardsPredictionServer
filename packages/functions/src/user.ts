import { type Document, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type RelationshipWithUser,
  type Relationship,
  type User
} from './types/models';
import connectToDatabase from './helper/connect';

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

// const DEFAULT_SEARCH_LIMIT = 10;
// TODO: Be careful using this because it can be expensive. Don't debounce, just submit on blur or with a button
// IF mongoDB doesn't fix this, we can just try to direct-match the query and use an index. Somehow.
// export const search = dbWrapper<{}, Array<Partial<User>>>(
//   async ({ db, params }) => {
//     const { query, limit: _limit, pageNumber } = params;
//     const limit: number = _limit || DEFAULT_SEARCH_LIMIT;
//     if (!query) {
//       return { statusCode: 400, error: 'BadRequest' };
//     }
//     // https://www.mongodb.com/docs/manual/core/link-text-indexes/
//     const searchRes = db.collection<User[]>('users').find({
//       $text: { $search: 'hi' }
//     });
//     if (limit && pageNumber) {
//       searchRes.skip((pageNumber - 1) * limit);
//     }
//     if (limit) {
//       searchRes.limit(limit);
//     }
//     const userList = await searchRes.toArray();
//     return {
//       statusCode: 200,
//       data: userList
//     };
//   }
// );

export const search = async () => {
  const db = await connectToDatabase();
  const cursor = db.collection('test').find({
    $text: { $search: 'apple' }
  });

  const data = await cursor.toArray();
  return {
    statusCode: 200,
    data
  };
};

const DEFAULT_LIST_LIMIT = 15;
export const listFollowings = dbWrapper<{}, Array<Partial<User>>>(
  async ({ db, params }) => {
    const {
      userId,
      limit: _limit,
      pageNumber,
      includeRecentPredictionSets
    } = params;
    const limit = _limit || DEFAULT_LIST_LIMIT;
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
    if (limit && pageNumber) {
      aggregate.push({ $skip: (pageNumber - 1) * limit });
    }
    if (limit) {
      aggregate.push({ $limit: limit });
    }
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
