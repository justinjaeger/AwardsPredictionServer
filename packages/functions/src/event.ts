import { type Filter } from 'mongodb';
import { dbWrapper } from './helper/wrapper';

// TODO: untested
export const list = dbWrapper<undefined, Event[]>(async ({ db, params }) => {
  const { awardsBody } = params;
  const maxYear = params.maxYear ? parseInt(params.maxYear) : undefined;
  const minYear = params.minYear ? parseInt(params.minYear) : undefined;
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
