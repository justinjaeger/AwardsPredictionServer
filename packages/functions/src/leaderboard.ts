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

/**
 * This is going to be a GET LEADERBOARD function
 * It will take in an event ID and a phase, and noShorts
 * It's a paginated query, so it will take in a page number
 */
export const get = dbWrapper<undefined, Array<Partial<User>>>(
  client,
  async ({
    db,
    params: {
      eventId,
      phase,
      pageNum: pageNumAsString,
      noShorts: noShortsAsString,
      sortByField = 'rank', // can be rank, riskiness
      sortOrder = 'asc' // can be asc, desc
    }
  }) => {
    // get the event ID, phase, and noShorts from the query params
    const noShorts = noShortsAsString === 'true';

    if (!eventId || !phase || !pageNumAsString) {
      return SERVER_ERROR.BadRequest;
    }

    const pageNum = parseInt(pageNumAsString);

    // I could also just do rank > 25, rank <= 50, for page two for example
    // but this should be just as good. The logic would be, skip the first 25, then take the next 25
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
      .sort({ [sortByField]: sortOrder === 'desc' ? -1 : 1 }); // should be supported by an index!!
    paginateCursor(searchCursor, pageNum, LEADERBOARD_PAGE_SIZE);
    const userList = await searchCursor.toArray();

    return {
      statusCode: 200,
      data: userList
    };
  }
);

const FOLLOWING_LEADERBOARD_RESULTS_COUNT = 10;

/**
 * If I want the recent predictions from who user is following,
 * I can include includeRecentPredictionSets.
 * Otherwise, I'll just basic information on who user is following.
 */
export const listLeaderboardsFromFollowings = dbWrapper<
  undefined,
  Array<Partial<User>>
>(
  client,
  async ({
    db,
    authenticatedUserId,
    params: {
      eventId,
      phase,
      noShorts: noShortsAsString,
      pageNumber: pageNumberAsString
    }
  }) => {
    if (!eventId || !phase || !pageNumberAsString) {
      return SERVER_ERROR.BadRequest;
    }

    const noShorts = noShortsAsString === 'true';
    const pageNum = pageNumberAsString
      ? parseInt(pageNumberAsString)
      : undefined;

    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthenticated;
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
        }
      }
    ];

    const followedUsers = await db
      .collection<Relationship>('relationships')
      .aggregate<RelationshipWithUser>([
        {
          $match: {
            followingUserId: new ObjectId(authenticatedUserId)
          }
        },
        {
          $project: { _id: 0, followedUserId: 1 }
        },
        ...getAggregatePagination(pageNum, FOLLOWING_LEADERBOARD_RESULTS_COUNT),
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
