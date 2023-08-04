import { type User } from './types/models';
import { dbWrapper } from './helper/wrapper';

export const get = dbWrapper<string>(async ({ event, db }) => {
  // console.log('Event:', event);

  // Test mongodb connection
  const users = db.collection<User>('users');
  const result = await users.find({}).toArray();
  const username = result[0].username;

  return {
    statusCode: 200,
    data: username ?? ''
  };
});
