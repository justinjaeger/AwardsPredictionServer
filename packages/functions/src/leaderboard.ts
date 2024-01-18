import { MongoClient, ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { SERVER_ERROR } from './types/responses';
import { type LeaderboardRanking, type Phase, type User } from './types/models';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

const LEADERBOARD_PAGE_SIZE = 20;

type iLeaderboardRankingsWithUserData = LeaderboardRanking &
  Partial<WithId<User>>;

/**
 * Returns LeaderboardRankings and the users associated with them
 * Users are returned with only what's necessary to list them
 */
export const get = dbWrapper<
  undefined,
  {
    leaderboardRankingsWithUserData: iLeaderboardRankingsWithUserData[];
    hasNextPage: boolean;
  }
>(
  client,
  async ({
    db,
    params: {
      eventId,
      phase: phaseAsString,
      pageNum: pageNumAsString,
      noShorts: noShortsAsString,
      sortByField = 'rank', // can be rank, riskiness (as long as they are indexed!!)
      sortOrder = 'asc' // can be asc, desc
    }
  }) => {
    const noShorts = noShortsAsString === 'true';
    const pageNum = pageNumAsString ? parseInt(pageNumAsString) : undefined;
    const phase = phaseAsString as Phase;

    if (!eventId || !phase || !pageNum) {
      return SERVER_ERROR.BadRequest;
    }

    const leaderboardRankings = await db
      .collection<LeaderboardRanking>('leaderboardrankings')
      .find({
        eventId: new ObjectId(eventId),
        phase,
        noShorts,
        rank: {
          $lte: pageNum * LEADERBOARD_PAGE_SIZE,
          $gt: (pageNum - 1) * LEADERBOARD_PAGE_SIZE
        }
      })
      .sort({
        [sortByField]: sortOrder === 'desc' ? -1 : 1
      })
      .toArray();

    const hasNextPage = leaderboardRankings.length === LEADERBOARD_PAGE_SIZE;

    const userIds = leaderboardRankings.map(({ userId }) => userId);
    const users = await db
      .collection<User>('users')
      .find(
        { _id: { $in: userIds } },
        {
          projection: {
            _id: 1,
            username: 1,
            name: 1,
            image: 1
          }
        }
      )
      .toArray();

    const mergedData: iLeaderboardRankingsWithUserData[] =
      leaderboardRankings.map((ranking) => {
        const user = users.find(({ _id }) => _id.equals(ranking.userId));
        return {
          ...ranking,
          username: user?.username,
          name: user?.name,
          image: user?.image
        };
      });

    return {
      statusCode: 200,
      data: {
        leaderboardRankingsWithUserData: mergedData,
        hasNextPage
      }
    };
  }
);
