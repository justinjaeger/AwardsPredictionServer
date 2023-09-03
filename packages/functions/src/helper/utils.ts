import { type Document, type FindCursor } from 'mongodb';
import { DEFAULT_PAGINATE_LIMIT } from './constants';

export const paginateCursor = (
  cursor: FindCursor<any>,
  pageNumber: number = 1,
  limit: number = DEFAULT_PAGINATE_LIMIT
) => {
  cursor.skip((pageNumber - 1) * limit);
  cursor.limit(limit);
};

export const getAggregatePagination = (
  pageNumber: number = 1,
  limit: number = DEFAULT_PAGINATE_LIMIT
): Document[] => [{ $skip: (pageNumber - 1) * limit }, { $limit: limit }];

export const dateToYyyymmdd = (date: Date) => {
  return parseInt(
    `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
  );
};

export const getDate = (daysFromToday?: number) => {
  const d = new Date();
  if (daysFromToday) {
    d.setDate(d.getDate() + daysFromToday);
  }
  return d;
};
