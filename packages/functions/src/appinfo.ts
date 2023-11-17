import { MongoClient } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type AppInfo } from './types/models';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';

const client = new MongoClient(mongoClientUrl, mongoClientOptions);

export const get = dbWrapper<null, AppInfo>(client, async ({ db }) => {
  const res = await db
    .collection<AppInfo>('appinfo')
    .find({})
    .project({ _id: 0 })
    .toArray();

  const info = res[0] as AppInfo;

  return {
    statusCode: 200,
    data: info
  };
});
