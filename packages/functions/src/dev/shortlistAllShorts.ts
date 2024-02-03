import { MongoClient } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import {
  type Contender,
  CategoryName,
  Phase,
  type Accolade,
  AwardsBody
} from 'src/types/models';

/**
 * The way I added shortlisted films was to un-hide them on the dev frontend,
 * then add them myself IN THE APP: ONLY the shortlisted films
 * then make isHidden false on the shortlist category
 * then run this script to mark each with a shortlisted accolade
 */
const client = new MongoClient(mongoClientUrl, mongoClientOptions);

const YEAR: number = 2024;
const AWARDS_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;

export const handler = async () => {
  const mongodb = client.db('db');

  try {
    const event = await mongodb
      .collection<Event>('events')
      .findOne({ year: YEAR, awardsBody: AWARDS_BODY });

    if (!event)
      throw new Error(
        `Could not find apidata for ${YEAR}+${AWARDS_BODY as string}`
      );

    // get all shortlisted contenders
    const contenders = await mongodb
      .collection<Contender>('contenders')
      .find({
        category: {
          $in: [
            CategoryName.SHORT_DOCUMENTARY,
            CategoryName.SHORT_LIVE_ACTION,
            CategoryName.SHORT_ANIMATED
          ]
        }
      })
      .toArray();

    const contenderIdToPhase: { [contenderId: string]: Phase } = {};
    for (const contender of contenders) {
      contenderIdToPhase[contender._id.toString()] = Phase.SHORTLIST;
    }

    const res = await mongodb.collection<Accolade>('accolades').findOne({
      eventId: event._id
    });
    const currentAccolades = res?.accolades ?? {};
    // error: cannot convert undefined or null to object
    const newAccolades = Object.assign(currentAccolades, contenderIdToPhase);

    // update all shortlisted contenders
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
