/**
 * ex: 0.6666666 -> 66.67
 */
export const formatPercentage = (decimal: number) => {
  return Math.round(decimal * 100 * 100) / 100;
};
