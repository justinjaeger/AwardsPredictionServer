import { Api, Cron, StackContext } from "sst/constructs";

/**
 * Using SST with MongoDB:
 * https://sst.dev/examples/how-to-use-mongodb-atlas-in-your-serverless-app.html
 * 
 * SST Docs for this file:
 * https://docs.sst.dev/constructs/Api#using-the-minimal-config
 * https://docs.sst.dev/constructs/Cron
 * 
 * API naming best practices:
 * https://restfulapi.net/resource-naming/
 * 
 */

const MONGODB_URI = `mongodb+srv://justinjaeger:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@serverlessinstance0.0omknww.mongodb.net/?retryWrites=true&w=majority`;
// const MONGODB_URI = `mongodb+srv://justinjaeger:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@serverlessinstance0.0omknww.mongodb.net`;

const PATH = "packages/functions/src";

export function ApiStack({ stack }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          MONGODB_URI: MONGODB_URI,
          JWT_SECRET: process.env.JWT_SECRET || '',
          TMDB_API_KEY: process.env.TMDB_API_KEY || '',
        },
      },
    },
    routes: {
      // GET
      "GET /": `${PATH}/test.get`, // for testing
      "GET /users/{userId}": `${PATH}/user.get`,
      "GET /users/{userId}/following": `${PATH}/user.listFollowings`,
      "GET /users/{userId}/followers": `${PATH}/user.listFollowers`,
      "GET /users/search": `${PATH}/user.search`,
      "GET /relationships/{followingUserId}/{followedUserId}": `${PATH}/relationship.get`,
      "GET /tokens": `${PATH}/token.get`, // uses payload from refreshToken
      "GET /predictionsets/{userId}/event/{eventId}": `${PATH}/predictionset.get`, // returns Predictionset
      "GET /events": `${PATH}/event.list`,
      "GET /jwt": `${PATH}/jwt.get`,
      // POST
      "POST /users": `${PATH}/user.post`, // creating a user doesn't require an id
      "POST /relationships": `${PATH}/relationship.post`,
      "POST /tokens": `${PATH}/token.post`,
      "POST /predictionsets/{userId}/event/{eventId}": `${PATH}/predictionset.post`,
      "POST /contenders": `${PATH}/contender.post`,
      "POST /movies": `${PATH}/movie.post`,
      "POST /persons": `${PATH}/person.post`,
      "POST /songs": `${PATH}/song.post`,
      // PUT
      "PUT /users": `${PATH}/user.put`, // userId derived from token
      // DELETE
      "DELETE /relationships": `${PATH}/relationship.remove`,
      "DELETE /tokens": `${PATH}/token.remove`, // delete token in payload unless userId is passed, in which case delete all from that userID
    },
  });

  new Cron(stack, "cron-updateTmdb", {
    schedule: "rate(1 day)",
    job: `${PATH}/cron/updateTmdb.handler`,
  });

  new Cron(stack, "cron-recordCommunityHistory", {
    schedule: "rate(1 hour)",
    job: `${PATH}/cron/recordCommunityHistory.handler`,
  });


  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url, // prints out the API endpoint
  });
}
