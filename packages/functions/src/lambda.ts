import { ObjectId } from 'mongodb';
import connect from './connect';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

interface User {
    _id: ObjectId;
    name: string;
}

export async function handler(event: APIGatewayProxyEvent, context: Context) {
  // By default, the callback waits until the runtime event loop is empty
  // before freezing the process and returning the results to the caller.
  // Setting this property to false requests that AWS Lambda freeze the
  // process soon after the callback is invoked, even if there are events
  // in the event loop.
  context.callbackWaitsForEmptyEventLoop = false;

  // Get an instance of our database
  const db = await connect();
  const users = db.collection<User>("users");

  // Make a MongoDB MQL Query
  const result = await users.find({}).toArray();

//   const d = new Date();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
}