import { MongoClient, type WithId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import {
  type CategoryName,
  type EventModel,
  type Accolade,
  AwardsBody,
  type User,
  type PredictionSet,
  Phase
} from 'src/types/models';
import _ from 'lodash';
import { shouldLogPredictionsAsTomorrow } from 'src/helper/shouldLogPredictionsAsTomorrow';
import { dateToYyyymmdd, getDate } from 'src/helper/utils';
import { stripId } from 'src/helper/stripId';

/**
 * Removes unaccoladed contenders from user prediction sets
 * For ex: after noms happen, removes all contenders that didn't get a nom
 *
 * Creates new prediction sets for each user with the unaccoladed contenders removed
 */

// CHANGE THESE ONLY:
const EVENT_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;
const EVENT_YEAR: number = 2024;

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const handler = async () => {
  const mongodb = client.db('db');

  try {
    console.log('finding event...');
    const event = await mongodb
      .collection<EventModel>('events')
      .findOne({ awardsBody: EVENT_BODY, year: EVENT_YEAR });
    if (!event)
      throw new Error(
        `Could not find event for ${EVENT_YEAR}+${EVENT_BODY as string}`
      );

    const today = new Date();
    const { shortlistDateTime, nomDateTime, winDateTime } = event;
    const shortlistHasHappened = shortlistDateTime && shortlistDateTime < today;
    const nominationsHaveHappened = nomDateTime && nomDateTime < today;
    const winnersHaveHappened = winDateTime && winDateTime < today;
    if (winnersHaveHappened) {
      console.log('winners have happened, not doing it.');
      return;
    }

    // get today and tomorrow's yyyymmdd
    const todayYyyymmdd = dateToYyyymmdd(getDate());
    const tomorrowYyyymmdd = dateToYyyymmdd(getDate(1));

    // determine whether we need to write to today or tomorrow to preserve final predictions
    // predictions post-nom/shortlist on the day of transition will count towards the next day
    const yyyymmdd: number = shouldLogPredictionsAsTomorrow(event)
      ? tomorrowYyyymmdd
      : todayYyyymmdd;

    console.log('getting accolades...');
    const accolade = await mongodb
      .collection<Accolade>('accolades')
      .findOne({ eventId: event._id });
    if (!accolade) {
      console.log('no accolades found for this event');
      return;
    }

    // get all users
    console.log('getting users...');
    const users = await mongodb
      .collection<WithId<User>>('users')
      .find({}, { projection: { _id: 1 } }) // my user id, if filtering: 65572aa845f201f572f8bfbc
      .toArray();

    // ONLY COMMENT IN IF RUNNING ON SELF
    // if (users.length !== 1) {
    //   console.log('not just me');
    //   return;
    // }

    // loop through all users, get their most recent prediction set
    const getPredictionSetReqs = [];
    for (const user of users) {
      getPredictionSetReqs.push(
        mongodb
          .collection<PredictionSet>('predictionsets')
          .findOne(
            { userId: user._id, eventId: event._id },
            { sort: { yyyymmdd: -1 } }
          )
      );
    }
    console.log('getting predictionsets...');
    const predictionSets = await Promise.all(getPredictionSetReqs);

    const insertPredictionSetReqs = [];
    for (const mostRecentPredictionSet of predictionSets) {
      // user might not have a prediction set for this event, so skip
      if (!mostRecentPredictionSet) continue;

      // make a copy of the predictions and remove non accoladed contenders
      const newPredictionSet = _.cloneDeep(mostRecentPredictionSet);
      for (const [category, categoryPredictions] of Object.entries(
        newPredictionSet.categories
      )) {
        // remove unaccoladed contenders
        const filteredPredictions = categoryPredictions.predictions.filter(
          (prediction) => {
            const contenderId = prediction.contenderId.toString();
            const categoryIsShortlisted =
              event.categories[category as CategoryName].isShortlisted;

            if (nominationsHaveHappened) {
              return accolade.accolades[contenderId] === Phase.NOMINATION;
            } else if (shortlistHasHappened && categoryIsShortlisted) {
              return accolade.accolades[contenderId] === Phase.SHORTLIST;
            }
            return true;
          }
        );
        const predictionsWithProperRankings = filteredPredictions.map(
          (prediction, i) => ({
            ...prediction,
            ranking: (i as number) + 1
          })
        );
        newPredictionSet.categories[category as CategoryName].predictions =
          predictionsWithProperRankings;
      }

      const requiresNewEntry = yyyymmdd !== mostRecentPredictionSet.yyyymmdd;
      if (requiresNewEntry) {
        const pset: PredictionSet = {
          ...stripId(newPredictionSet),
          yyyymmdd
        };
        // create a copy of the most recent predictionset, but with a new yyyymmdd, and update the category
        insertPredictionSetReqs.push(
          mongodb.collection<PredictionSet>('predictionsets').insertOne(pset)
        );
      } else {
        // update the current prediction set
        insertPredictionSetReqs.push(
          mongodb.collection<PredictionSet>('predictionsets').updateOne(
            { _id: mostRecentPredictionSet._id },
            {
              $set: {
                categories: newPredictionSet.categories
              }
            }
          )
        );
      }
    }
    console.log('inserting predictionsets...');
    await Promise.all(insertPredictionSetReqs);

    console.log('done!');
  } catch (e) {
    console.error(e);
  }
};
