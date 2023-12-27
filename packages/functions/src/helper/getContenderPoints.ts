/**
 * For community predictions
 * Assigns point value based on where users are ranking the film in their lists
 */
export const getContenderPoints = (
  numPredicting: Record<number, number>,
  slotsInCategory: number = 5
): number => {
  /**
   * Predict win is 10 points
   * Predict nomination is 5 points
   * Predict slotNum (slotNum-1 through slotNum + 5) is 1 points
   * Any other ranking is 0.5 points
   */
  return Object.entries(numPredicting).reduce(
    (acc, [slotNum, numUsersPredicting]) => {
      const slotNumber = parseInt(slotNum, 10);

      // ex: if slotNumber is 11, pointsPerPredictionAtSlot is 1
      // ex: if slotNumber is 1, pointsPerPredictionAtSlot is 10
      const pointsPerPredictionAtSlot =
        slotNumber > slotsInCategory + 5
          ? 0.5
          : slotNumber > slotsInCategory
          ? 1
          : slotNumber > 1
          ? 5
          : 10;

      const value = numUsersPredicting * pointsPerPredictionAtSlot;

      acc += value;
      return acc;
    },
    0
  );
};
