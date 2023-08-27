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
import { dateToYyyymmdd } from './helper/utils';
import { RECENT_PREDICTION_SETS_TO_SHOW } from './helper/constants';

// TODO: untested
export const get = dbWrapper<
  { yyyymmdd: number; categoryName?: CategoryName },
  PredictionSet
>(
  async ({
    db,
    params: { userId, eventId, yyyymmdd: yyyymmddString, categoryName }
  }) => {
    const yyyymmdd = yyyymmddString ? parseInt(yyyymmddString) : undefined;
    // get most recent
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
      options.projection = { [`CATEGORIES.${categoryName}`]: 1 };
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
        { projection: { [`CATEGORIES.${categoryName}`]: 1 } }
      );
    const category = event?.categories[categoryName];
    if (!category) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Category ${categoryName} not found on event`
      };
    }
    const { awardsBody, year } = event;
    const { type: categoryType, phase: categoryPhase } = category;

    if (categoryPhase === Phase.CLOSED) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Category is closed for predictions while leaderboards are compiled.`
      };
    }

    const d = new Date();
    const todayYyyymmdd = dateToYyyymmdd(d);
    d.setDate(d.getDate() + 1); // increment to tomorrow
    const tomorrowYyyymmdd = dateToYyyymmdd(d);

    const mostRecentPredictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(
        { userId: new ObjectId(userId), eventId: new ObjectId(eventId) },
        { sort: { yyyymmdd: -1 } }
      );

    let predictionSetRequest:
      | Promise<InsertOneResult<PredictionSet>>
      | Promise<UpdateResult<PredictionSet>>;

    let finalYyyymmdd: number | undefined;
    // handle cases for updating an existing prediction set vs creating a new one
    if (mostRecentPredictionSet) {
      const latestYyyymmdd = mostRecentPredictionSet.yyyymmdd;
      const latestCategoryPhase =
        mostRecentPredictionSet.categories?.[categoryName]?.phase;

      let requiresNewEntry: boolean = false;
      let newEntryYyyymmdd: number | undefined; // undefined if it doesn't require a new entry
      // if the latest predictionset is in the past, we'll need to create a new predictionset
      if (latestYyyymmdd < todayYyyymmdd) {
        requiresNewEntry = true;
        newEntryYyyymmdd = todayYyyymmdd;
      } else if (latestYyyymmdd >= todayYyyymmdd) {
        // if it's for today or later, has the category phase changed?
        if (
          latestCategoryPhase !== categoryPhase && // if the category phase has changed since last update
          latestYyyymmdd <= todayYyyymmdd // and the date of the former entry is NOT in future (which would mean we already switched to tomorrow for some other category, and we don't want to do that)
        ) {
          // we need to create a new predictionset for TOMORROW to avoid overwriting phases
          requiresNewEntry = true;
          newEntryYyyymmdd = tomorrowYyyymmdd;
        }
        // if category phase has not changed, we'll just update the current predictionset
        else {
          requiresNewEntry = false;
          newEntryYyyymmdd = undefined;
        }
      }
      if (requiresNewEntry && newEntryYyyymmdd !== undefined) {
        // create a copy of the most recent predictionset, but with a new yyyymmdd, and update the category
        finalYyyymmdd = newEntryYyyymmdd;
        predictionSetRequest = db
          .collection<PredictionSet>('predictionsets')
          .insertOne(
            {
              ...mostRecentPredictionSet,
              yyyymmdd: finalYyyymmdd,
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
        finalYyyymmdd = latestYyyymmdd;
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
    } else {
      // create it if it doesn't exist. means it's the first prediction the user has made for this event
      finalYyyymmdd = todayYyyymmdd;
      predictionSetRequest = db
        .collection<PredictionSet>('predictionsets')
        .insertOne(
          {
            userId: new ObjectId(userId),
            eventId: new ObjectId(eventId),
            yyyymmdd: finalYyyymmdd,
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
        { $set: { [`yyyymmddUpdates.$.${finalYyyymmdd}`]: true } },
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
