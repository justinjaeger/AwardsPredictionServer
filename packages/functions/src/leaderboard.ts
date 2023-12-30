import { MongoClient, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { SERVER_ERROR } from './types/responses';
import {
  type Relationship,
  type RelationshipWithUser,
  type User
} from './types/models';
import { getAggregatePagination, paginateCursor } from './helper/utils';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

const LEADERBOARD_PAGE_SIZE = 25;

export const get = dbWrapper<
  undefined,
  { users: Array<Partial<User>>; hasNextPage: boolean }
>(
  client,
  async ({
    db,
    params: {
      eventId,
      phase,
      pageNum: pageNumAsString,
      noShorts: noShortsAsString,
      sortByField = 'rank', // can be rank, riskiness (as long as they are indexed!!)
      sortOrder = 'asc' // can be asc, desc
    }
  }) => {
    const noShorts = noShortsAsString === 'true';
    const pageNum = pageNumAsString ? parseInt(pageNumAsString) : undefined;

    if (!eventId || !phase || !pageNum) {
      return SERVER_ERROR.BadRequest;
    }

    const searchCursor = db
      .collection<User>('users')
      .find(
        {
          leaderboardRankings: {
            $elemMatch: {
              eventId,
              phase,
              noShorts
            }
          }
        },
        {
          projection: {
            _id: 1,
            username: 1,
            name: 1,
            image: 1,
            leaderboardRankings: {
              $elemMatch: {
                eventId,
                phase,
                noShorts
              }
            }
          }
        }
      )
      .sort({
        [`leaderboardRankings.${sortByField}`]: sortOrder === 'desc' ? -1 : 1
      }); // TODO: should be supported by an index!! double check
    paginateCursor(searchCursor, pageNum, LEADERBOARD_PAGE_SIZE);
    const userList = await searchCursor.toArray();

    return {
      statusCode: 200,
      data: {
        users: userList,
        hasNextPage: userList.length === LEADERBOARD_PAGE_SIZE
      }
    };
  }
);

const FOLLOWING_LEADERBOARD_RESULTS_COUNT = 10;

export const leaderboardFromFollowing = dbWrapper<
  undefined,
  { users: Array<Partial<User>>; hasNextPage: boolean }
>(
  client,
  async ({
    db,
    params: {
      userId,
      eventId,
      phase,
      noShorts: noShortsAsString,
      pageNumber: pageNumberAsString,
      sortByField = 'rank', // can be rank, riskiness (as long as they are indexed!!)
      sortOrder = 'asc' // can be asc, desc
    }
  }) => {
    const noShorts = noShortsAsString === 'true';
    const pageNum = pageNumberAsString
      ? parseInt(pageNumberAsString)
      : undefined;

    if (!userId || !eventId || !phase || !pageNum) {
      return SERVER_ERROR.BadRequest;
    }

    const lookup: any = {
      from: 'users',
      localField: 'followedUserId',
      foreignField: '_id',
      as: 'followedUserList'
    };
    lookup.pipeline = [
      {
        $project: {
          username: 1,
          name: 1,
          image: 1,
          leaderboardRankings: {
            $elemMatch: {
              eventId,
              phase,
              noShorts
            }
          }
        },
        // TODO: Not sure if this will work but, it's my best guess
        ...getAggregatePagination(pageNum, FOLLOWING_LEADERBOARD_RESULTS_COUNT),
        $sort: {
          [`leaderboardRankings.${sortByField}`]: sortOrder === 'desc' ? -1 : 1
        }
      }
    ];

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
        { $lookup: lookup }
      ])
      .map(({ followedUserList }) => followedUserList[0])
      .toArray();

    return {
      statusCode: 200,
      data: {
        users: followedUsers,
        hasNextPage:
          followedUsers.length === FOLLOWING_LEADERBOARD_RESULTS_COUNT
      }
    };
  }
);
