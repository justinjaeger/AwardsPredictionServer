import { dateToYyyymmdd } from './utils';

/**
 * Determine whether we need to write to today or tomorrow to preserve final predictions.
 * Predictions post-nom/shortlist on the day of transition will count towards the next day.
 *
 * This makes sense to do because we need to preserve the final predictions that happen
 * just before the shortlist/nominations close. This is a leaderboard, if you will.
 * To avoid the overwrite, we can shift the date of the predictionset to the next day.
 * When tomorrow comes around, it will continue to write to that day.
 */
export const shouldLogPredictionsAsTomorrow = (
  shortlistDateTime: Date | undefined,
  nomDateTime: Date | undefined
): boolean => {
  const todayYyyymmdd = dateToYyyymmdd(new Date());

  // shortlistDateTime is when we close predictions for the shortlist announcement
  if (shortlistDateTime) {
    const shortlistTimeHasPassed =
      shortlistDateTime && shortlistDateTime < new Date();
    const shortlistHappenedToday =
      shortlistDateTime && todayYyyymmdd === dateToYyyymmdd(shortlistDateTime);

    return !!(shortlistTimeHasPassed && shortlistHappenedToday);
  }

  // nomDateTime is when we close predictions for the nomination announcement
  if (nomDateTime) {
    const nomDateTimeHasPassed = nomDateTime && nomDateTime < new Date();
    const nomHappenedToday =
      nomDateTime && todayYyyymmdd === dateToYyyymmdd(nomDateTime);
    return !!(nomDateTimeHasPassed && nomHappenedToday);
  }

  return false;
};
