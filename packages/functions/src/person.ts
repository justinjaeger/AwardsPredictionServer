import { dbWrapper } from './helper/wrapper';
import { type Person } from './types/models';

export const post = dbWrapper<Person, string>(async ({ db, payload }) => {
  const person = await db.collection<Person>('persons').insertOne(payload);
  return {
    statusCode: 200,
    data: person.insertedId.toString()
  };
});
