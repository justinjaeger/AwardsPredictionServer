import { ObjectId } from 'mongodb';
import Tmdb from './helper/tmdb';
import { dbWrapper } from './helper/wrapper';
import {
  type CategoryName,
  CategoryType,
  type Contender,
  type Movie
} from './types/models';
import { CATEGORY_NAME_TO_TYPE } from './helper/constants';
import { SERVER_ERROR } from './types/responses';

/**
 * Creates movie/person/song if not exists, then creates contender
 */
// TODO: untested on people and songs (movie works)
export const post = dbWrapper<{
  eventId: string;
  movieTmdbId: number;
  categoryName: CategoryName;
  personTmdbId?: number;
  songTitle?: string;
}>(
  async ({
    db,
    payload: { eventId, movieTmdbId, categoryName, personTmdbId, songTitle }
  }) => {
    const categoryType = CATEGORY_NAME_TO_TYPE[categoryName];
    if (categoryType === CategoryType.PERFORMANCE && !personTmdbId) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Must provide personTmdbId when creating performance'
      };
    }
    if (categoryType === CategoryType.SONG && !songTitle) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Must provide song title when creating song'
      };
    }

    // get or create movie from tmdb
    let movieId: ObjectId | undefined;
    const movie = await db
      .collection<Movie>('movies')
      .findOne({ tmdbId: movieTmdbId }, { projection: { _id: 1 } });
    movieId = movie?._id;
    if (!movieId) {
      const tmdbMovieRes = await Tmdb.getMovieAsDbType(movieTmdbId);
      const tmdbMovie = tmdbMovieRes.data;
      if (!tmdbMovie) {
        return tmdbMovieRes;
      }
      const dbMovie = await db.collection<Movie>('movies').insertOne(tmdbMovie);
      movieId = dbMovie.insertedId;
    }

    // get person from tmdb (if it's a performance)
    let personId: ObjectId | undefined;
    if (categoryType === CategoryType.PERFORMANCE && personTmdbId) {
      const person = await db
        .collection('persons')
        .findOne({ tmdbId: personTmdbId });
      personId = person?._id;
      if (!personId) {
        const tmdbPersonRes = await Tmdb.getPersonAsDbType(personTmdbId);
        const tmdbPerson = tmdbPersonRes.data;
        if (!tmdbPerson) {
          return tmdbPersonRes;
        }
        const dbPerson = await db.collection('persons').insertOne(tmdbPerson);
        personId = dbPerson.insertedId;
      }
    }

    // get or create song (if it's a song)
    let songId: ObjectId | undefined;
    if (categoryType === CategoryType.SONG && songTitle) {
      // check if song exists in db
      const song = await db
        .collection('songs')
        .findOne({ movieId, title: songTitle });
      songId = song?._id;
      if (!songId) {
        const dbSong = await db
          .collection('songs')
          .insertOne({ movieId, title: songTitle });
        songId = dbSong.insertedId;
      }
    }

    // at this point, the movie, person, and/or songs are created, and we can just attach them to the contender
    const newContender: Contender = {
      eventId: new ObjectId(eventId),
      movieId,
      category: categoryName
    };
    if (categoryType === CategoryType.PERFORMANCE && personId) {
      newContender.personId = personId;
    }
    if (categoryType === CategoryType.SONG && songId) {
      newContender.songId = songId;
    }
    const contender = await db
      .collection<Contender>('contenders')
      .insertOne(newContender);
    return {
      statusCode: 200,
      contenderId: contender.insertedId.toString()
    };
  }
);
