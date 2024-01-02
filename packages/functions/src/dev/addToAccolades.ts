import { MongoClient } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import {
  type ApiData,
  CategoryName,
  type Contender,
  Phase,
  type Movie,
  AwardsBody,
  type EventModel,
  type Accolade
} from 'src/types/models';

/**
 * You might have to run this a few times WITHOUT updating anything, just to make sure it matches the titles
 * Because punctuation in my db vs the academy's website is going to be different for some titles
 */

const PHASE: Phase = Phase.SHORTLIST;
const AWARDS_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;
const YEAR: number = 2024;

// TODO: THIS ONLY WORKS WITH NON-SONG AND NON-PERFORMANCE CATEGORIES
const CATEGORY_TO_TITLE = {
  [CategoryName.DOCUMENTARY]: [
    'American Symphony',
    'Apolonia, Apolonia',
    'Beyond Utopia',
    "Bobi Wine: The People's President",
    'Desperate Souls, Dark City and the Legend of Midnight Cowboy',
    'The Eternal Memory',
    'Four Daughters',
    'Going to Mars: The Nikki Giovanni Project',
    'In the Rearview',
    'Stamped from the Beginning',
    'Still: A Michael J. Fox Movie',
    'A Still Small Voice',
    '32 Sounds',
    'To Kill a Tiger',
    '20 Days in Mariupol'
  ],
  [CategoryName.INTERNATIONAL]: [
    'Amerikatsi',
    'The Monk and the Gun',
    'The Promised Land',
    'Fallen Leaves',
    'The Taste of Things',
    'The Teachers’ Lounge',
    'Godland',
    'The Captain',
    'Perfect Days',
    'Tótem',
    'The Mother of All Lies',
    'Society of the Snow',
    'Four Daughters',
    '20 Days in Mariupol',
    'The Zone of Interest'
  ],
  [CategoryName.MAKEUP]: [
    'Beau Is Afraid',
    'Ferrari',
    'Golda',
    'Killers of the Flower Moon',
    'The Last Voyage of the Demeter',
    'Maestro',
    'Napoleon',
    'Oppenheimer',
    'Poor Things',
    'Society of the Snow'
  ],
  [CategoryName.SCORE]: [
    'American Fiction',
    'American Symphony',
    'Barbie',
    'The Boy and the Heron',
    'The Color Purple',
    'Elemental',
    'The Holdovers',
    'Indiana Jones and the Dial of Destiny',
    'Killers of the Flower Moon',
    'Oppenheimer',
    'Poor Things',
    'Saltburn',
    'Society of the Snow',
    'Spider-Man: Across the Spider-Verse',
    'The Zone of Interest'
  ],
  [CategoryName.SOUND]: [
    'Barbie',
    'The Creator',
    'Ferrari',
    'The Killer',
    'Killers of the Flower Moon',
    'Maestro',
    'Mission: Impossible - Dead Reckoning Part One',
    'Napoleon',
    'Oppenheimer',
    'The Zone of Interest'
  ],
  [CategoryName.VISUAL_EFFECTS]: [
    'The Creator',
    'Godzilla Minus One',
    'Guardians of the Galaxy Vol. 3',
    'Indiana Jones and the Dial of Destiny',
    'Mission: Impossible - Dead Reckoning Part One',
    'Napoleon',
    'Poor Things',
    'Rebel Moon - Part One: A Child of Fire',
    'Society of the Snow',
    'Spider-Man: Across the Spider-Verse'
  ]
};

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const handler = async () => {
  console.log('1');
  const mongodb = client.db('db');
  console.log('2');

  try {
    // get the event id
    console.log('2.5');
    const event = await mongodb
      .collection<EventModel>('events')
      .findOne({ eventYear: YEAR, awardsBody: AWARDS_BODY });
    console.log('4');
    if (!event)
      throw new Error(
        `Could not find apidata for ${YEAR}+${AWARDS_BODY as string}`
      );

    // get all the apidata
    console.log('3');
    const allApiData = await mongodb
      .collection<ApiData>('apidata')
      .findOne({ eventYear: YEAR });
    console.log('4');
    if (!allApiData) throw new Error(`Could not find apidata for ${YEAR}`);

    // populate contenderIdToPhase object, while validating the CATEOGRY_TO_TITLE titles
    const contenderIdToPhase: { [contenderId: string]: Phase } = {};
    for (const [categoryName, titles] of Object.entries(CATEGORY_TO_TITLE)) {
      // find the title by searching apidata
      for (const title of titles) {
        const apiData = Object.values(allApiData).find((ad) => {
          if (ad) {
            if (typeof ad === 'object') {
              if ((ad as Movie).title?.toLowerCase() === title.toLowerCase()) {
                return true;
              }
            }
          }
          return false;
        });
        if (!apiData) throw new Error(`Could not find apiData for ${title}`);
        console.log('apiData', apiData);

        // NOTE: The first time you run this, you might want to comment out the BELOW, just to check that "titles" work
        const movieTmdbId = (apiData as Movie).tmdbId;
        console.log('5', categoryName);
        console.log('movieTmdbId', movieTmdbId);
        const contender = await mongodb
          .collection<Contender>('contenders')
          .findOne({
            eventId: event._id,
            movieTmdbId,
            category: categoryName as CategoryName
          });
        console.log('6');
        if (!contender)
          throw new Error(`Could not find contender for ${title}`);
        console.log('7');
        contenderIdToPhase[contender._id.toString()] = PHASE;
      }
    }

    // Update event accolades
    console.log('9');
    const res = await mongodb.collection<Accolade>('accolades').findOne({
      eventId: event._id
    });
    const currentAccolades = res?.accolades ?? {};
    const current = currentAccolades.accolades;
    const newAccolades = Object.assign(current, contenderIdToPhase);
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
