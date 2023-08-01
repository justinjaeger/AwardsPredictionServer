import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/ApiStack";

// https://sst.dev/examples/how-to-use-mongodb-atlas-in-your-serverless-app.html

export default {
  config(_input) {
    return {
      name: "rest-api-mongodb",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ApiStack);
  }
} satisfies SSTConfig;
