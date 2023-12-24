import { ConnectionClosedEvent } from "mongodb";
import connectMongoDB from "./helpers/connectMongoDB.ts";
import {ApiData, Contender} from "./types/mongoApi.ts";

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
 * You might have to run this a few times WITHOUT updating anything, just to make sure it matches the titles
 * Because punctuation in my db vs the academy's website is going to be different for some titles
 */

async function handler(){
    console.log('1')
    const mongodb = await connectMongoDB();
    console.log('2')


    // const a = AMPAS_SHORTLISTED_TITLES;
    // // first, get all the apidata
    try {
        console.log('3')
        const allApiData = await mongodb.collection<ApiData>('apidata').findOne({eventYear: 2024});
        console.log('4')
        if (!allApiData) throw new Error(`Could not find apidata for 2024`)

        // get all shortlisted contenders
        const contender = await mongodb.collection<Contender>('contenders').updateMany({
            // @ts-ignore
            category: { $in: ["SHORT_DOCUMENTARY", "SHORT_LIVE_ACTION", "SHORT_ANIMATED"] },
        },{
            $set: {
                // @ts-ignore
                accolade: "SHORTLIST",
            }
        });
        console.log('result:',contender)
        console.log('done!')
    } catch (e){
        console.error(e);
    }
}
handler()