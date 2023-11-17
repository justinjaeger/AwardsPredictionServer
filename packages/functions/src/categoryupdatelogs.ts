import { MongoClient, ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { CategoryName, type CategoryUpdateLog } from './types/models';
import { SERVER_ERROR } from './types/responses';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Used for getting a all dates that you updated your predictions in a given event or category
 * TODO: not tested
 */
export const get = dbWrapper<{}, Record<number, boolean>>(
  client,
  async ({ db, params: { userId, eventId, category } }) => {
    if (!userId || !eventId) {
      return SERVER_ERROR.BadRequest;
    }
    const res = await db
      .collection<CategoryUpdateLog>('categoryupdatelogs')
      .findOne(
        {
          userId: new ObjectId(userId),
          eventId: new ObjectId(eventId),
          // if category is not specified, we should be logging without it anyway, so field can be omitted
          category: category
            ? CategoryName[category as CategoryName]
            : { $exists: false }
        },
        { projection: { yyyymmddUpdates: 1 } }
      );
    const { yyyymmddUpdates } = res ?? {};

    return {
      statusCode: 200,
      data: yyyymmddUpdates ?? {}
    };
  }
);
