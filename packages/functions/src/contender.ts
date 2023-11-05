import { ObjectId, type UpdateFilter, type WithId } from 'mongodb';
import Tmdb from './helper/tmdb';
import { dbWrapper } from './helper/wrapper';
import {
  type CategoryName,
  CategoryType,
  type Contender,
  type Song,
  type ApiData
} from './types/models';
import { CATEGORY_NAME_TO_TYPE } from './helper/constants';
import { SERVER_ERROR } from './types/responses';
import { getSongKey } from './helper/getSongKey';

/**
 * Creates movie/person/song if not exists, then creates contender
 * If contender DOES already exist, just return it
 */
export const post = dbWrapper<
  {
    eventId: string;
    eventYear: number;
    movieTmdbId: number;
    categoryName: CategoryName;
    personTmdbId?: number;
    songTitle?: string;
    songArtist?: string;
  },
  WithId<Contender> | null
>(
  async ({
    db,
    payload: {
      eventId,
      eventYear,
      movieTmdbId,
      categoryName,
      personTmdbId,
      songTitle,
      songArtist
    },
    authenticatedUserId
  }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }

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

    const movieKey = movieTmdbId.toString();
    const personKey = personTmdbId?.toString();
    const songKey = songTitle ? getSongKey(movieTmdbId, songTitle) : undefined;

    const projection = { [movieKey]: 1 };
    if (personKey) {
      projection[personKey] = 1;
    }
    if (songKey) {
      projection[songKey] = 1;
    }

    const apiDataWholeYearEntry = await db
      .collection<ApiData>('apidata')
      .findOne({ eventYear }, { projection });

    // INSERT API DATA
    const maybeExistingMovie = apiDataWholeYearEntry?.[movieKey];
    const maybeExistingPerson = personKey
      ? apiDataWholeYearEntry?.[personKey]
      : undefined;
    const maybeExistingSong = songKey
      ? apiDataWholeYearEntry?.[songKey]
      : undefined;

    const apiDataRequest = async (update: UpdateFilter<ApiData>) => {
      await db
        .collection<ApiData>('apidata')
        .findOneAndUpdate({ eventYear }, { $set: update }, { upsert: true });
    };

    if (!maybeExistingMovie) {
      const { data } = await Tmdb.getMovieAsDbType(movieTmdbId);
      if (!data) {
        return {
          ...SERVER_ERROR.BadRequest,
          message: `Tmdb could not provide data for movie`
        };
      }
      await apiDataRequest({
        [movieKey]: { ...data, type: CategoryType.FILM }
      });
    }
    if (!maybeExistingPerson && personKey && personTmdbId) {
      const { data } = await Tmdb.getPersonAsDbType(personTmdbId);
      if (!data) {
        return {
          ...SERVER_ERROR.BadRequest,
          message: `Tmdb could not provide data for person`
        };
      }
      await apiDataRequest({
        [personKey]: { ...data, type: CategoryType.PERFORMANCE }
      });
    }
    if (!maybeExistingSong && songKey && songTitle) {
      const data: Song = {
        movieTmdbId,
        title: songTitle,
        artist: songArtist ?? ''
      };
      await apiDataRequest({
        [songKey]: { ...data, type: CategoryType.SONG }
      });
    }

    // at this point, the movie, person, and/or songs are created, and we can just attach them to the contender
    const newContender: Contender = {
      eventId: new ObjectId(eventId),
      movieTmdbId,
      category: categoryName
    };
    if (categoryType === CategoryType.PERFORMANCE && personTmdbId) {
      newContender.personTmdbId = personTmdbId;
    }
    if (categoryType === CategoryType.SONG && songTitle) {
      newContender.songId = getSongKey(movieTmdbId, songTitle);
    }

    let contender: WithId<Contender> | null;
    try {
      const res = await db
        .collection<Contender>('contenders')
        .insertOne(newContender);
      const contenderId = res.insertedId.toString();
      contender = await db.collection<Contender>('contenders').findOne({
        _id: new ObjectId(contenderId)
      });
    } catch (e) {
      contender = await db.collection<Contender>('contenders').findOne({
        eventId: new ObjectId(eventId),
        movieTmdbId,
        category: categoryName
      });
    }

    return {
      statusCode: 200,
      data: contender
    };
  }
);
