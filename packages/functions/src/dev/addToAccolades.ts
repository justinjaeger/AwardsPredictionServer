import { MongoClient } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import * as ACCOLADE_DATA from 'src/helper/accoladeData';
import {
  type ApiData,
  type CategoryName,
  type Contender,
  type Phase,
  type Movie,
  type EventModel,
  type Accolade,
  CategoryType,
  type Person
} from 'src/types/models';
import { type iAccoladeData } from 'src/helper/accoladeData';

/**
 * You might have to run this a few times WITHOUT updating anything, just to make sure it matches the titles
 * Because punctuation in my db vs the academy's website is going to be different for some titles
 */

// CHANGE THIS ONLY
const DATA: iAccoladeData = ACCOLADE_DATA.AMPAS_2024_WINS;

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const handler = async () => {
  const { awardsBody, year, phase, data } = DATA;
  console.log('1');
  const mongodb = client.db('db');
  console.log('2');

  try {
    // get the event id
    console.log('2.5');
    const event = await mongodb
      .collection<EventModel>('events')
      .findOne({ awardsBody, year });
    console.log('4');
    if (!event)
      throw new Error(
        `Could not find event for ${year as number}+${awardsBody as string}`
      );

    // get all the apidata
    console.log('3');
    const allApiData = await mongodb
      .collection<ApiData>('apidata')
      .findOne({ eventYear: year });
    console.log('4');
    if (!allApiData)
      throw new Error(`Could not find apidata for ${year as number}`);

    const getMovieTmdbId = (title: string) => {
      const movieApiData = Object.entries(allApiData).find(([key, ad]) => {
        if (ad) {
          if (typeof ad === 'object') {
            if ((ad as Movie).title?.toLowerCase() === title.toLowerCase()) {
              return true;
            }
          }
        }
        return false;
      }) as [string, Movie];
      if (!movieApiData)
        throw new Error(`Could not find movieApiData for ${title}`);
      const movieTmdbId = parseInt(movieApiData[0]);
      return movieTmdbId;
    };

    const getPersonTmdbId = (name: string) => {
      const personApiData = Object.entries(allApiData).find(([key, ad]) => {
        if (ad) {
          if (typeof ad === 'object') {
            if ((ad as Person).name?.toLowerCase() === name.toLowerCase()) {
              return true;
            }
          }
        }
        return false;
      });
      if (!personApiData)
        throw new Error(`Could not find personApiData for ${name}`);
      const personTmdbId = parseInt(personApiData[0]);
      return personTmdbId;
    };

    // populate contenderIdToPhase object, while validating the CATEOGRY_TO_TITLE titles
    const contenderIdToPhase: { [contenderId: string]: Phase } = {};

    for (const [categoryName, titles] of Object.entries(data)) {
      const { type } = event.categories[categoryName as CategoryName];
      if (type === CategoryType.SONG) {
        for (const contenderSongId of titles) {
          const contender = await mongodb
            .collection<Contender>('contenders')
            .findOne({
              eventId: event._id,
              category: categoryName as CategoryName,
              songId: contenderSongId
            });
          if (!contender)
            throw new Error(
              `Could not find song contender for ${contenderSongId as string}`
            );
          contenderIdToPhase[contender._id.toString()] = phase;
        }
      } else if (type === CategoryType.PERFORMANCE) {
        for (const actorNameAsteriskTitle of titles) {
          const [actorName, title] = actorNameAsteriskTitle.split('*');
          const movieTmdbId = getMovieTmdbId(title);
          const personTmdbId = getPersonTmdbId(actorName);
          const contender = await mongodb
            .collection<Contender>('contenders')
            .findOne({
              eventId: event._id,
              category: categoryName as CategoryName,
              movieTmdbId,
              personTmdbId
            });
          if (!contender)
            throw new Error(
              `Could not find performance contender for ${
                actorNameAsteriskTitle as string
              }`
            );
          contenderIdToPhase[contender._id.toString()] = phase;
        }
      } else {
        for (const title of titles) {
          // NOTE: The first time you run this, you might want to comment out the BELOW, just to check that "titles" work
          const movieTmdbId = getMovieTmdbId(title);
          const contender = await mongodb
            .collection<Contender>('contenders')
            .findOne({
              eventId: event._id,
              category: categoryName as CategoryName,
              movieTmdbId
            });
          if (!contender)
            throw new Error(`Could not find contender for ${title as string}`);
          contenderIdToPhase[contender._id.toString()] = phase;
        }
      }
    }

    // Update event accolades
    console.log('9');
    const res = await mongodb.collection<Accolade>('accolades').findOne({
      eventId: event._id
    });
    const currentAccolades = res?.accolades ?? {};
    const newAccolades = Object.assign(currentAccolades, contenderIdToPhase);
    await mongodb
      .collection<Accolade>('accolades')
      .updateOne(
        { eventId: event._id },
        { $set: { accolades: newAccolades } },
        { upsert: true }
      );
    console.log('done!');
  } catch (e) {
    console.error(e);
  }
};
