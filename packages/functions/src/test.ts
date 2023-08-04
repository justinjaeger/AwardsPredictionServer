import { ObjectId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';

interface User {
    _id: ObjectId;
    name: string;
}

export const get = dbWrapper(async ({ event, db }) => {
  console.log('Event:', event);
  // Get an instance of our database
  const users = db.collection<User>("users");

  // Make a MongoDB MQL Query
  const result = await users.find({}).toArray();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
});
