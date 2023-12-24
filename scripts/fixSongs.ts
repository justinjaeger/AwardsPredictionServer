import { ConnectionClosedEvent, ObjectId } from "mongodb";
import connectMongoDB from "./helpers/connectMongoDB.ts";
import {ApiData, Contender, PredictionSet} from "./types/mongoApi.ts";

/**
 * IMPORTANT: MUST USE NODE 18 TO RUN THIS SCRIPT
 * NODE VERSION MANAGER (NVM)
- https://github.com/nvm-sh/nvm
- source ~/.bashrc
- then, nvm install 18
- then, nvm use 18

 * NOTE: For some reason, ENUMS do not work here, so just use STRINGS
*/

/**
 * The way I did this before was,
 * I downloaded the entire apidata so I could do a text search on it
 * then I found duplicates so I knew how many duplicates there were, and what to swap
 */

const SONG_IDS_TO_SWAP = [
    "346698-What Was I Made For",
]

const CORRECT_ID = "346698-What Was I Made For?";

const CORRECT_ENTRY = {
    "title": "What Was I Made For?",
    "movieTmdbId": 346698,
    "type": "SONG"
}

const EVENT_YEAR = 2024;
const AWARDS_BODY = "ACADEMY_AWARDS";
const SONG_CATEGORY = "SONG";

/**
 * First, create the correct thing in api data (might have to delete others idk)
 * Then, know which is the correct contender. Basically, link one of the contenders to the api_data (might have to delete the rest)
 * Have to replace all songs with the same ID
 * - predictionsets, go through and swap any match for EQUAL_IDS and replace with the CORRECT_ID
 * - predictionsets, also swap the contenderId
 */

async function handler(){
    console.log('0')
    const mongodb = await connectMongoDB();
    console.log('00')

    try {
        console.log('1')
        // get the event for the given year and academy awards
        const eventRes = await mongodb.collection<Event>("events")
            .findOne({ year: EVENT_YEAR, awardsBody:AWARDS_BODY });
        console.log('2')
        if (!eventRes) throw new Error("Event not found");
        const eventId = eventRes._id;
        // create the correct entry in api data
        const apiDataRes = await mongodb.collection<ApiData>("apidata")
            // @ts-ignore
            .findOneAndUpdate({ eventYear: EVENT_YEAR }, { $set: { [CORRECT_ID]: CORRECT_ENTRY } });
        if (!apiDataRes) throw new Error("ApiData not found");
        console.log('3')
        // then, get the contender, or create if it does not exist
        let contenderId;
        const maybeFoundContender = await mongodb.collection<Contender>("contenders")
            // @ts-ignore because can't do enums
            .findOne({
                songId: CORRECT_ID,
            });
        if (maybeFoundContender) {
            contenderId = maybeFoundContender._id;
        } else {
            const newContender = await mongodb.collection<Contender>("contenders")
                // @ts-ignore because can't do enums
                .insertOne({
                    eventId,
                    // @ts-ignore because can't do enums
                    category: SONG_CATEGORY,
                    movieTmdbId: CORRECT_ENTRY.movieTmdbId,
                    songId: CORRECT_ID,
                });
            if (!newContender) throw new Error("Contender not found");
            contenderId = newContender.insertedId;
        }
        if (!contenderId) throw new Error("Contender id not defined");
        console.log('4')

        // update every predictionset where any song prediction's songId matches one of the SONG_IDS_TO_SWAP
         const updateRes = await mongodb.collection<PredictionSet>("predictionsets")
            .updateMany(
                { eventId, [`categories.${SONG_CATEGORY}.predictions`]: { $exists: true } },
                { 
                    $set: {
                        [`categories.${SONG_CATEGORY}.predictions.$[elem].songId`]: CORRECT_ID,
                        [`categories.${SONG_CATEGORY}.predictions.$[elem].contenderId`]: contenderId,
                    }
                },
                {
                    arrayFilters: [
                        { "elem.songId": { $in: SONG_IDS_TO_SWAP } }
                    ]
                }
            )
        console.log('updateRes',updateRes)
        console.log('done!')

    } catch (e){
        console.error(e);
    }
}
handler()
