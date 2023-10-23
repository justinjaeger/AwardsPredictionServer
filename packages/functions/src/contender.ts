import { ObjectId, type WithId } from 'mongodb';
import Tmdb from './helper/tmdb';
import { dbWrapper } from './helper/wrapper';
import {
  type CategoryName,
  CategoryType,
  type Contender,
  type Movie,
  type Person,
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

    const key =
      categoryType === CategoryType.FILM
        ? movieTmdbId
        : categoryType === CategoryType.PERFORMANCE
        ? personTmdbId
        : categoryType === CategoryType.SONG && songTitle
        ? getSongKey(movieTmdbId, songTitle)
        : undefined;
    if (key === undefined) {
      return SERVER_ERROR.BadRequest;
    }

    const apiDataField = await db
      .collection<ApiData>('apidata')
      .findOne({ eventYear }, { projection: { [key]: 1 } });

    // if doesn't exist in apiData, must create it
    if (!apiDataField) {
      let newApiData: Movie | Person | Song | undefined;
      if (categoryType === CategoryType.FILM) {
        const { data } = await Tmdb.getMovieAsDbType(movieTmdbId);
        newApiData = data;
      } else if (categoryType === CategoryType.PERFORMANCE && personTmdbId) {
        const { data } = await Tmdb.getPersonAsDbType(personTmdbId);
        newApiData = data;
      } else if (categoryType === CategoryType.SONG && songTitle) {
        const data: Song = {
          movieTmdbId,
          title: songTitle,
          artist: songArtist ?? ''
        };
        newApiData = data;
      }
      if (!newApiData) {
        return {
          ...SERVER_ERROR.BadRequest,
          message: `Tmdb could not provide data for ${
            categoryType === CategoryType.FILM ? 'movie' : 'person'
          }`
        };
      }

      await db.collection<ApiData>('apidata').insertOne({
        eventYear,
        [key]: {
          type: categoryType,
          ...newApiData
        }
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
