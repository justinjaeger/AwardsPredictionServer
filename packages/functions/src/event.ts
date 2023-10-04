import { type Filter } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { EventStatus, type EventModel, type AwardsBody } from './types/models';

// TODO: untested
export const list = dbWrapper<undefined, EventModel[]>(
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
      filter.status = { $ne: EventStatus.ARCHIVED };
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
