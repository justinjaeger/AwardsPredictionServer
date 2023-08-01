import { Db, MongoClient, ServerApiVersion } from 'mongodb';

// Once we connect to the database once, we'll store that connection
// and reuse it so that we don't have to connect to the database on every request.
let cachedDb: Db;

// https://docs.sst.dev/console

const connectToDatabase = async () =>{
  if (cachedDb) {
    return cachedDb;
  }
  
  if (!process.env.MONGODB_URI) {
    console.error("No MongoDB uri was found!")
  }


  //@ts-ignore
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  

  // Connect to our MongoDB database hosted on MongoDB Atlas
  // const client = await MongoClient.connect(process.env.MONGODB_URI);

  // Specify which database we want to use
  cachedDb = await client.db("db");

  return cachedDb;
}

export default connectToDatabase;