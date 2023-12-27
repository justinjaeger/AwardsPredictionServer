export type iContenderStats = {
  numPredictingWin: number;
  numPredictingWithinSlots: number;
  numPredictingWithinFiveSlots: number;
  numPredictingAnySlot: number;
};

/**
 * Gets summary data on where users are predicting a contender to be nominated
 */
export const getContenderStats = (
  numPredicting: Record<number, number>,
  slotsInCategory: number = 5
): iContenderStats => {
  return Object.entries(numPredicting).reduce(
    (acc, [slotNum, numUsersPredicting]) => {
      const slotNumber = parseInt(slotNum, 10);

      if (slotNumber >= slotsInCategory + 5) {
        acc.numPredictingAnySlot += numUsersPredicting;
      } else if (slotNumber >= slotsInCategory) {
        acc.numPredictingWithinFiveSlots += numUsersPredicting;
      } else if (slotNumber > 1) {
        acc.numPredictingWithinSlots += numUsersPredicting;
      } else {
        acc.numPredictingWin += numUsersPredicting;
      }
      return acc;
    },
    {
      numPredictingWin: 0,
      numPredictingWithinSlots: 0,
      numPredictingWithinFiveSlots: 0,
      numPredictingAnySlot: 0
    }
  );
};

// /**
//  * Gets the total number of users predicting a contender in any position
//  */
// export const getTotalNumPredicting = (numPredicting: Record<number, number>) =>
//   Object.values(numPredicting || {}).reduce((acc, numPredicting) => {
//     return acc + numPredicting;
//   }, 0);

//   /**
//    * a
//    */
//   export const totalNumPredictingCategory =
//           communityPredictions.categories[category as CategoryName]
//             .totalUsersPredicting ?? totalNumPredictingTop;
