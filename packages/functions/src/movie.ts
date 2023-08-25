import { ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Movie } from './types/models';

/**
 * Gets a batch of movie data,
 * which is updated behind the scenes from tmdb
 * Fake POST request so I can use the body
 */
export const getBatch = dbWrapper<string[], Record<string, Movie>>(
  async ({ db, payload: ids }) => {
    const movieRequests: Array<Promise<WithId<Movie> | null>> = [];
    for (const id of ids) {
      movieRequests.push(
        db.collection<Movie>('movies').findOne({
          _id: new ObjectId(id)
        })
      );
    }
    const movieIdToData: Record<string, Movie> = {};
    const movies = await Promise.all(movieRequests);
    movies.forEach((movie) => {
      if (movie) {
        movieIdToData[movie._id.toString()] = movie;
      }
    });

    return {
      statusCode: 200,
      data: movieIdToData
    };
  }
);
