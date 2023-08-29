import {
  type Filter,
  ObjectId,
  type FindOptions,
  type InsertOneResult,
  type UpdateResult
} from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type iPredictions,
  type EventModel,
  type PredictionSet,
  type User,
  type CategoryUpdateLog
} from './types/models';
import { Phase, type CategoryName } from './types/enums';
import { SERVER_ERROR } from './types/responses';
import { dateToYyyymmdd, getDate } from './helper/utils';
import { RECENT_PREDICTION_SETS_TO_SHOW } from './helper/constants';
import { shouldLogPredictionsAsTomorrow } from './helper/shouldLogPredictionsAsTomorrow';

/**
 * Get the most recent predictionset if yyyymmdd is not provided
 * Else, get a predictionset for a specific date
 *
 * If categoryName is provided, only return that category
 * // TODO: untested
 */
export const get = dbWrapper<
  { yyyymmdd: number; categoryName?: CategoryName },
  PredictionSet
>(
  async ({
    db,
    params: { userId, eventId, yyyymmdd: yyyymmddString, categoryName }
  }) => {
    const yyyymmdd = yyyymmddString ? parseInt(yyyymmddString) : undefined;
    const filter: Filter<PredictionSet> = {
      userId: new ObjectId(userId),
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
    const predictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(filter, options);
    return {
      statusCode: 200,
      predictionSet
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
    predictions: iPredictions; // user passes all predictions with request
  },
  {}
>(
  async ({
    db,
    client,
    payload: { eventId, categoryName, predictions },
    authenticatedUserId
  }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    const userId = authenticatedUserId;

    const session = client.startSession();

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
    const { awardsBody, year, nomDateTime, winDateTime } = event;
    const {
      type: categoryType,
      phase: categoryPhase,
      shortlistDateTime
    } = category;

    // winDateTime is when we close predictions for the winner ceremony
    if (winDateTime && winDateTime < new Date()) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Final predictions have ended. Pencils down!`
      };
    }
    if (categoryPhase === Phase.CLOSED) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Category is closed for predictions while leaderboards are compiled.`
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

    let predictionSetRequest:
      | Promise<InsertOneResult<PredictionSet>>
      | Promise<UpdateResult<PredictionSet>>;

    // create predictionset if it doesn't exist. means it's the first prediction the user has made for this event
    if (!mostRecentPredictionSet) {
      predictionSetRequest = db
        .collection<PredictionSet>('predictionsets')
        .insertOne(
          {
            userId: new ObjectId(userId),
            eventId: new ObjectId(eventId),
            yyyymmdd,
            // @ts-expect-error - This should only have partial data
            categories: {
              [categoryName]: {
                type: categoryType,
                phase: categoryPhase,
                createdAt: new Date(),
                predictions
              }
            }
          },
          { session }
        );
      // else if predictionset exists for event, update it
    } else {
      const requiresNewEntry = yyyymmdd !== mostRecentPredictionSet.yyyymmdd;
      if (requiresNewEntry) {
        // create a copy of the most recent predictionset, but with a new yyyymmdd, and update the category
        predictionSetRequest = db
          .collection<PredictionSet>('predictionsets')
          .insertOne(
            {
              ...mostRecentPredictionSet,
              yyyymmdd,
              categories: {
                ...mostRecentPredictionSet.categories,
                [categoryName]: {
                  type: categoryType,
                  phase: categoryPhase,
                  createdAt: new Date(),
                  predictions
                }
              }
            },
            { session }
          );
      } else {
        // update the current prediction set
        predictionSetRequest = db
          .collection<PredictionSet>('predictionsets')
          .updateOne(
            { _id: mostRecentPredictionSet._id },
            {
              $set: {
                [`categories.$.${categoryName}`]: {
                  type: categoryType,
                  phase: categoryPhase,
                  createdAt: new Date(),
                  predictions
                }
              }
            },
            { session }
          );
      }
    }

    // update the user's recentPredictionSets, setting the new one at the top of the list
    const user = await db
      .collection<User>('users')
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { recentPredictionSets: 1 } }
      );
    const userRecentPredictionSets = user?.recentPredictionSets ?? [];
    userRecentPredictionSets.unshift({
      awardsBody,
      year,
      category: categoryName,
      createdAt: new Date(),
      predictionSetId: new ObjectId(),
      topPredictions: predictions
        .sort((a, b) => b.ranking - a.ranking)
        .slice(0, 5)
    });
    if (userRecentPredictionSets?.length > RECENT_PREDICTION_SETS_TO_SHOW) {
      userRecentPredictionSets.pop();
    }
    const userRequest = db.collection<User>('users').updateOne(
      {
        _id: new ObjectId(userId)
      },
      { $set: { recentPredictionSets: userRecentPredictionSets } },
      { session }
    );

    // update categoryUpdateLogs - we'll use this to fill out a calendar of days where we made updates
    const categoryUpdateLogsRequest = db
      .collection<CategoryUpdateLog>('categoryupdatelogs')
      .updateOne(
        {
          userId: new ObjectId(userId),
          eventId: new ObjectId(eventId),
          category: categoryName
        },
        { $set: { [`yyyymmddUpdates.$.${yyyymmdd}`]: true } },
        { upsert: true, session } // useful the first time a user updates a category
      );

    // atomically execute all three requests
    // Important:: You must pass the session to all requests!!
    try {
      await session.withTransaction(async () => {
        await predictionSetRequest;
        await userRequest;
        await categoryUpdateLogsRequest;
      });
    } finally {
      await session.endSession();
      await client.close();
    }

    return {
      statusCode: 200
    };
  }
);
