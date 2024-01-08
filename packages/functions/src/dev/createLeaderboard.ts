import { MongoClient, ObjectId, type WithId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import { formatPercentage } from 'src/helper/formatPercentage';
import { getAccuratePredictionsTally } from 'src/helper/getAccuratePredictionsTally';
import { getEventLeaderboardsKey } from 'src/helper/getEventLeaderboardsKey';
import { getLeaderboardRiskiness } from 'src/helper/getLeaderboardRiskiness';
import { getSlotsInPhase } from 'src/helper/getSlotsInPhase';
import { dateToYyyymmdd } from 'src/helper/utils';
import {
  AwardsBody,
  type EventModel,
  Phase,
  type User,
  type PredictionSet,
  CategoryName,
  type iLeaderboard,
  type iLeaderboardRanking,
  type Accolade
} from 'src/types/models';

/**
   Leaderboard create index func:
   // SORT ON RISK:
   await db.collection<User>('users').createIndex(
    {
      'leaderboardRankings.eventId': 1,
      'leaderboardRankings.phase': 1,
      'leaderboardRankings.noShorts': 1,
      'leaderboardRankings.rank': 1
    },
    {
      unique: true,
      partialFilterExpression: { leaderboardRankings: { $exists: true } }
    }
  );
  // SORT ON RISKINESS
  await db.collection<User>('users').createIndex(
    {
      'leaderboardRankings.eventId': 1,
      'leaderboardRankings.phase': 1,
      'leaderboardRankings.noShorts': 1,
      'leaderboardRankings.riskiness': 1
    },
    {
      partialFilterExpression: { leaderboardRankings: { $exists: true } }
    }
  );
 */

const TARGET_EVENT_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;
const TARGET_EVENT_YEAR: number = 2024;
const PHASE: Phase = Phase.SHORTLIST;
const INCLUDE_SHORT_FILMS: boolean = true;

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

const SHORT_CATEGORIES = [
  CategoryName.SHORT_ANIMATED,
  CategoryName.SHORT_LIVE_ACTION,
  CategoryName.SHORT_DOCUMENTARY
];

export const handler = async () => {
  const db = client.db('db');

  const shouldDiscountShortFilms = !INCLUDE_SHORT_FILMS;

  console.log('getting users...');
  const allUsers = await db
    .collection<User>('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();

  console.log('getting event...');
  const event = await db
    .collection<EventModel>('events')
    .findOne({ year: TARGET_EVENT_YEAR, awardsBody: TARGET_EVENT_BODY });
  const eventId = event?._id;

  if (!eventId) {
    console.log('no event found');
    return;
  }

  console.log('getting accolades...');
  const accolade = await db
    .collection<Accolade>('accolades')
    .findOne({ eventId });
  if (!accolade) {
    console.log('no accolades found for this event');
    return;
  }

  // Find the exact time that predictions closed on the event...
  const timeOfClose =
    PHASE === Phase.SHORTLIST
      ? event.shortlistDateTime
      : PHASE === Phase.NOMINATION
      ? event.nomDateTime
      : event.winDateTime;
  if (!timeOfClose) {
    console.log('no time of close found');
    return;
  }
  const yyyymmdd = dateToYyyymmdd(timeOfClose);

  // filters out non-shortlisted categories if we're compiling shortlist leaderboard
  // and it disregards categories that weren't live until accolades were given (aka previously unpredictable)
  const filteredCategories = Object.entries(event.categories).filter(
    ([
      categoryName,
      { isShortlisted, isHiddenBeforeNoms, isHiddenBeforeShortlist }
    ]) => {
      const isShortCategory = SHORT_CATEGORIES.includes(
        categoryName as CategoryName
      );
      if (isShortCategory && shouldDiscountShortFilms) {
        return false;
      }
      if (PHASE === Phase.SHORTLIST) {
        if (isHiddenBeforeShortlist) {
          return false;
        }
        return isShortlisted;
      }
      if (PHASE === Phase.NOMINATION) {
        if (isHiddenBeforeNoms) {
          return false;
        }
      }
      return true;
    }
  );

  const filteredCategoryNames = filteredCategories.map(
    ([c]) => c as CategoryName
  );

  let potentialCorrectPredictions = 0;
  for (const [, categoryData] of filteredCategories) {
    const slots = getSlotsInPhase(PHASE, categoryData) as number; // ts is being dumb
    potentialCorrectPredictions += slots;
  }

  // We're going to use the yyyymmdd to find the prediction at or before target date

  console.log('getting community prediction...');
  const communityPredictionSet = await db
    .collection<PredictionSet>('predictionsets')
    .findOne({ userId: 'community', eventId, yyyymmdd: { $lte: yyyymmdd } });
  if (!communityPredictionSet) {
    console.log('no community prediction set found; needed for riskiness');
    return;
  }

  console.log('getting prediction sets...');
  const pSetReqs: Array<Promise<WithId<PredictionSet> | null>> = [];
  for (const user of allUsers) {
    pSetReqs.push(
      db
        .collection<PredictionSet>('predictionsets')
        .findOne({ userId: user._id, eventId, yyyymmdd: { $lte: yyyymmdd } })
    );
  }
  const predictionSets = await Promise.all(pSetReqs);
  console.log('predictionSets', predictionSets.length); // should = number of users

  const leaderboardRankings: {
    [userId: string]: {
      percentageAccuracy: number;
      riskiness: number;
      predictionSetId: ObjectId;
    };
  } = {};

  for (const predictionSet of predictionSets) {
    if (!predictionSet) {
      continue;
    }

    // want to know the number of slots the user simply didn't have a prediction for
    let slotsLeftOpen = 0;
    filteredCategories.forEach(([categoryName, categoryData]) => {
      const slots = getSlotsInPhase(PHASE, categoryData) as number; // ts is being dumb
      const numUserCategoryPredictions =
        // note: "predictions" be undefined -- users may not predict every category
        (
          predictionSet.categories[categoryName as CategoryName]?.predictions ??
          []
        ).length;
      if (numUserCategoryPredictions < slots) {
        slotsLeftOpen += slots - numUserCategoryPredictions;
      }
    });
    // FILTER: If the user failed to predict more than half of the potential slots, don't include them in the leaderboard
    if (slotsLeftOpen > potentialCorrectPredictions / 2) {
      continue;
    }

    const riskiness = getLeaderboardRiskiness(
      PHASE,
      event,
      communityPredictionSet,
      predictionSet,
      (cId) => accolade.accolades[cId],
      filteredCategoryNames
    );

    const accuratePredictionsTally = getAccuratePredictionsTally(
      PHASE,
      event,
      predictionSet,
      (cId) => accolade.accolades[cId],
      filteredCategoryNames
    );
    const percentageAccuracy = formatPercentage(
      accuratePredictionsTally / potentialCorrectPredictions
    );

    // Now that we have the potential versus total correct predictions,
    // create a leaderboardRanking entry
    const userId = predictionSet.userId.toString();
    leaderboardRankings[userId] = {
      percentageAccuracy,
      riskiness,
      predictionSetId: predictionSet._id
    };
  }

  // Get community stats
  const communityRiskiness = getLeaderboardRiskiness(
    PHASE,
    event,
    communityPredictionSet,
    communityPredictionSet,
    (cId) => accolade.accolades[cId],
    filteredCategoryNames
  );
  const communityAccuratePredictionsTally = getAccuratePredictionsTally(
    PHASE,
    event,
    communityPredictionSet,
    (cId) => accolade.accolades[cId],
    filteredCategoryNames
  );
  const communityPercentageAccuracy = formatPercentage(
    communityAccuratePredictionsTally / potentialCorrectPredictions
  );

  // sort in order of rank (index 0 is #1)
  const sortedLeaderboardRankings = Object.entries(leaderboardRankings)
    .filter(([userId, { percentageAccuracy }]) => {
      // filter out users who didn't make any predictions
      // er, maybe we should do this at a different level?
      return percentageAccuracy > 0;
    })
    .sort(
      (
        [userId1, { percentageAccuracy: pa1, riskiness: r1 }],
        [userId2, { percentageAccuracy: pa2, riskiness: r2 }]
      ) => {
        // prioritize accuracy first
        if (pa1 < pa2) {
          return 1;
        }
        if (pa1 > pa2) {
          return -1;
        }
        // but if equal, prefer the riskier predictions
        if (r1 < r2) {
          return 1;
        }
        if (r1 > r2) {
          return -1;
        }
        return 0;
      }
    );

  const topPercentageAccuracy =
    sortedLeaderboardRankings[0][1].percentageAccuracy;
  const medianPercentageAccuracy =
    sortedLeaderboardRankings[
      Math.floor(sortedLeaderboardRankings.length / 2)
    ][1].percentageAccuracy;
  const numPredicted = sortedLeaderboardRankings.length;

  const percentageAccuracyDistribution: {
    [percentageAccuracy: number]: number;
  } = {};
  sortedLeaderboardRankings.forEach(([, ranking]) => {
    if (!percentageAccuracyDistribution[ranking.percentageAccuracy]) {
      percentageAccuracyDistribution[ranking.percentageAccuracy] = 0;
    }
    percentageAccuracyDistribution[ranking.percentageAccuracy] += 1;
  });

  // Update the event to indicate that the leaderboard has been created

  const setKey = getEventLeaderboardsKey(PHASE, shouldDiscountShortFilms);

  const eventLeaderboard: iLeaderboard = {
    phase: PHASE,
    noShorts: !!shouldDiscountShortFilms,
    numPredicted,
    topPercentageAccuracy,
    medianPercentageAccuracy,
    percentageAccuracyDistribution,
    communityPercentageAccuracy,
    communityRiskiness
  };

  console.log('updating event...');
  try {
    await db.collection<EventModel>('events').updateOne(
      { _id: eventId },
      {
        $set: {
          // this is how you set elements in arrays
          [`leaderboards.${setKey as string}`]: eventLeaderboard
        }
      }
    );
  } catch (err: any) {
    console.log(
      'You may need to insert empty object on event (event.leaderboards = {})'
    );
    throw new Error(err);
  }

  // Now we need to update the leaderboardRankings for each user
  const existingLeaderboardEntryRequests = Promise.all(
    sortedLeaderboardRankings.map(async ([userId], i) => {
      return await db.collection<User>('users').findOne({
        _id: new ObjectId(userId),
        leaderboardRankings: {
          $elemMatch: {
            eventId,
            phase: PHASE,
            noShorts: shouldDiscountShortFilms
          }
        }
      });
    })
  );
  console.log('getting existing user.leaderboardRankings...');
  // Error: Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer
  const existingLeaderboardEntries = await existingLeaderboardEntryRequests;

  const updateUserRequests = Promise.all(
    sortedLeaderboardRankings.map(
      async (
        [userId, { percentageAccuracy, predictionSetId, riskiness }],
        i
      ) => {
        const existingLeaderboardEntry = existingLeaderboardEntries[i];
        if (existingLeaderboardEntry) {
          // replace/update element
          return await db.collection<User>('users').updateOne(
            {
              _id: new ObjectId(userId),
              leaderboardRankings: {
                $elemMatch: {
                  eventId,
                  phase: PHASE,
                  noShorts: shouldDiscountShortFilms
                }
              }
            },
            {
              $set: {
                'leaderboardRankings.percentageAccuracy': percentageAccuracy,
                'leaderboardRankings.predictionSetId': predictionSetId,
                'leaderboardRankings.rank': i + 1,
                'leaderboardRankings.riskiness': riskiness
              }
            }
          );
        } else {
          // add new element
          const leaderboardRankings: iLeaderboardRanking = {
            eventId,
            phase: PHASE,
            noShorts: shouldDiscountShortFilms,
            percentageAccuracy,
            yyyymmdd,
            rank: i + 1,
            riskiness
          };
          return await db.collection<User>('users').updateOne(
            { _id: new ObjectId(userId) },
            {
              $push: {
                leaderboardRankings
              }
            }
          );
        }
      }
    )
  );
  console.log('updating user.leaderboardRankings...');
  await updateUserRequests;

  console.log('done!');
};
