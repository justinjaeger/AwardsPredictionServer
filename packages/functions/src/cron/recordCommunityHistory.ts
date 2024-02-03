/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
import { MongoClient, ObjectId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import { COMMUNITY_USER_ID } from 'src/helper/constants';
import { getContenderPoints } from 'src/helper/getContenderPoints';
import { shouldLogPredictionsAsTomorrow } from 'src/helper/shouldLogPredictionsAsTomorrow';
import { dateToYyyymmdd, getDate } from 'src/helper/utils';
import { dbWrapper } from 'src/helper/wrapper';
import {
  type iCategoryPrediction,
  type EventModel,
  type PredictionSet,
  type iPrediction,
  EventStatus,
  type CategoryName,
  type User,
  type Contender,
  Phase,
  CategoryType,
  type Accolade
} from 'src/types/models';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
 * Records community predictions every hour
 * logs one predictionset per event with userId = 'community'
 * Creates a new log on each unique day
 */

export const handler = dbWrapper(client, async ({ db }) => {
  const thirtyDaysAgo = getDate(-30);
  const todayYyyymmdd = dateToYyyymmdd(getDate());
  const tomorrowYyyymmdd = dateToYyyymmdd(getDate(1));

  // get list of events that are not archived, we'll query only those prediction sets
  console.log('getting events...');
  const activeEvents = await db
    .collection<EventModel>('events')
    .find({ status: { $ne: EventStatus.ARCHIVED } })
    .toArray();

  console.log('getting users...');
  const allUsers = await db
    .collection<User>('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const allUserIds = allUsers.map((u) => u._id);

  console.log('getting contenders...');
  const allContenders = await db
    .collection<Contender>('contenders')
    .find({}, { projection: { _id: 1, category: 1, isHidden: 1 } })
    .toArray();
  const indexedContenderIds: {
    [cId: string]: { category: CategoryName; isHidden?: boolean };
  } = {};
  allContenders.forEach(({ _id, category, isHidden }) => {
    indexedContenderIds[_id.toString()] = { category, isHidden };
  });

  // for each active event, take each user's most recent predictionset
  for (const event of activeEvents) {
    const {
      _id: eventId,
      categories,
      nomDateTime,
      winDateTime,
      shortlistDateTime
    } = event;

    const accolades = await db.collection<Accolade>('accolades').findOne({
      eventId: new ObjectId(eventId)
    });
    const contenderIdToAccolade = accolades?.accolades ?? {};

    // we want to record community predictions after the event has happened,
    // BUT give it an hour extra so that we make sure to get what the users did right before they were locked out
    // so the users will be locked out one hour before the last recording
    const todayOneHourFromNow = new Date();
    todayOneHourFromNow.setHours(todayOneHourFromNow.getHours() + 1);
    const shortlistHasHappened =
      shortlistDateTime && shortlistDateTime < todayOneHourFromNow;
    const nominationsHaveHappened =
      nomDateTime && nomDateTime < todayOneHourFromNow;
    const winnersHaveHappened =
      winDateTime && winDateTime < todayOneHourFromNow;
    if (winnersHaveHappened) {
      console.log('winners have happened, not recording...');
      continue;
    }

    const someContendersAreShortlisted =
      shortlistHasHappened &&
      allContenders.some(
        (c) => contenderIdToAccolade[c._id.toString()] === Phase.SHORTLIST
      );
    const someContendersAreNominated =
      nominationsHaveHappened &&
      allContenders.some(
        (c) => contenderIdToAccolade[c._id.toString()] === Phase.NOMINATION
      );

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
        movieTmdbId: number;
        personTmdbId?: number;
        songId?: string;
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
        const isOverThirtyDaysOld = createdAt < thirtyDaysAgo;
        if (isOverThirtyDaysOld) continue;
        const isShortlistedCategory =
          categories[categoryName as CategoryName].isShortlisted;
        for (const {
          movieTmdbId,
          personTmdbId,
          songId,
          contenderId: contenderObjectId,
          ranking
        } of predictions) {
          const contenderId = contenderObjectId.toString();
          // if hidden, don't tally it
          const contenderIsHidden = indexedContenderIds[contenderId].isHidden;
          if (contenderIsHidden) {
            continue;
          }
          // if it's predicted in the wrong category (edge case / bug) continue
          const contenderIsInWrongCategory =
            indexedContenderIds[contenderId].category !== categoryName;
          if (contenderIsInWrongCategory) {
            continue;
          }

          // filter for shortlist, if that's happened, and if nominations have NOT happened
          const shouldFilterByIsShortlisted =
            someContendersAreShortlisted &&
            isShortlistedCategory &&
            !someContendersAreNominated;
          const contenderHasBeenShortlisted =
            contenderIdToAccolade[contenderId] === Phase.SHORTLIST;
          if (shouldFilterByIsShortlisted && !contenderHasBeenShortlisted) {
            continue;
          }

          // filter for nominations, if that's happened
          // maybe it's not displaying because it's not getting the most recent, it's getting today's date of community?
          const contenderHasBeenNominated =
            contenderIdToAccolade[contenderId] === Phase.NOMINATION;
          if (someContendersAreNominated && !contenderHasBeenNominated) {
            continue;
          }

          // tally all predictions that aren't blocked by the above filters
          if (!numPredicting[categoryName]) {
            numPredicting[categoryName] = {};
          }
          if (!numPredicting[categoryName][contenderId]) {
            // first time we encounter the contenderId, fill in this info
            contenderInfo[contenderId] = {
              movieTmdbId,
              personTmdbId,
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
    const pointsPerContenderId: {
      [categoryName: string]: { [contenderId: string]: number };
    } = {};
    for (const categoryName of Object.keys(categories)) {
      if (!numPredicting[categoryName]) continue;
      if (!pointsPerContenderId[categoryName]) {
        pointsPerContenderId[categoryName] = {};
      }
      for (const [contenderId, rankings] of Object.entries(
        numPredicting[categoryName]
      )) {
        const { slots } = categories[categoryName as CategoryName];
        pointsPerContenderId[categoryName][contenderId] = getContenderPoints(
          rankings,
          slots
        );
      }
    }
    console.log('3');
    const getSortedContenderIds = (categoryName: string) =>
      Object.entries(pointsPerContenderId[categoryName])
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
    for (const categoryName of Object.keys(categories)) {
      // we need numPredicting amount of predictions for each category
      const predictions: iPrediction[] = [];
      if (!numPredicting[categoryName]) continue;
      const sortedContenderIds = getSortedContenderIds(categoryName);
      for (const [contenderId, rankings] of Object.entries(
        numPredicting[categoryName]
      )) {
        // get the actual list ranking
        const ranking = sortedContenderIds.indexOf(contenderId) + 1;
        // WORKAROUND FOR PUSHING DUPLICATE MOVIES: Keep whichever one has the highest ranking
        // (the source of this is probably a bug where contenders from one category get wrongly saved to another)
        const categoryIsFilm =
          categories[categoryName as CategoryName].type === CategoryType.FILM;
        const filmThatIsAlreadyInPredictions = predictions.find(
          (p) => p.movieTmdbId === contenderInfo[contenderId].movieTmdbId
        );
        if (categoryIsFilm && filmThatIsAlreadyInPredictions) {
          // (remember, lower number is higher rank)
          const filmThatIsInPredictionsIsRankedHigher =
            filmThatIsAlreadyInPredictions &&
            filmThatIsAlreadyInPredictions.ranking < ranking;
          if (filmThatIsInPredictionsIsRankedHigher) {
            // if it has a higher ranking, just don't push this one
            continue;
          } else {
            // remove it from predictions and push this one
            predictions.splice(
              predictions.indexOf(filmThatIsAlreadyInPredictions),
              1
            );
          }
        }
        // END WORKAROUND
        predictions.push({
          ...contenderInfo[contenderId], // contains movieTmdbId, personTmdbId, songId
          contenderId: new ObjectId(contenderId),
          ranking,
          numPredicting: rankings
        });
      }
      // we want all the users WHO ARE PREDICTING THIS CATEGORY SPECIFICALLY
      // so we need to filter out users who are predicting other categories
      const usersPredictingThisCategory = predictionSets.filter((ps) => {
        if (!ps) return false;
        const categoryPrediction = ps.categories[categoryName as CategoryName];
        if (!categoryPrediction) return false;
        // don't record a prediction that's over 30 days old
        if (categoryPrediction.createdAt < thirtyDaysAgo) return false;
        return categoryPrediction.predictions.length > 0;
      });
      categoryPredictions[categoryName] = {
        createdAt: new Date(),
        predictions,
        totalUsersPredicting: usersPredictingThisCategory.length
      };
    }

    console.log('5');
    // get the day we should log this predictionset as
    const yyyymmdd: number = shouldLogPredictionsAsTomorrow(event)
      ? tomorrowYyyymmdd
      : todayYyyymmdd;

    // upsert the predictionset - will create new if it's a new day
    await db.collection<PredictionSet>('predictionsets').findOneAndUpdate(
      {
        userId: COMMUNITY_USER_ID,
        eventId: new ObjectId(eventId),
        yyyymmdd
      },
      {
        // @ts-expect-error - allowing this to be partial
        $set: { categories: categoryPredictions }
      },
      { upsert: true }
    );
  }

  console.log('done!');
  return {
    statusCode: 200
  };
});
