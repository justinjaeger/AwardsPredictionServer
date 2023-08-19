import { dbWrapper } from './helper/wrapper';
import { type Song } from './types/models';

export const post = dbWrapper<Song, string>(async ({ db, payload }) => {
  const song = await db.collection<Song>('songs').insertOne(payload);
  return {
    statusCode: 200,
    data: song.insertedId.toString()
  };
});
