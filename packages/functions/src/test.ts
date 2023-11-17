import { type User } from './types/models';
import { dbWrapper } from './helper/wrapper';
import { MongoClient } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const get = dbWrapper<string>(client, async ({ event, db }) => {
  // console.log('Event:', event);

  //   return { hi: 'hello' };
  // Test mongodb connection
  //   const startTime = performance.now();
  const users = db.collection<User>('users');
  const result = await users.find({}).limit(1).explain();
  //   const endTime = performance.now();
  //   return {
  //     timeElapsed: endTime - startTime
  //   };
  const user = result[0];

  console.log('user', user);
  return {
    statusCode: 200,
    data: user ?? ''
  };
});
