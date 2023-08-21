import { type Filter } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type AwardsBody } from './types/enums';

// TODO: untested
export const list = dbWrapper<
  { maxYear?: number; minYear?: number; awardsBody?: AwardsBody },
  Event[]
>(async ({ db, params }) => {
  const { maxYear, minYear, awardsBody } = params;
  const filter: Filter<Event> = {};
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
  const events = await db.collection<Event>('events').find(filter).toArray();
  return {
    statusCode: 200,
    events
  };
});
