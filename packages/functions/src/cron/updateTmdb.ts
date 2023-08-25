import { type UpdateResult } from 'mongodb';
import Tmdb from 'src/helper/tmdb';
import { dbWrapper } from 'src/helper/wrapper';
import { type Movie } from 'src/types/models';

export const handler = dbWrapper(async ({ db }) => {
  // Get all movies where the year is either null or gte to the current year
  const movies = await db
    .collection<Movie>('movies')
    .find(
      {
        $or: [
          { year: { $gte: new Date().getFullYear() } },
          { year: { $e: null } } // movies with undefined year SHOULD be null when created - double check
        ]
      },
      { projection: { _id: 1, tmdbId: 1 } }
    )
    .toArray();

  // get updated tmdb data (note: do not promise.all, it will break tmdb)
  const tmdbMovieData = movies.map(async (movie) => {
    const res = await Tmdb.getMovieAsDbType(movie.tmdbId);
    return res.data;
  });

  // update db movies with the new tmdb data
  const updateMovieRequests: Array<Promise<UpdateResult<Movie>>> = [];
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const newTmdbData = tmdbMovieData[i];
    if (newTmdbData) {
      updateMovieRequests.push(
        db.collection<Movie>('movies').updateOne(
          {
            _id: movie._id
          },
          {
            $set: newTmdbData
          }
        )
      );
    }
  }
  await Promise.all(updateMovieRequests);

  return {
    statusCode: 200
  };
});
