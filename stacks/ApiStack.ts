import { Api, StackContext } from "sst/constructs";

/**
 * https://sst.dev/examples/how-to-use-mongodb-atlas-in-your-serverless-app.html
 */

const MONGODB_URI = `mongodb+srv://justinjaeger:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@serverlessinstance0.0omknww.mongodb.net/?retryWrites=true&w=majority`;

export function ApiStack({ stack }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          MONGODB_URI: MONGODB_URI,
        },
      },
    },
    // https://docs.sst.dev/constructs/Api#using-the-minimal-config
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
