import { MongoClient, ObjectId, type WithId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import { formatPercentage } from 'src/helper/formatPercentage';
import { getAccuratePredictionsTally } from 'src/helper/getAccuratePredictionsTally';
import { getLeaderboardRiskiness } from 'src/helper/getLeaderboardRiskiness';
import { getSlotsInPhase } from 'src/helper/getSlotsInPhase';
import { dateToYyyymmdd } from 'src/helper/utils';
import {
  AwardsBody,
  type EventModel,
  Phase,
  type User,
  type Contender,
  type PredictionSet,
  CategoryName
} from 'src/types/models';

const TARGET_EVENT_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;
const TARGET_EVENT_YEAR: number = 2024;
const PHASE: Phase = Phase.SHORTLIST;
const INCLUDE_SHORT_FILMS: boolean = true;

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

/**
   Leaderboard create index func:
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
 */

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

  console.log('getting contenders...');
  const contenders = await db
    .collection<Contender>('contenders')
    .find({ eventId }, { projection: { _id: 1, isHidden: 1, accolade: 1 } })
    .toArray();

  // We're going to find each user's most recent prediction set for this phase
  // To find that, we're going to find the exact time that predictions closed on the event...
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

  // Then we need to find the proper yyyymmdd to query for
  // Now all we need to do for this is to get yyyymmdd from the timeOfClose
  const yyyymmdd = dateToYyyymmdd(timeOfClose);

  // Now we need to find the most recent for each user and community
  // We're going to use the yyyymmdd to find the most recent prediction set for each user

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
  console.log('predictionSets', predictionSets.length);

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

    const riskiness = getLeaderboardRiskiness(
      PHASE,
      event,
      communityPredictionSet,
      predictionSet,
      (cId) => contenders.find((c) => c._id.toString() === cId),
      filteredCategoryNames
    );

    const accuratePredictionsTally = getAccuratePredictionsTally(
      PHASE,
      event,
      predictionSet,
      (cId) => contenders.find((c) => c._id.toString() === cId),
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

  // add COMMUNITY predictions to leaderboardRankings (as though it's its own user)
  const communityRiskiness = getLeaderboardRiskiness(
    PHASE,
    event,
    communityPredictionSet,
    communityPredictionSet,
    (cId) => contenders.find((c) => c._id.toString() === cId),
    filteredCategoryNames
  );
  const communityAccuratePredictionsTally = getAccuratePredictionsTally(
    PHASE,
    event,
    communityPredictionSet,
    (cId) => contenders.find((c) => c._id.toString() === cId),
    filteredCategoryNames
  );
  const communityPercentageAccuracy = formatPercentage(
    communityAccuratePredictionsTally / potentialCorrectPredictions
  );
  leaderboardRankings.community = {
    percentageAccuracy: communityPercentageAccuracy,
    riskiness: communityRiskiness,
    predictionSetId: communityPredictionSet._id
  };

  // sort in order of rank (index 0 is #1)
  const sortedLeaderboardRankings = Object.entries(leaderboardRankings).sort(
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

  // Now we need to update the leaderboardRankings for each user
  const requests = Promise.all(
    sortedLeaderboardRankings.map(
      async (
        [userId, { percentageAccuracy, predictionSetId, riskiness }],
        i
      ) => {
        const promise = async () => {
          const existingLeaderboardEntry = await db
            .collection<User>('users')
            .findOne({
              _id: new ObjectId(userId),
              leaderboardRankings: {
                $elemMatch: {
                  eventId,
                  phase: PHASE,
                  noShorts: shouldDiscountShortFilms
                }
              }
            });
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
                  'leaderboardRankings.$.percentageAccuracy':
                    percentageAccuracy,
                  'leaderboardRankings.$.predictionSetId': predictionSetId,
                  'leaderboardRankings.$.rank': i + 1,
                  'leaderboardRankings.$.riskiness': riskiness
                }
              }
            );
          } else {
            // add new element
            return await db.collection<User>('users').updateOne(
              { _id: new ObjectId(userId) },
              {
                $push: {
                  leaderboardRankings: {
                    eventId,
                    phase: PHASE,
                    noShorts: shouldDiscountShortFilms,
                    percentageAccuracy,
                    predictionSetId,
                    rank: i + 1,
                    riskiness
                  }
                }
              }
            );
          }
        };
        return promise;
      }
    )
  );
  console.log('updating user.leaderboardRankings...');
  await requests;

  console.log('done!');
};
