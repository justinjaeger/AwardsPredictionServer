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

export const handler = dbWrapper(async ({ db }) => {
  // Calculate numPredicting by querying user predictionsets with yyyymmdd that is <30 days ago
  const thirtyDaysAgo = getDate(30);
  const todayYyyymmdd = dateToYyyymmdd(getDate());
  const tomorrowYyyymmdd = dateToYyyymmdd(getDate(-1));

  // get list of events that are not archived, we'll query only those prediction sets
  const activeEvents = await db
    .collection<EventModel>('events')
    .find({ status: { $ne: EventStatus.ARCHIVED } })
    .toArray();

  const allUsers = await db
    .collection('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const allUserIds = allUsers.map((u) => u._id);

  for (const { _id: eventId, nomDateTime, categories } of activeEvents) {
    // take each user's most recent predictionset for this event
    const predictionSetRequests = [];
    for (const userId of allUserIds) {
      const predictionSetRequest = db
        .collection<PredictionSet>('predictionsets')
        .findOne({ userId, eventId }, { sort: { yyyymmdd: -1 } });
      predictionSetRequests.push(predictionSetRequest);
    }
    // execute all requests in parallel
    const predictionSets = await Promise.all(predictionSetRequests);

    // tally up the current community rankings
    const contenderInfo: {
      [contenderId: string]: {
        movieId: ObjectId;
        personId?: ObjectId;
        songId?: ObjectId;
      };
    } = {};
    const numPredicting: {
      [categoryName: string]: {
        [contenderId: string]: { [ranking: number]: number };
      };
    } = {};
    for (const predictionSet of predictionSets) {
      if (!predictionSet) {
        continue;
      }
      const { categories } = predictionSet;
      for (const [categoryName, categoryPrediction] of Object.entries(
        categories
      )) {
        const { createdAt, predictions } = categoryPrediction;
        // don't record a prediction that's over 30 days old
        if (createdAt < thirtyDaysAgo) {
          continue;
        }
        // this is where the next-day phase exception rule would go
        for (const prediction of predictions) {
          const { contenderId: contenderObjectId, ranking } = prediction;
          const contenderId = contenderObjectId.toString();
          if (!numPredicting[categoryName]) {
            numPredicting[categoryName] = {};
          }
          if (!numPredicting[categoryName][contenderId]) {
            // first time we encounter the contenderId, fill in this info
            contenderInfo[contenderId] = {
              movieId: prediction.movieId,
              personId: prediction.personId,
              songId: prediction.songId
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

    // this helps us get the actual list ranking for each contender
    const pointsPerContenderId: { [contenderId: string]: number } = {};
    for (const categoryName of Object.keys(categories)) {
      for (const [contenderId, rankings] of Object.entries(
        numPredicting[categoryName]
      )) {
        pointsPerContenderId[contenderId] = getContenderPoints(rankings);
      }
    }
    const sortedContenderIds = Object.entries(pointsPerContenderId)
      .sort(([, a], [, b]) => {
        // this will sort so the largest number comes first in the list
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      })
      .map(([contenderId]) => contenderId);

    // format the "categories" field on PredictionSet
    const categoryPredictions: {
      [key: string]: iCategoryPrediction;
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

    // if any shortlist is happening today, we need to know so we can write to tomorrow's predictions
    // see POST:predictionset for why
    const maybeShortlistDateTimeHappeningToday = Object.values(categories)
      .map((c) => c.shortlistDateTime)
      .find(
        (shortlistDateTime) =>
          shortlistDateTime && yyyymmdd === dateToYyyymmdd(shortlistDateTime)
      );

    // this is for writing to
    const yyyymmdd: number = shouldLogPredictionsAsTomorrow(
      nomDateTime,
      maybeShortlistDateTimeHappeningToday
    )
      ? tomorrowYyyymmdd
      : todayYyyymmdd;

    // get most recent
    const mostRecentPredictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(
        { userId: COMMUNITY_USER_ID, eventId: new ObjectId(eventId) },
        { sort: { yyyymmdd: -1 } }
      );

    const isNewDate =
      mostRecentPredictionSet && yyyymmdd !== mostRecentPredictionSet.yyyymmdd;

    // create predictionset this is the first for the event, or we don't have one for this date yet
    if (!mostRecentPredictionSet || isNewDate) {
      await db.collection<PredictionSet>('predictionsets').insertOne({
        userId: COMMUNITY_USER_ID,
        eventId: new ObjectId(eventId),
        yyyymmdd,
        // @ts-expect-error - This should only have partial data
        categories: categoryPredictions
      });
      // else if predictionset exists for event, update it
    } else {
      // update the current prediction set
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

  return {
    statusCode: 200
  };
});
