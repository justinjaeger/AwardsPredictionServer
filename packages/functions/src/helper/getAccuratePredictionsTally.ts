import {
  type PredictionSet,
  type CategoryName,
  type Phase,
  type EventModel,
  type Contender
} from 'src/types/models';
import { getHasAccoladeOrAbove } from './getHasAccoladeOrAbove';
import { getSlotsInPhase } from './getSlotsInPhase';
import { type WithId } from 'mongodb';

/**
 * Used with leaderboards
 * Gets the number of accurate predictions a user has made
 * And can take into account a subset of categories (useful for shortlist, for example)
 */
export const getAccuratePredictionsTally = (
  eventPhase: Phase,
  event: EventModel,
  userPredictionSet: WithId<PredictionSet>,
  getContenderById: (contenderId: string) => WithId<Contender> | undefined,
  categoriesToAccount?: CategoryName[] // if none, just count them all
): number => {
  const filteredPredictionSetCategories = Object.entries(
    userPredictionSet.categories
  ).filter(([categoryName]) => {
    if (!categoriesToAccount) {
      return true;
    }
    return categoriesToAccount.includes(categoryName as CategoryName);
  });

  let totalCorrectPredictions = 0;

  // loop through each category, counting one per correct prediction
  for (const [
    categoryName,
    { predictions }
  ] of filteredPredictionSetCategories) {
    const categoryData = event.categories[categoryName as CategoryName];
    const slots = getSlotsInPhase(eventPhase, categoryData);

    const predictedContenderIds: string[] = predictions
      .sort(({ ranking: r1 }, { ranking: r2 }) => r1 - r2)
      .slice(0, slots)
      .map((p) => p.contenderId.toString());

    const predictedContenderIdsWithAccolade: string[] = [];
    predictedContenderIds.forEach((cId) => {
      const contender = getContenderById(cId);
      const hasAccoladeOrAbove = getHasAccoladeOrAbove(
        eventPhase,
        contender?.accolade
      );
      if (hasAccoladeOrAbove) {
        predictedContenderIdsWithAccolade.push(cId);
      }
    });

    totalCorrectPredictions += predictedContenderIdsWithAccolade.length;
  }
  return totalCorrectPredictions;
};
