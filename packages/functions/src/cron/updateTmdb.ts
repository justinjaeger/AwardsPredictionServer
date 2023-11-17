import { MongoClient, type DeleteResult, type WithId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import Tmdb from 'src/helper/tmdb';
import { dbWrapper } from 'src/helper/wrapper';
import {
  type Contender,
  type PredictionSet,
  type ApiData,
  CategoryType
} from 'src/types/models';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Updates all movie and person info, which is derived from tmdb
 * Just do it for movies this year and later
 */
export const handler = dbWrapper(client, async ({ db, client }) => {
  // filter so only current and upcoming event years are updated
  const minYear = new Date().getFullYear() + 1; // means once the calendar year changes, info stops updating, which should be fine since movies are all released
  const allData = await db
    .collection<WithId<ApiData>>('apidata')
    .find({
      // get all apiData (later we'll filter by just this year)
      $or: [
        { eventYear: { $gte: minYear } },
        { eventYear: { $exists: false } } // movies with undefined year SHOULD be null when created - double check
      ]
    })
    .toArray();

  for (const yearData of allData) {
    const { eventYear } = yearData;
    const movieIds: string[] = [];
    const personIds: string[] = [];
    Object.entries(yearData).forEach(([key, value]) => {
      if (key === 'year' || key === '_id') return;
      // @ts-expect-error, we eliminated other possibilities in line above
      const type = value?.type;
      if (type === CategoryType.FILM) {
        movieIds.push(key);
      } else if (type === CategoryType.PERFORMANCE) {
        personIds.push(key);
      }
    });

    console.log('movieIds', movieIds.length);
    console.log('personIds', personIds.length);

    console.log('getting tmdb movie data...');
    const newData: ApiData = { eventYear };
    // get updated tmdb data (note: do not promise.all, it will break tmdb)
    // const tmdbMovieData: Array<Movie | null> = [];
    for (let i = 0; i < movieIds.length; i++) {
      const movieTmdbId = parseInt(movieIds[i]);
      try {
        const res = await Tmdb.getMovieAsDbType(movieTmdbId, i);
        if (res.data) {
          newData[movieTmdbId.toString()] = {
            ...res.data,
            type: CategoryType.FILM
          };
        } else {
          throw new Error();
        }
      } catch {
        // If movie isn't found in tmdb, delete it and related data from db
        console.log('movie not found. deleting...', movieTmdbId);
        // get contenders associated with movie
        console.log('getting associated contenders...');
        const contenders = await db
          .collection<Contender>('contenders')
          .find({ movieTmdbId })
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
          .deleteMany({ movieTmdbId });
        // delete movie from apidata
        const deleteMovieRequest = db
          .collection<ApiData>('apidata')
          .findOneAndUpdate({ eventYear }, { $unset: { [movieTmdbId]: '' } });

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
    for (let i = 0; i < personIds.length; i++) {
      const tmdbId = parseInt(personIds[i]);
      const { data } = await Tmdb.getPersonAsDbType(tmdbId);
      if (data) {
        newData[tmdbId.toString()] = {
          ...data,
          type: CategoryType.PERFORMANCE
        };
      }
    }

    await db
      .collection<ApiData>('apidata')
      .findOneAndUpdate({ eventYear }, { $set: newData }, { upsert: true });
  }

  console.log('done!');
  return {
    statusCode: 200
  };
});
