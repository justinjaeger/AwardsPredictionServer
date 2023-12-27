export type iContenderStats = {
  numPredictingWin: number;
  numPredictingNomination: number;
  numPredictingClose: number;
  numPredictingAnySlot: number;
};

/**
 * For community predictions
 * gets data on where users are predicting a contender to be nominated
 */
export const getContenderStats = (
  numPredicting: Record<number, number>,
  slotsInCategory: number = 5
): iContenderStats => {
  /**
   * Predict win is 10 points
   * Predict nomination is 5 points
   * Predict slotNum (slotNum-1 through slotNum + 5) is 1 point
   * Any other ranking is 0.5 points
   */
  return Object.entries(numPredicting).reduce(
    (acc, [slotNum, numUsersPredicting]) => {
      const slotNumber = parseInt(slotNum, 10);

      if (slotNumber >= slotsInCategory + 5) {
        acc.numPredictingAnySlot += 1;
      } else if (slotNumber >= slotsInCategory) {
        acc.numPredictingClose += 1;
      } else if (slotNumber > 1) {
        acc.numPredictingNomination += 1;
      } else {
        acc.numPredictingWin += 1;
      }
      return acc;
    },
    {
      numPredictingWin: 0,
      numPredictingNomination: 0,
      numPredictingClose: 0,
      numPredictingAnySlot: 0
    }
  );
};
