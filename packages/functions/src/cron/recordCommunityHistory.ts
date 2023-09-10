/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
import { ObjectId } from 'mongodb';
import { COMMUNITY_USER_ID } from 'src/helper/constants';
import { getContenderPoints } from 'src/helper/getContenderPoints';
import { shouldLogPredictionsAsTomorrow } from 'src/helper/shouldLogPredictionsAsTomorrow';
import { dateToYyyymmdd, getDate } from 'src/helper/utils';
import { dbWrapper } from 'src/helper/wrapper';
import { EventStatus } from 'src/types/enums';
import {
  type iCategoryPrediction,
  type EventModel,
  type PredictionSet,
  type iPredictions
} from 'src/types/models';

/**
 * Records community predictions every hour
 * logs one predictionset per event with userId = 'community'
 * Creates a new log on each unique day
 */

export const handler = dbWrapper(async ({ db }) => {
  const thirtyDaysAgo = getDate(30);
  const todayYyyymmdd = dateToYyyymmdd(getDate());
  const tomorrowYyyymmdd = dateToYyyymmdd(getDate(-1));

  // get list of events that are not archived, we'll query only those prediction sets
  console.log('getting events...');
  const activeEvents = await db
    .collection<EventModel>('events')
    .find({ status: { $ne: EventStatus.ARCHIVED } })
    .toArray();

  console.log('getting users...');
  const allUsers = await db
    .collection('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const allUserIds = allUsers.map((u) => u._id);

  // for each active event, take each user's most recent predictionset
  for (const { _id: eventId, nomDateTime, categories } of activeEvents) {
    const predictionSetRequests = allUserIds.map(
      async (userId) =>
        db
          .collection<PredictionSet>('predictionsets')
          .findOne({ userId, eventId }, { sort: { yyyymmdd: -1 } }) // returns largest (most recent) first
    );
    // execute all requests in parallel
    console.log('requesting user predictionsets...');
    const predictionSets = await Promise.all(predictionSetRequests);
    console.log('done requesting user predictionsets');

    // tally up the current community rankings
    const numPredicting: {
      [categoryName: string]: {
        [contenderId: string]: { [ranking: number]: number };
      };
    } = {};
    // also get contender info to link to contenderId... this is needed to display the community prediction
    const contenderInfo: {
      [contenderId: string]: {
        movieId: ObjectId;
        personId?: ObjectId;
        songId?: ObjectId;
      };
    } = {};
    console.log('1');
    for (const predictionSet of predictionSets) {
      if (!predictionSet) continue;
      for (const [categoryName, categoryPrediction] of Object.entries(
        predictionSet.categories
      )) {
        const { createdAt, predictions } = categoryPrediction;
        // don't record a prediction that's over 30 days old
        if (createdAt < thirtyDaysAgo) continue;
        for (const {
          movieId,
          personId,
          songId,
          contenderId: contenderObjectId,
          ranking
        } of predictions) {
          const contenderId = contenderObjectId.toString();
          if (!numPredicting[categoryName]) {
            numPredicting[categoryName] = {};
          }
          if (!numPredicting[categoryName][contenderId]) {
            // first time we encounter the contenderId, fill in this info
            contenderInfo[contenderId] = {
              movieId,
              personId,
              songId
            };
            numPredicting[categoryName][contenderId] = {};
          }
          if (!numPredicting[categoryName][contenderId][ranking]) {
            numPredicting[categoryName][contenderId][ranking] = 0;
          }
          numPredicting[categoryName][contenderId][ranking] += 1;
        }
      }
    }

    console.log('2');
    // tally up points for each contenderId. this is used to sort the contenders
    const pointsPerContenderId: { [contenderId: string]: number } = {};
    for (const categoryName of Object.keys(categories)) {
      for (const [contenderId, rankings] of Object.entries(
        numPredicting[categoryName]
      )) {
        pointsPerContenderId[contenderId] = getContenderPoints(rankings);
      }
    }
    console.log('3');
    const sortedContenderIds = Object.entries(pointsPerContenderId)
      .sort(([, a], [, b]) => {
        // this will sort so the largest number comes first in the list
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      })
      .map(([contenderId]) => contenderId);

    console.log('4');
    // format the "categories" field on PredictionSet
    const categoryPredictions: {
      [categoryName: string]: iCategoryPrediction;
    } = {};
    for (const [categoryName, { type, phase }] of Object.entries(categories)) {
      // we need numPredicting amount of predictions for each category
      const predictions: iPredictions = [];
      for (const [contenderId, rankings] of Object.entries(
        numPredicting[categoryName]
      )) {
        // get the actual list ranking
        const ranking = sortedContenderIds.indexOf(contenderId) + 1;
        predictions.push({
          ...contenderInfo[contenderId], // contains movieId, personId, songId
          contenderId: new ObjectId(contenderId),
          ranking,
          numPredicting: rankings
        });
      }
      categoryPredictions[categoryName] = {
        type,
        phase,
        createdAt: new Date(),
        predictions
      };
    }

    console.log('5');
    // if any shortlist is happening today, we need to know so we can write to tomorrow's predictions
    // see POST:predictionset for why
    const maybeShortlistDateTimeHappeningToday = Object.values(categories)
      .map((c) => c.shortlistDateTime)
      .find(
        (shortlistDateTime) =>
          shortlistDateTime && yyyymmdd === dateToYyyymmdd(shortlistDateTime)
      );

    console.log('6');
    // get the day we should log this predictionset as
    const yyyymmdd: number = shouldLogPredictionsAsTomorrow(
      nomDateTime,
      maybeShortlistDateTimeHappeningToday
    )
      ? tomorrowYyyymmdd
      : todayYyyymmdd;

    // get most recent
    console.log('getting most recent community prediction...');
    const mostRecentPredictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(
        { userId: COMMUNITY_USER_ID, eventId: new ObjectId(eventId) },
        { sort: { yyyymmdd: -1 } }
      );

    const isNewDate =
      mostRecentPredictionSet && yyyymmdd !== mostRecentPredictionSet.yyyymmdd;

    // create predictionset this is the first for the event, or the first on this date
    if (!mostRecentPredictionSet || isNewDate) {
      console.log('creating new predictionset for the day...');
      await db.collection<PredictionSet>('predictionsets').insertOne({
        userId: COMMUNITY_USER_ID,
        eventId: new ObjectId(eventId),
        yyyymmdd,
        // @ts-expect-error - This should only have partial data
        categories: categoryPredictions
      });
      // else if predictionset exists for event, update itwe
    } else {
      // update the current prediction set
      console.log(`updating today's spredictionset...`);
      await db.collection<PredictionSet>('predictionsets').updateOne(
        // @ts-expect-error - this particular ID is a string
        { _id: COMMUNITY_USER_ID },
        {
          $set: {
            categories: categoryPredictions
          }
        }
      );
    }
  }

  console.log('done!');
  return {
    statusCode: 200
  };
});
