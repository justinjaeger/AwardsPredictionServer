import { type WithId } from 'mongodb';
import { type PredictionSet } from 'src/types/models';

export const getLastUpdatedOnPredictionSet = (
  predictionSet: WithId<PredictionSet>
) => {
  const iterablePredictionData = Object.values(predictionSet?.categories || {});

  // only applies to community since all categories are updated at once
  const lastUpdated = iterablePredictionData.reduce((acc: Date, prediction) => {
    const curUpdatedAt = new Date(prediction.createdAt);
    if (curUpdatedAt > acc) {
      acc = curUpdatedAt;
    }
    return acc;
  }, new Date(0));
  return new Date(lastUpdated || '');
};
