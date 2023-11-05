import { ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Song } from './types/models';

/**
 * Gets a batch of song data,
 * Fake POST request so I can use the body
 */
export const getBatch = dbWrapper<string[], Record<string, Song>>(
  async ({ db, payload: ids }) => {
    const songRequests: Array<Promise<WithId<Song> | null>> = [];
    for (const id of ids) {
      songRequests.push(
        db.collection<Song>('songs').findOne({
          _id: new ObjectId(id)
        })
      );
    }
    const songIdToData: Record<string, Song> = {};
    const songs = await Promise.all(songRequests);
    songs.forEach((song) => {
      if (song) {
        songIdToData[song._id.toString()] = song;
      }
    });

    return {
      statusCode: 200,
      data: songIdToData
    };
  }
);
