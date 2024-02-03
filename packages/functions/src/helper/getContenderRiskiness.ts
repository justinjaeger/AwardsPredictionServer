import { formatPercentage } from './formatPercentage';
import { getContenderStats } from './getContenderStats';

/**
 * Gives a riskiness number for a contender
 * Must be in sync with backend!
 */
export const getContenderRiskiness = (
  numPredicting: Record<number, number>,
  slots: number,
  totalUsersPredicting: number // derived from communityPredictionSet
): number => {
  const { numPredictingWithinSlots } = getContenderStats(numPredicting, slots);
  const percentageOfUsersPredicting = formatPercentage(
    numPredictingWithinSlots / totalUsersPredicting
  );
  return 100 - percentageOfUsersPredicting;
};
