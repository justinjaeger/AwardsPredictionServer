import { MongoClient, ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Accolade } from './types/models';
import { SERVER_ERROR } from './types/responses';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Gets accolade data for an event
 */
export const get = dbWrapper<undefined, WithId<Accolade> | null>(
  client,
  async ({ db, params: { eventId } }) => {
    if (!eventId) {
      return SERVER_ERROR.BadRequest;
    }

    const accolades = await db
      .collection<Accolade>('accolades')
      .findOne({ eventId: new ObjectId(eventId) });

    return {
      statusCode: 200,
      data: accolades
    };
  }
);
