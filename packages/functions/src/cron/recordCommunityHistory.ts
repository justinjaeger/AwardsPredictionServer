import { dbWrapper } from 'src/helper/wrapper';

export const handler = dbWrapper(async ({ db }) => {
  // I think this is going to loop through the contenders right?
  // Calculate numPredicting by querying user predictionsets with yyyymmdd that is <30 days ago
  // Tallies up every single prediction
  // while doing this, also manually filter for categories that have not been updated in the last 30 days, with its lastUpdated field
  // for each event, create or update a predictionset for user where userId = "community"
  // and make sure, with each CONTENDER, to write to a numPredicting field. Very important since this is the tally for each contender.
  // I mean this inside of each prediction, as well as with each Contender collection
  // there are going to be like 1000 contenders per event but it's fine, this is once every hour consistently

  // When creating the PredictionSet, we're going to want to respect the same rule as user predictions
  // where we create a predictionset for the next day if any category has changed phases!!

  return {
    statusCode: 200
  };
});

// Weird: If I want to see the predictions for a single movie,
// I'm going to have to reference the community predictions and parse through them, to access the numPredicting property, which kind of sucks
// What if, instead, I just have numPredicting live on the Contender, and update all the contenders as well? That would make it much easier to access
// It's just making it exist in 2 separate places, but it's only updating through the same mechanism so it will always be the same
// I think this is probably worth doing
// but maybe it's not -- the user community object is going to be huge, but we're going to load it anyway right?
// idk.
// Cause if I think about history, I'm going to have to use the community predictions anyway right?
// I'd get my history prediction, then the community history prediction, and display them side by side for the same category

// What is even the point of having contenderId? I guess it's to prevent duplicates. Yeah that makes sense. We more refer to it as a source of uniqueness.

// What about getting up-to-date movie info?
// We don't have this solved for regular user prediction sets either
// 1.
// - One option is to read from each movie as the prediction is updated
// - which is like 20 reads per category change, not the worst thing
// - and for community, it would be like 1000 reads, one per contender
// - we'd use the tmdbId to query the Movie table, to get the up-to-date info
// - for songs, we'd want to query with the songId actually, since we don't have a tmdbId
// - because a song could have the title updated
// 2. (!!!) I THINK I'M GONNA DO THIS
// - It's worth considering filling in the movie info when we load up the app
// - because even though it's a batch get request to do it, it will be cached
// - and the pro is that there aren't multiple versions of movie posters
// - because otherwise stale data combines with fresh data and it's sort of a mess
// - the con is that initial load times are slower since they have to not only fetch a predictionset say,
// - but also all the movies in the prediction sets, assembling them from either the database or the async storgae cache
// - it's also better than in the app right now because we can fetch this data from the database,
// - not from tmdb, which is a lot faster,
// - since we have the updateTmdb cron func running to do that for us

// What about getting up to date movie posters and such for history?
// (SOLVED WITH #2)
// I don't know, maybe that's a problem for another time

// What about special movie data for certain contenders, like directing contenders?
// Also solved with #2 - match it on the frontend not the backend
