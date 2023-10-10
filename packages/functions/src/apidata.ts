import { type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type ApiData } from './types/models';
import { SERVER_ERROR } from './types/responses';

/**
 * Gets a batch of movie data,
 * which is updated behind the scenes from tmdb
 * Fake POST request so I can use the body
 */
export const get = dbWrapper<undefined, WithId<ApiData> | null>(
  async ({ db, params: { eventYear } }) => {
    if (!eventYear) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Must provide email'
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
