import { ObjectId, type WithId } from 'mongodb';
import { dbWrapper } from './helper/wrapper';
import { type Person } from './types/models';

/**
 * Gets a batch of movie data,
 * which is updated behind the scenes from tmdb
 * Fake POST request so I can use the body
 */
export const getBatch = dbWrapper<string[], Record<string, Person>>(
  async ({ db, payload: ids }) => {
    const personRequests: Array<Promise<WithId<Person> | null>> = [];
    for (const id of ids) {
      personRequests.push(
        db.collection<Person>('persons').findOne({
          _id: new ObjectId(id)
        })
      );
    }
    const personIdToData: Record<string, Person> = {};
    const persons = await Promise.all(personRequests);
    persons.forEach((person) => {
      if (person) {
        personIdToData[person._id.toString()] = person;
      }
    });

    return {
      statusCode: 200,
      data: personIdToData
    };
  }
);
