import {
  type Filter,
  ObjectId,
  type FindOptions,
  type WithId,
  MongoClient,
  type Db
} from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import {
  type iPrediction,
  type EventModel,
  type PredictionSet,
  type User,
  type CategoryUpdateLog,
  type CategoryName,
  type iCategoryPrediction,
  type EventUpdateLog,
  type Contender
} from './types/models';
import { SERVER_ERROR } from './types/responses';
import { dateToYyyymmdd, getDate } from './helper/utils';
import {
  COMMUNITY_USER_ID,
  RECENT_PREDICTION_SETS_TO_SHOW
} from './helper/constants';
import { shouldLogPredictionsAsTomorrow } from './helper/shouldLogPredictionsAsTomorrow';
import { stripId } from './helper/stripId';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { getOrCreateContender } from './contender';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Get the most recent predictionset if yyyymmdd is not provided
 * Else, get a predictionset for a specific date
 *
 * If categoryName is provided, only return that category
 */
export const get = dbWrapper<
  { yyyymmdd: number; categoryName?: CategoryName },
  WithId<PredictionSet> | null
>(
  client,
  async ({
    db,
    params: {
      userId,
      eventId,
      yyyymmdd: yyyymmddString, // NOTE: for this, looks for this date OR EARLIER
      categoryName,
      predictionSetId
    }
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
      filter.yyyymmdd = { $lte: yyyymmdd };
    } else {
      options.sort = { yyyymmdd: -1 };
    }
    // we might want to return ONLY a specific category, so this would enable that
    if (categoryName) {
      options.projection = { [`categories.${categoryName}`]: 1 };
    }

    if (predictionSetId) {
      filter._id = new ObjectId(predictionSetId);
    }

    const predictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne(filter, options);

    return {
      statusCode: 200,
      data: predictionSet
    };
  }
);

const createPredictionSet = async ({
  db,
  eventId,
  categoryName,
  userId,
  predictions
}: {
  db: Db;
  eventId: string;
  categoryName: CategoryName;
  userId: string;
  predictions: iPrediction[];
}) => {
  // get the category for the most recent phase
  const event = await db.collection<EventModel>('events').findOne(
    { _id: new ObjectId(eventId) },
    {
      projection: {
        awardsBody: 1,
        year: 1,
        status: 1,
        nomDateTime: 1,
        winDateTime: 1,
        shortlistDateTime: 1,
        [`categories.${categoryName}`]: 1
      }
    }
  );

  const categoryData = event?.categories[categoryName];
  if (!categoryData) {
    return {
      ...SERVER_ERROR.BadRequest,
      message: `Category ${categoryName} not found on event`
    };
  }
  const { awardsBody, year, winDateTime } = event;

  const winDateHasPassed = !!(winDateTime && winDateTime < new Date());

  if (winDateHasPassed) {
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
  const yyyymmdd: number = shouldLogPredictionsAsTomorrow(event)
    ? tomorrowYyyymmdd
    : todayYyyymmdd;

  // get most recent to copy over if it's an update
  const mostRecentPredictionSetAsArray = await db
    .collection<PredictionSet>('predictionsets')
    .find({ userId: new ObjectId(userId), eventId: new ObjectId(eventId) })
    .sort({ yyyymmdd: -1 })
    .limit(1)
    .toArray();

  // typecast bc [0] might be undefined
  const mostRecentPredictionSet: WithId<PredictionSet> | undefined =
    mostRecentPredictionSetAsArray?.[0];

  // prepare to update the user's recentPredictionSets
  const user = await db.collection<User>('users').findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        recentPredictionSets: 1,
        eventsPredicting: 1,
        categoriesPredicting: 1
      }
    }
  );
  let userRecentPredictionSets = user?.recentPredictionSets ?? [];
  // get rid of other same predictions for this category
  userRecentPredictionSets = userRecentPredictionSets.filter((ps) => {
    const isTheSameAsNewCategory =
      ps.category === categoryName &&
      ps.year === year &&
      ps.awardsBody === awardsBody;
    return !isTheSameAsNewCategory;
  });
  // Put new predictions at top (the most recent)
  if (predictions.length > 0) {
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
  }
  // only store the most recent 5
  userRecentPredictionSets = userRecentPredictionSets.slice(
    0,
    RECENT_PREDICTION_SETS_TO_SHOW
  );

  // update the user's eventsPredicting
  const userEventsPredicting = user?.eventsPredicting ?? {};
  userEventsPredicting[eventId] = [
    ...(userEventsPredicting[eventId] ?? []).filter((c) => c !== categoryName),
    categoryName
  ];

  // update the user's categoriesPredicting
  const userCategoriesPredicting = user?.categoriesPredicting ?? {};
  userCategoriesPredicting[eventId] = userCategoriesPredicting[eventId] ?? {};
  userCategoriesPredicting[eventId][categoryName] = {
    createdAt: new Date()
  };

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
        const requiresNewEntry = yyyymmdd !== mostRecentPredictionSet.yyyymmdd;
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
        {
          $set: {
            recentPredictionSets: userRecentPredictionSets,
            eventsPredicting: userEventsPredicting,
            categoriesPredicting: userCategoriesPredicting
          }
        },
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

  return {
    statusCode: 200
  };
};

/**
 * Updates a single category that the user is predicting with new array of predictions
 * Atomically updates the predictionset, the user's recentPredictionSets, and the categoryUpdateLogs
 * If there is a phase conflict, for ex: a category is SHORTLISTED, so we're now predicting the shortlist, but earlier in the day it was not:
 * - it will create a new predictionset for the next day
 * - we're comfortable with this so we don't overwrite the FINAL predictions for some leaderboard event
 * - the first prediction they make on the now-shortlisted category can just come the next day
 */
export const post = dbWrapper<
  {
    eventId: string;
    categoryName: CategoryName;
    predictions: iPrediction[]; // user passes all predictions with request
  },
  {}
>(
  client,
  async ({
    db,
    payload: { eventId, categoryName, predictions },
    authenticatedUserId
  }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    const userId = authenticatedUserId;

    return await createPredictionSet({
      db,
      eventId,
      categoryName,
      userId,
      predictions
    });
  }
);

/**
 * Transfers contenders from one category to another (in same or different event)
 * These contenders may or may not be registered as Contenders in the DB
 */
export const transfer = dbWrapper<
  {
    sourceEventId: string;
    targetEventId: string;
    targetCategoryName: CategoryName;
    contenderIds: string[];
  },
  {}
>(
  client,
  async ({
    db,
    payload: { sourceEventId, targetEventId, targetCategoryName, contenderIds },
    authenticatedUserId
  }) => {
    if (!authenticatedUserId) {
      return SERVER_ERROR.Unauthorized;
    }
    const userId = authenticatedUserId;

    // get the category for the most recent phase
    const sourceEvent = await db
      .collection<EventModel>('events')
      .findOne({ _id: new ObjectId(sourceEventId) });
    if (!sourceEvent) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Event not found`
      };
    }

    const { year } = sourceEvent;

    // Validate that the target event is valid (not expired, not the same event, within the year)
    const targetEvents = await db
      .collection<EventModel>('events')
      .find(
        {
          year,
          $or: [
            { winDateTime: { $gte: new Date() } },
            { winDateTime: { $exists: false } }
          ]
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    if (
      !targetEvents.map(({ _id }) => _id).includes(new ObjectId(targetEventId))
    ) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Target event not valid`
      };
    }

    // From the contender ids, we want the Contender info, like movieTmdbId, personTmdbId, songId, etc. because we might have to create a new contender
    const existingContenders = await db
      .collection<Contender>('contenders')
      .find(
        {
          _id: { $in: contenderIds.map((id) => new ObjectId(id)) }
        },
        { projection: { numUsersPredicting: -1 } }
      )
      .toArray();

    // Now get target contenders, if they exist. If they do not exist, create.
    const targetContendersResponses = await Promise.all(
      existingContenders.map(async (contender) => {
        const targetContender = await getOrCreateContender({
          db,
          eventId: targetEventId,
          eventYear: year,
          categoryName: targetCategoryName,
          movieTmdbId: contender.movieTmdbId,
          personTmdbId: contender.personTmdbId,
          songTitle: contender.songId
        });
        return targetContender ?? contender;
      })
    );
    const targetContenders = targetContendersResponses.map(
      (response) => response.data ?? null
    );

    // Now with the target contenders, we can add them to our predictions
    // making sure that these are not already in our predictions
    // and once we have an array of predictions, we can pass that to the "post" endpoint
    const yyyymmdd = dateToYyyymmdd(getDate());
    const targetPredictionSet = await db
      .collection<PredictionSet>('predictionsets')
      .findOne({
        userId: new ObjectId(userId),
        eventId: new ObjectId(targetEventId),
        yyyymmdd: { $lte: yyyymmdd }
      });
    if (!targetPredictionSet) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: `Target predictionset not found`
      };
    }

    const currentTargetPredictions =
      targetPredictionSet.categories[targetCategoryName].predictions ?? [];
    const alreadyPredictedContenderIds = currentTargetPredictions.map(
      ({ contenderId }) => contenderId.toString()
    );

    // now we need a filtered list of the contenders which are NOT included in the currentTargetPredictions
    const onlyNewContenders = targetContenders
      .filter(Boolean)
      .filter(
        (contender) =>
          contender &&
          !alreadyPredictedContenderIds.includes(contender._id.toString())
      ) as Array<WithId<Contender>>;

    // now tac on onlyNewContenders to the currentTargetPredictions
    const newPredictions: iPrediction[] = [
      ...currentTargetPredictions,
      ...onlyNewContenders.map((contender, index) => ({
        contenderId: contender._id,
        ranking: currentTargetPredictions.length + index + 1,
        movieTmdbId: contender.movieTmdbId,
        personTmdbId: contender.personTmdbId,
        songId: contender.songId
      }))
    ];
    return await createPredictionSet({
      db,
      eventId: targetEventId,
      categoryName: targetCategoryName,
      userId,
      predictions: newPredictions
    });
  }
);
