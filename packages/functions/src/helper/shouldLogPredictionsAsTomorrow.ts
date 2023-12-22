import { type EventModel } from 'src/types/models';
import { dateToYyyymmdd } from './utils';

/**
 * Determine whether we need to write to today or tomorrow to preserve final predictions.
 * Predictions post-nom/shortlist on the day of transition will count towards the next day.
 *
 * This makes sense to do because we need to preserve the final predictions that happen
 * just before the shortlist/nominations close. This is a leaderboard, if you will.
 * To avoid the overwrite, we can shift the date of the predictionset to the next day.
 * When tomorrow comes around, it will continue to write to that day.
 *
 * To simplify:
 * If ANY shortlist is happening today, and the time has passed, log it as tomorrow
 * If nominations are happening today, and the time has passed, log it as tomorrow.
 */
export const shouldLogPredictionsAsTomorrow = (event: EventModel): boolean => {
  const { nomDateTime, shortlistDateTime } = event;
  const todayYyyymmdd = dateToYyyymmdd(new Date());

  const shortlistsAreHappeningToday =
    shortlistDateTime && todayYyyymmdd === dateToYyyymmdd(shortlistDateTime);
  const shortlistsHavePassed =
    shortlistDateTime && shortlistDateTime < new Date();
  const logAsTomrrowForShortlists = !!(
    shortlistsAreHappeningToday && shortlistsHavePassed
  );

  // nomDateTime is when we close predictions for the nomination announcement
  const nominationsAreHappeningToday =
    nomDateTime && todayYyyymmdd === dateToYyyymmdd(nomDateTime);
  const nominationsHavePassed = nomDateTime && nomDateTime < new Date();
  const logAsTomrrowForNominations = !!(
    nominationsAreHappeningToday && nominationsHavePassed
  );

  return logAsTomrrowForShortlists || logAsTomrrowForNominations;
};
