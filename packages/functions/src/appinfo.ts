import { dbWrapper } from './helper/wrapper';
import { type AppInfo } from './types/models';

export const get = dbWrapper<null, AppInfo>(async ({ db }) => {
  const res = await db
    .collection<AppInfo>('appInfo')
    .find()
    .project({ _id: 0 })
    .toArray();

  const info = res[0] as AppInfo;

  return {
    statusCode: 200,
    data: info
  };
});
