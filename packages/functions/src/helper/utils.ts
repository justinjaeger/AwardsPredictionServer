import { type Document, type FindCursor } from 'mongodb';
import { DEFAULT_PAGINATE_LIMIT } from './constants';

export const paginateCursor = (
  cursor: FindCursor<any>,
  pageNumber: number = 0,
  limit: number = DEFAULT_PAGINATE_LIMIT
) => {
  cursor.skip((pageNumber - 1) * limit);
  cursor.limit(limit);
};

export const paginateAggregate = (
  aggregate: Document[],
  pageNumber: number = 0,
  limit: number = DEFAULT_PAGINATE_LIMIT
) => {
  aggregate.push({ $skip: (pageNumber - 1) * limit });
  aggregate.push({ $limit: limit });
  return aggregate;
};
