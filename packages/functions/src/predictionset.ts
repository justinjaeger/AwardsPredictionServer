import { type Filter, ObjectId, type FindOptions, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type iPrediction,
  type EventModel,
  type PredictionSet,
  type User,
  type CategoryUpdateLog,
  type CategoryName,
  Phase,
  type iCategoryPrediction,
  type EventUpdateLog
} from './types/models';
import { SERVER_ERROR } from './types/responses';
import { dateToYyyymmdd, getDate } from './helper/utils';
import {
  COMMUNITY_USER_ID,
  RECENT_PREDICTION_SETS_TO_SHOW
} from './helper/constants';
import { shouldLogPredictionsAsTomorrow } from './helper/shouldLogPredictionsAsTomorrow';
import { getPhaseUserIsPredicting } from './helper/getPhaseUserIsPredicting';
import { stripId } from './helper/stripId';

/**
 * Get the most recent predictionset if yyyymmdd is not provided
 * Else, get a predictionset for a specific date
 *
 * If categoryName is provided, only return that category
 * // TODO: untested
 */
export const get = dbWrapper<
  { yyyymmdd: number; categoryName?: CategoryName },
  WithId<PredictionSet> | null
>(
  async ({
    db,
    params: { userId, eventId, yyyymmdd: yyyymmddString, categoryName }
  }) => {
    const yyyymmdd = yyyymmddString ? parseInt(yyyymmddString) : undefined;
    const filter: Filter<PredictionSet> = {
      userId:
        userId === COMMUNITY_USER_ID ? COMMUNITY_USER_ID : new ObjectId(userId),
      eventId: new ObjectId(eventId)
    };
    const options: FindOptions<PredictionSet> = {};
    // if we want a specific date, we pass yyyymmdd
    // else, we'll just return the most recent
    if (yyyymmdd) {
      filter.yyyymmdd = yyyymmdd;
    } else {
      options.sort = { yyyymmdd: -1 };
    }
    // we might want to return ONLY a specific category, so this would enable that
    if (categoryName) {
      options.projection = { [`categories.${categoryName}`]: 1 };
    }
    // options.projection = { [`categories.SONG`]: 1 }; // DELETE THIS LINE:
    // const startTime = performance.now();
    const predictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(filter, options);
    // const endTime = performance.now();
    // 1074ms vs 2857ms total
    // 249ms vs 1238ms total
    // IN POSTMAN: 277ms vs 700ms total
    // console.log(
    //   'setItemsInCache.all took ' +
    //     (endTime - startTime).toString() +
    //     ' milliseconds.'
    // );
    // but then it says "done in 3621ms"
    // why so long?? It has to reach this server, that's why. Idk why THIS is so slow...

    return {
      statusCode: 200,
      data: predictionSet
    };
  }
);

/**
 * Updates a single category that the user is predicting with new array of predictions
 * Atomically updates the predictionset, the user's recentPredictionSets, and the categoryUpdateLogs
 * If there is a phase conflict, for ex: a category is SHORTLISTED, so we're now predicting the shortlist, but earlier in the day it was not:
 * - it will create a new predictionset for the next day
 * - we're comfortable with this so we don't overwrite the FINAL predictions for some leaderboard event
 * - the first prediction they make on the now-shortlisted category can just come the next day
 * TODO: untested
 */
export const post = dbWrapper<
  {
    eventId: string;
    categoryName: CategoryName;
    predictions: iPrediction[]; // user passes all predictions with request
  },
  {}
>(
  async ({
    db,
    client,
    payload: { eventId, categoryName, predictions },
    authenticatedUserId
  }) => {
    const startTime = performance.now(); // TODO: remove

    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    const userId = authenticatedUserId;

    // get the category for the most recent phase
    const event = await db
      .collection<EventModel>('events')
      .findOne(
        { _id: new ObjectId(eventId) },
        { projection: { [`categories.${categoryName}`]: 1 } }
      );
    const category = event?.categories[categoryName];
    if (!category) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Category ${categoryName} not found on event`
      };
    }
    const { awardsBody, year, nomDateTime } = event;
    const { shortlistDateTime } = category;

    const phaseUserIsPredicting = getPhaseUserIsPredicting(
      event,
      shortlistDateTime
    );

    if (phaseUserIsPredicting === Phase.CLOSED) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Event is closed for predictions.`
      };
    }

    // get today and tomorrow's yyyymmdd
    const todayYyyymmdd = dateToYyyymmdd(getDate());
    const tomorrowYyyymmdd = dateToYyyymmdd(getDate(1));

    // determine whether we need to write to today or tomorrow to preserve final predictions
    // predictions post-nom/shortlist on the day of transition will count towards the next day
    const yyyymmdd: number = shouldLogPredictionsAsTomorrow(
      nomDateTime,
      shortlistDateTime
    )
      ? tomorrowYyyymmdd
      : todayYyyymmdd;

    // get most recent to copy over if it's an update
    const mostRecentPredictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(
        { userId: new ObjectId(userId), eventId: new ObjectId(eventId) },
        { sort: { yyyymmdd: -1 } }
      );

    // prepare to update the user's recentPredictionSets
    const user = await db
      .collection<User>('users')
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { recentPredictionSets: 1 } }
      );
    const userRecentPredictionSets = user?.recentPredictionSets ?? [];
    // note: The TOP predictions should be at the FRONT of the array
    userRecentPredictionSets.unshift({
      awardsBody,
      year,
      category: categoryName,
      createdAt: new Date(),
      predictionSetId: new ObjectId(),
      topPredictions: predictions
        .sort((a, b) => a.ranking - b.ranking)
        .slice(0, 5)
    });
    if (userRecentPredictionSets?.length > RECENT_PREDICTION_SETS_TO_SHOW) {
      userRecentPredictionSets.pop();
    }

    // atomically execute all requests
    // Important:: You must pass the session to all requests!!
    const session = client.startSession();
    try {
      const newCategory: iCategoryPrediction = {
        createdAt: new Date(),
        predictions
      };
      await session.withTransaction(async () => {
        // create predictionset if it doesn't exist. means it's the first prediction the user has made for this event
        if (!mostRecentPredictionSet) {
          await db.collection<PredictionSet>('predictionsets').insertOne(
            {
              userId: new ObjectId(userId),
              eventId: new ObjectId(eventId),
              yyyymmdd,
              // @ts-expect-error - This should only have partial data
              categories: {
                [categoryName]: newCategory
              }
            },
            { session }
          );
          // else if predictionset exists for event, update it
        } else {
          const requiresNewEntry =
            yyyymmdd !== mostRecentPredictionSet.yyyymmdd;
          if (requiresNewEntry) {
            const newPredictionSet: PredictionSet = {
              ...stripId(mostRecentPredictionSet),
              yyyymmdd,
              categories: {
                ...mostRecentPredictionSet.categories,
                [categoryName]: newCategory
              }
            };
            // create a copy of the most recent predictionset, but with a new yyyymmdd, and update the category
            await db
              .collection<PredictionSet>('predictionsets')
              .insertOne(newPredictionSet, { session });
          } else {
            // update the current prediction set
            await db.collection<PredictionSet>('predictionsets').updateOne(
              { _id: mostRecentPredictionSet._id },
              {
                $set: {
                  [`categories.${categoryName}`]: newCategory
                }
              },
              { session }
            );
          }
        }

        // update user's recentPredictionSets
        await db.collection<User>('users').updateOne(
          {
            _id: new ObjectId(userId)
          },
          { $set: { recentPredictionSets: userRecentPredictionSets } },
          { session }
        );

        // update eventUpdateLogs - we'll use this to fill out a calendar of days where we made updates
        await db.collection<EventUpdateLog>('eventupdatelogs').updateOne(
          {
            userId: new ObjectId(userId),
            eventId: new ObjectId(eventId)
          },
          { $set: { [`yyyymmddUpdates.${yyyymmdd}`]: true } },
          { upsert: true, session } // useful the first time a user updates a category
        );

        // categoryUpdateLogs - useful if you want the calendar to be filled by category and not the event overall
        await db.collection<CategoryUpdateLog>('categoryupdatelogs').updateOne(
          {
            userId: new ObjectId(userId),
            eventId: new ObjectId(eventId),
            category: categoryName
          },
          { $set: { [`yyyymmddUpdates.${yyyymmdd}`]: true } },
          { upsert: true, session } // useful the first time a user updates a category
        );
      });
    } catch (e) {
      console.error('error updating predictionset:', e);
      return {
        ...SERVER_ERROR.Error,
        message: `Error updating predictionset`
      };
    } finally {
      await session.endSession();
    }
    const endTime = performance.now();

    // TODO: remove
    console.log(
      'setItemsInCache.all took ' +
        (endTime - startTime).toString() +
        ' milliseconds.'
    );

    return {
      statusCode: 200
    };
  }
);
