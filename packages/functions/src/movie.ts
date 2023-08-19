import { dbWrapper } from './helper/wrapper';
import { type Movie } from './types/models';

/**
 * Movies are created by users (no permissions, except we cannot tolerate duplicates)
 * But they're updated by either ADMIN or cron job
 */
export const post = dbWrapper<Movie, string>(async ({ db, payload }) => {
  const movie = await db.collection<Movie>('movies').insertOne(payload);
  return {
    statusCode: 200,
    data: movie.insertedId.toString()
  };
});
