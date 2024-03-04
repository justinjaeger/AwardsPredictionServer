import { MongoClient, type Filter } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type EventModel, type AwardsBody } from './types/models';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const list = dbWrapper<undefined, EventModel[]>(
  client,
  async ({ db, params }) => {
    const {
      maxYear: maxYearAsString,
      minYear: minYearAsString,
      awardsBody: awardsBodyAsString,
      isOpen: isOpenAsString
    } = params;
    const maxYear = maxYearAsString ? parseInt(maxYearAsString) : undefined;
    const minYear = minYearAsString ? parseInt(minYearAsString) : undefined;
    const awardsBody = awardsBodyAsString
      ? (awardsBodyAsString as AwardsBody)
      : undefined;
    const isOpen = isOpenAsString ? isOpenAsString === 'true' : undefined;

    const filter: Filter<EventModel> = {};
    if (maxYear ?? minYear) {
      filter.year = {};
      if (maxYear) {
        filter.year.$lte = maxYear;
      }
      if (minYear) {
        filter.year.$gte = minYear;
      }
    }
    if (awardsBody) {
      filter.awardsBody = awardsBody;
    }
    if (isOpen) {
      filter.$or = [
        { winDateTime: { $gte: new Date() } },
        { winDateTime: { $exists: false } }
      ];
    }
    const events = await db
      .collection<EventModel>('events')
      .find(filter)
      .toArray();
    return {
      statusCode: 200,
      data: events
    };
  }
);
