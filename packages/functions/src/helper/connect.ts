import { ServerApiVersion } from 'mongodb';

// https://docs.sst.dev/console

export const mongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false, // NOTE: needs to be true in prod
    deprecationErrors: true
  }
};
export const mongoClientUrl = process.env.MONGODB_URI as string;
