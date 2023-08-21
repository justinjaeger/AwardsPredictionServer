import { MongoClient, ServerApiVersion } from 'mongodb';

// https://docs.sst.dev/console

const connectToDatabase = () => {
  if (!process.env.MONGODB_URI) {
    console.error('No MongoDB uri was found!');
  }

  // @ts-expect-error env variable
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false, // NOTE: needs to be true in prod
      deprecationErrors: true
    }
  });

  // Specify which database we want to use
  const db = client.db('db');

  return { db, client };
};

export default connectToDatabase;
