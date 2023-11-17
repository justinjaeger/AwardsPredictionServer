import { MongoClient, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type ApiData } from './types/models';
import { SERVER_ERROR } from './types/responses';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Gets a batch of movie data,
 * which is updated behind the scenes from tmdb
 * Fake POST request so I can use the body
 */
export const get = dbWrapper<undefined, WithId<ApiData> | null>(
  client,
  async ({ db, params: { eventYear } }) => {
    if (!eventYear) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Must provide event year'
      };
    }
    const year = parseInt(eventYear);
    const apidata = await db
      .collection<ApiData>('apidata')
      .findOne({ eventYear: year });

    return {
      statusCode: 200,
      data: apidata
    };
  }
);
