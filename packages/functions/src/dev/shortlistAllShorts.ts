import { MongoClient } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import {
  type ApiData,
  type Contender,
  CategoryName,
  Phase
} from 'src/types/models';

/**
 * The way I added shortlisted films was to un-hide them on the dev frontend, then add them myself,
 * then make isHidden false
 * then run this script to mark each of them with the proper accolade
 */
const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const handler = async () => {
  console.log('0');
  const mongodb = client.db('db');
  console.log('00');

  // first, get all the apidata
  try {
    console.log('3');
    const allApiData = await mongodb
      .collection<ApiData>('apidata')
      .findOne({ eventYear: 2024 });
    console.log('4');
    if (!allApiData) throw new Error(`Could not find apidata for 2024`);

    // get all shortlisted contenders
    const contender = await mongodb
      .collection<Contender>('contenders')
      .updateMany(
        {
          category: {
            $in: [
              CategoryName.SHORT_DOCUMENTARY,
              CategoryName.SHORT_LIVE_ACTION,
              CategoryName.SHORT_ANIMATED
            ]
          }
        },
        {
          $set: {
            accolade: Phase.SHORTLIST
          }
        }
      );
    console.log('result:', contender);
    console.log('done!');
  } catch (e) {
    console.error(e);
  }
};
