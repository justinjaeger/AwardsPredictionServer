import { MongoClient } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { SERVER_ERROR } from './types/responses';
import { type User } from './types/models';
import { paginateCursor } from './helper/utils';

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
    const pageNum = parseInt(pageNumAsString ?? '1');

    if (!eventId || !phase || !pageNum) {
      return SERVER_ERROR.BadRequest;
    }

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
