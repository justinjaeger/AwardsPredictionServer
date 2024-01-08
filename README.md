## Deploying
1. npx sst deploy --stage prod

## Creating Leaderboards
1. See `addToAccolades` to populate `accolade` table
* Tracks all contenderIds that have some accolade, and what that accolade is. Useful for determining the accuracy of a prediction set.
2. See `createLeaderboard`
* updates `User.leaderboardRankings` so when we have a profile or list of users, leaderboard stats are readily available
* updates `LeaderboardRankings` to get the paginated leaderboards (which need to be combined with the current user data)
* updates `EventModel.leaderboards`, keyed by `Phase + noShorts`, for listing all unique leaderboards under a certain event