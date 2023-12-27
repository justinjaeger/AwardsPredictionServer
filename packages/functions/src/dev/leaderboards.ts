/**
   Leaderboard create index func:
   await db.collection<User>('users').createIndex({
     "leaderboardRankings.eventId": 1,
     "leaderboardRankings.phase": 1,
     "leaderboardRankings.rank": 1 
   }, { unique: true, partialFilterExpression: { leaderboardRankings: { $exists: true } } })
 */

import { MongoClient, type WithId, type ObjectId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from 'src/helper/connect';
import { dateToYyyymmdd } from 'src/helper/utils';
import {
  AwardsBody,
  type EventModel,
  Phase,
  type User,
  type Contender,
  type PredictionSet,
  type iCategory,
  type CategoryName
} from 'src/types/models';

const TARGET_EVENT_BODY: AwardsBody = AwardsBody.ACADEMY_AWARDS;
const TARGET_EVENT_YEAR: number = 2024;
const PHASE: Phase = Phase.SHORTLIST;

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const handler = async () => {
  const db = client.db('db');

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
    PHASE === 'SHORTLIST'
      ? event.shortlistDateTime
      : PHASE === 'NOMINATION'
      ? event.nomDateTime
      : event.winDateTime;
  if (!timeOfClose) {
    console.log('no time of close found');
    return;
  }

  // Then we need to find the proper yyyymmdd to query for
  // Now all we need to do for this is to get yyyymmdd from the timeOfClose
  const yyyymmdd = dateToYyyymmdd(timeOfClose);
  console.log('yyyymmdd', yyyymmdd);

  // Now we need to find the most recent prediction set for each user
  // We're going to use the yyyymmdd to find the most recent prediction set for each user

  // TODO: This isn't going to encompass the community "user"
  // But it would be nice to have the community predictions in here too
  const leaderboardRankings: {
    [userId: string]: {
      percentageAccuracy: number;
      predictionSetId: ObjectId;
    };
  } = {};
  console.log('getting prediction sets...');
  const pSetReqs: Array<Promise<WithId<PredictionSet> | null>> = [];
  for (const user of allUsers) {
    pSetReqs.push(
      db
        .collection<PredictionSet>('predictionsets')
        .findOne({ userId: user._id, eventId, yyyymmdd: { $lte: yyyymmdd } })
    );
  }
  console.log('pSetReqs', pSetReqs.length);
  const predictionSets = await Promise.all(pSetReqs);
  console.log('predictionSets', predictionSets.length); // 3991
  // does it make sense that this is 3991?? Well we do have about 4k users. Just a lot, or the majority, aren't active
  for (const predictionSet of predictionSets) {
    if (!predictionSet) {
      continue;
    }
    // now, determine the user's accuracy for each category
    let potentialCorrectPredictions = 0;
    let totalCorrectPredictions = 0;
    // TODO: calculate riskiness by measuring your predictions up to the community predictions

    // loop through each category, counting one per correct prediction
    for (const [categoryName, { predictions }] of Object.entries(
      predictionSet.categories
    )) {
      // get the slots for this category
      const categoryData = event.categories[categoryName as CategoryName];
      const {
        slots: nomSlots,
        shortlistSlots,
        winSlots
      } = categoryData as iCategory;
      const slots: number =
        PHASE === Phase.SHORTLIST
          ? shortlistSlots ?? 15
          : PHASE === Phase.NOMINATION
          ? nomSlots ?? 5
          : winSlots ?? 1;
      // we should sort these predictions
      const userPredictions = predictions
        .sort((a, b) => {
          return a.ranking - b.ranking;
        })
        .slice(0, slots);
      const accoladedContenderIds = contenders
        .filter((contender) => {
          return contender.accolade === PHASE;
        })
        .map((c) => c._id);
      const accurateUserPredictions = userPredictions.filter((prediction) => {
        return accoladedContenderIds.includes(prediction.contenderId);
      });
      potentialCorrectPredictions += slots;
      totalCorrectPredictions += accurateUserPredictions.length as number; // ts compiler is being dumb
    }
    // Now that we have the potential versus total correct predictions,
    // create a leaderboardRanking entry
    // TODO: push riskiness into here
    const userId = predictionSet.userId.toString();
    leaderboardRankings[userId] = {
      percentageAccuracy: totalCorrectPredictions / potentialCorrectPredictions,
      predictionSetId: predictionSet._id
    };
  }
  // TODO: once riskiness and accuracy are there, we can add another field to each entry, RANK
  const sortedLeaderboardRankings = Object.entries(leaderboardRankings).sort(
    (
      [userId1, { percentageAccuracy: pa1 }],
      [userId2, { percentageAccuracy: pa2 }]
    ) => {
      return pa1 - pa2;
    }
  );
  console.log('sortedLeaderboardRankings', sortedLeaderboardRankings.length);
  console.log('sortedLeaderboardRankings[0]', sortedLeaderboardRankings[0]);
  console.log(
    'sortedLeaderboardRankings[sortedLeaderboardRankings.length - 1]',
    sortedLeaderboardRankings[sortedLeaderboardRankings.length - 1]
  );

  // Now we need to update the leaderboardRankings for each user
  //   const requests = Promise.all(
  //     Object.entries(leaderboardRankings).map(
  //       async ([userId, { percentageAccuracy, predictionSetId }]) => {
  //         return await db.collection<User>('users').updateOne(
  //           { _id: new ObjectId(userId) },
  //           {
  //             $push: {
  //               leaderboardRankings: {
  //                 eventId,
  //                 phase: PHASE,
  //                 percentageAccuracy,
  //                 predictionSetId,
  //                 rank: 0, // TODO: we do not know their rank yet
  //                 riskiness: 0 // TODO: we do not know their riskiness yet
  //               }
  //             }
  //           }
  //         );
  //       }
  //     )
  //   );
  //   console.log('waiting for create leaderboard / update user requests...');
  //   await requests;

  console.log('done!');
};
