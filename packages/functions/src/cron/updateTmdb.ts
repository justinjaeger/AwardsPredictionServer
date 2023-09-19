import {
  type FindOptions,
  type Filter,
  type UpdateResult,
  type DeleteResult
} from 'mongodb';
import Tmdb from 'src/helper/tmdb';
import { dbWrapper } from 'src/helper/wrapper';
import {
  type Person,
  type Movie,
  type Contender,
  type PredictionSet
} from 'src/types/models';

/**
 * Updates all movie and person info, which is derived from tmdb
 * Just do it for movies this year and later
 */
export const handler = dbWrapper(async ({ db, client }) => {
  const filter: Filter<Movie | Person> = {
    $or: [
      { year: { $gte: new Date().getFullYear() } },
      { year: { $exists: false } } // movies with undefined year SHOULD be null when created - double check
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
  const tmdbMovieData: Array<Movie | null> = [];
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    try {
      const res = await Tmdb.getMovieAsDbType(movie.tmdbId, i);
      if (res.data) {
        tmdbMovieData.push(res.data);
      } else {
        // MUST push a null value because we rely on index positioning
        tmdbMovieData.push(null);
        throw new Error();
      }
    } catch (err) {
      // If movie isn't found in tmdb, delete it and related data from db
      console.log('deleting movie...', movie);
      // get contenders associated with movie
      console.log('getting associated contenders...');
      const contenders = await db
        .collection<Contender>('contenders')
        .find({ movieId: movie._id })
        .toArray();
      // delete predictionsets associated with contenders
      const predictionSetRequests: Array<Promise<DeleteResult>> = [];
      for (const contender of contenders) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const subfield = `categories.${contender.category}.predictions.contenderId`;
        const predictionSetRequest = db
          .collection<PredictionSet>('predictionsets')
          .deleteMany({
            [subfield]: contender._id
          });
        predictionSetRequests.push(predictionSetRequest);
      }
      // delete contenders
      const deleteContenderRequest = db
        .collection<Contender>('contenders')
        .deleteMany({ movieId: movie._id });
      // delete movie
      const deleteMovieRequest = db
        .collection<Movie>('movies')
        .deleteOne({ _id: movie._id });

      const session = client.startSession();
      try {
        session.startTransaction();
        console.log('executing transaction...');
        const res = await Promise.allSettled([
          predictionSetRequests,
          deleteContenderRequest,
          deleteMovieRequest
        ]);
        if (res.some(({ status }) => status === 'rejected')) {
          throw new Error();
        }
        await session.commitTransaction();
      } catch (err) {
        console.log('transaction failed!!!', err);
        await session.abortTransaction();
      } finally {
        await session.endSession();
      }
    }
  }

  console.log('getting tmdb person data...');
  const tmdbPersonData = [];
  for (let i = 0; i < persons.length; i++) {
    const person = persons[i];
    const { data } = await Tmdb.getPersonAsDbType(person.tmdbId);
    if (data) {
      tmdbPersonData.push(data);
    }
  }

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
