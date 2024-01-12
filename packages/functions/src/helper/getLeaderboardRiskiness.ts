import { type WithId } from 'mongodb';
import {
  type Phase,
  type CategoryName,
  type PredictionSet,
  type EventModel
} from 'src/types/models';
import { getSlotsInPhase } from './getSlotsInPhase';
import { getHasAccoladeOrAbove } from './getHasAccoladeOrAbove';
import { getContenderStats } from './getContenderStats';
import { formatPercentage } from './formatPercentage';

/**
 * Note that riskiness is only added to for when the risk pays off
 */
export const getLeaderboardRiskiness = (
  eventPhase: Phase,
  event: EventModel,
  communityPredictionSet: WithId<PredictionSet>,
  userPredictionSet: WithId<PredictionSet>,
  getContenderAccolade: (contenderId: string) => Phase | undefined,
  categoriesToAccount?: CategoryName[] // if none, just count them all
): number => {
  // first, filter the user predictions to only include the categories we're accounting for
  const filteredUserPredictionSetCategories = Object.entries(
    userPredictionSet.categories
  ).filter(([categoryName]) => {
    if (!categoriesToAccount) {
      return true;
    }
    return categoriesToAccount.includes(categoryName as CategoryName);
  });

  let riskiness = 0;

  filteredUserPredictionSetCategories.forEach(
    ([categoryName, { predictions }]) => {
      const categoryData = event.categories[categoryName as CategoryName];
      const slots = getSlotsInPhase(eventPhase, categoryData);

      // get the contenderIds that the user predicted
      const contenderIdsThatUserPredicted: string[] = predictions
        .sort(({ ranking: r1 }, { ranking: r2 }) => r1 - r2)
        .slice(0, slots)
        .map((p) => p.contenderId.toString());

      const { predictions: communityPredictions, totalUsersPredicting } =
        communityPredictionSet.categories[categoryName as CategoryName];

      if (!totalUsersPredicting) {
        console.error(
          'ERROR: totalUsersPredicting is undefined, but necessary for calculating riskiness'
        );
        return;
      }

      // loop through community predictions for the given category
      // when we find a prediction that the user made, AND the contender has gotten the accolade
      // add to the riskiness score
      // each correct prediction has the potential of 0-100 riskiness points
      // 0 means 100% of ALL users predicted the contender
      // 100 means 0% of users predicted the contender
      communityPredictions.forEach((communityPrediction) => {
        if (!communityPrediction.numPredicting) {
          return;
        }

        const cId = communityPrediction.contenderId.toString();

        const accolade = getContenderAccolade(cId);
        const contenderHasAccolade = getHasAccoladeOrAbove(
          eventPhase,
          accolade
        );
        const userPredictedTheContender =
          contenderIdsThatUserPredicted.includes(cId);

        // take the num users predicting the contender vs the num users predicting the category overall
        if (contenderHasAccolade && userPredictedTheContender) {
          const { numPredictingWithinSlots } = getContenderStats(
            communityPrediction.numPredicting,
            slots
          );
          const percentageOfUsersPredicting = formatPercentage(
            numPredictingWithinSlots / totalUsersPredicting
          );
          riskiness += 100 - percentageOfUsersPredicting;
        }
      });
    }
  );

  // round riskiness to 2 decimal places
  riskiness = Math.round(riskiness * 100) / 100;
  return riskiness;
};
