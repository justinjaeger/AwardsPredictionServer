const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGODB_URI = `mongodb+srv://justinjaeger:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@serverlessinstance0.0omknww.mongodb.net/?retryWrites=true&w=majority`;

const connectToDatabase = async () =>{
  const client = new MongoClient(MONGODB_URI || '', {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  // Specify which database we want to use
  const mongoDb = await client.db("db");
  return mongoDb;
}

module.exports = connectToDatabase;