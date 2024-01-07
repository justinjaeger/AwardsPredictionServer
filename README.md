## Deploying
1. npx sst deploy --stage prod

## Creating Leaderboards
1. See `addToAccolades` to populate `accolade` table
* Tracks all contenderIds that have some accolade, and what that accolade is. Useful for determining the accuracy of a prediction set.
2. See `createLeaderboard` to populate `User.leaderboardRankings`
* We use this to see the paginated list of users and their ranks
* updates `EventModel.leaderboards`, keyed by `Phase + noShorts`, for listing all unique leaderboards under a certain event