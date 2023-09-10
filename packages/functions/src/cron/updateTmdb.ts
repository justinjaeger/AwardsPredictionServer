import { type FindOptions, type Filter, type UpdateResult } from 'mongodb';
import Tmdb from 'src/helper/tmdb';
import { dbWrapper } from 'src/helper/wrapper';
import { type Person, type Movie } from 'src/types/models';

/**
 * Updates all movie and person info, which is derived from tmdb
 * Just do it for movies this year and later
 */
export const handler = dbWrapper(async ({ db }) => {
  const filter: Filter<Movie | Person> = {
    $or: [
      { year: { $gte: new Date().getFullYear() } },
      { year: { $e: null } } // movies with undefined year SHOULD be null when created - double check
    ]
  };
  const options: FindOptions<Movie | Person> = {
    projection: { _id: 1, tmdbId: 1 }
  };
  console.log('getting movies...');
  const movies = await db
    .collection<Movie>('movies')
    .find(filter, options)
    .toArray();
  console.log('getting persons...');
  const persons = await db
    .collection<Person>('persons')
    .find(filter, options)
    .toArray();

  console.log('getting tmdb movie data...');
  // get updated tmdb data (note: do not promise.all, it will break tmdb)
  const tmdbMovieRequests = movies.map((movie) =>
    Tmdb.getMovieAsDbType(movie.tmdbId)
  );
  const tmdbMovieResponses = await Promise.all(tmdbMovieRequests);
  const tmdbMovieData = tmdbMovieResponses.map((response) => response.data);

  console.log('getting tmdb person data...');
  const tmdbPersonRequests = persons.map((person) =>
    Tmdb.getPersonAsDbType(person.tmdbId)
  );
  const tmdbPersonResponses = await Promise.all(tmdbPersonRequests);
  const tmdbPersonData = tmdbPersonResponses.map((response) => response.data);

  // update db movies with the new tmdb data
  console.log('creating update movie requests...');
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
  console.log('creating update person requests...');
  const updatePersonRequests: Array<Promise<UpdateResult<Person>>> = [];
  for (let i = 0; i < persons.length; i++) {
    const person = persons[i];
    const newTmdbData = tmdbPersonData[i];
    if (newTmdbData) {
      updatePersonRequests.push(
        db.collection<Person>('persons').updateOne(
          {
            _id: person._id
          },
          {
            $set: newTmdbData
          }
        )
      );
    }
  }

  console.log('executing update movie requests...');
  await Promise.all(updateMovieRequests);
  console.log('executing update person requests...');
  await Promise.all(updatePersonRequests);

  console.log('done!');
  return {
    statusCode: 200
  };
});
