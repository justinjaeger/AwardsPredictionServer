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

const PATH = "packages/functions/src";

export function ApiStack({ stack }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          MONGODB_URI: MONGODB_URI,
          JWT_SECRET: process.env.JWT_SECRET || '',
        },
      },
    },
    routes: {
      // GET
      "GET /": `${PATH}/test.get`, // for testing
      "GET /user/{id}": `${PATH}/user.get`,
      "GET /users/list": `${PATH}/user.list`,
      "GET /users/following/{userId}": `${PATH}/user.listFollowings`,
      "GET /users/follower/{userId}": `${PATH}/user.listFollowers`,
      "GET /relationship/{followingUserId}/{followedUserId}": `${PATH}/relationship.get`,
      "GET /token/{token}": `${PATH}/token.get`, // not userId bc that will be passed in the header
      "GET /predictionset/{userId}/event/{eventId}": `${PATH}/predictionset.get`, // returns Predictionset
      "GET /events": `${PATH}/event.list`,
      "GET /jwt": `${PATH}/jwt.get`,
      // POST
      "POST /user": `${PATH}/user.post`, // creating a user doesn't require an id
      "POST /relationship/{followedUserId}": `${PATH}/relationship.post`,
      "POST /token": `${PATH}/token.post`,
      "POST /predictionset/{userId}/event/{eventId}": `${PATH}/predictionset.post`,
      "POST /contender": `${PATH}/contender.post`,
      "POST /movie": `${PATH}/movie.post`,
      "POST /person": `${PATH}/person.post`,
      "POST /song": `${PATH}/song.post`,
      "PUT /user": `${PATH}/user.put`, // userId derived from token
      // DELETE
      "DELETE /relationship": `${PATH}/relationship.remove`,
      "DELETE /token": `${PATH}/token.remove`,
      "DELETE /tokens": `${PATH}/token.removeAllUserTokens`,
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
