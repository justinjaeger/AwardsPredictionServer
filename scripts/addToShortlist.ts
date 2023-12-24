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

const AMPAS_SHORTLISTED_TITLES = {
    // ["DOCUMENTARY"]:[
    //     "American Symphony",
    //     "Apolonia, Apolonia",
    //     "Beyond Utopia",
    //     "Bobi Wine: The People's President",
    //     "Desperate Souls, Dark City and the Legend of Midnight Cowboy",
    //     "The Eternal Memory",
    //     "Four Daughters",
    //     "Going to Mars: The Nikki Giovanni Project",
    //     "In the Rearview",
    //     "Stamped from the Beginning",
    //     "Still: A Michael J. Fox Movie",
    //     "A Still Small Voice",
    //     "32 Sounds",
    //     "To Kill a Tiger",
    //     "20 Days in Mariupol",
    // ],
    // ["INTERNATIONAL"]: [
    //     "Amerikatsi",
    //     "The Monk and the Gun",
    //     "The Promised Land",
    //     "Fallen Leaves",
    //     "The Taste of Things",
    //     "The Teachers’ Lounge",
    //     "Godland",
    //     "The Captain",
    //     "Perfect Days",
    //     "Tótem",
    //     "The Mother of All Lies",
    //     "Society of the Snow",
    //     "Four Daughters",
    //     "20 Days in Mariupol",
    //     "The Zone of Interest",
    // ],
    // ["MAKEUP"]: [
    //     "Beau Is Afraid",
    //     "Ferrari",
    //     "Golda",
    //     "Killers of the Flower Moon",
    //     "The Last Voyage of the Demeter",
    //     "Maestro",
    //     "Napoleon",
    //     "Oppenheimer",
    //     "Poor Things",
    //     "Society of the Snow",
    // ],
    // ["SCORE"]: [
    //     "American Fiction",
    //     "American Symphony",
    //     "Barbie",
    //     "The Boy and the Heron",
    //     "The Color Purple",
    //     "Elemental",
    //     "The Holdovers",
    //     "Indiana Jones and the Dial of Destiny",
    //     "Killers of the Flower Moon",
    //     "Oppenheimer",
    //     "Poor Things",
    //     "Saltburn",
    //     "Society of the Snow",
    //     "Spider-Man: Across the Spider-Verse",
    //     "The Zone of Interest",
    // ],
    ["SOUND"]: [
        "Barbie",
        "The Creator",
        "Ferrari",
        "The Killer",
        "Killers of the Flower Moon",
        "Maestro",
        "Mission: Impossible - Dead Reckoning Part One",
        "Napoleon",
        "Oppenheimer",
        "The Zone of Interest",
    ],
    // ["VISUAL_EFFECTS"]:[
    //     "The Creator",
    //     "Godzilla Minus One",
    //     "Guardians of the Galaxy Vol. 3",
    //     "Indiana Jones and the Dial of Destiny",
    //     "Mission: Impossible - Dead Reckoning Part One",
    //     "Napoleon",
    //     "Poor Things",
    //     "Rebel Moon - Part One: A Child of Fire",
    //     "Society of the Snow",
    //     "Spider-Man: Across the Spider-Verse",
    // ]
    // TODO: Song, because my titles just aren't gonna match
}

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

        for (const [categoryName, titles] of Object.entries(AMPAS_SHORTLISTED_TITLES)){
            // first, find the title by searching apidata
            for (const title of titles){
                const apiData = Object.values(allApiData).find((ad) => {
                    if (ad) {
                        if (typeof ad === 'object') {
                            // @ts-ignore
                            if (ad.title?.toLowerCase() === title.toLowerCase()) {
                                return true;
                            }
                        }
                    }
                    return false
                });
                if (!apiData) throw new Error(`Could not find apiData for ${title}`);
                console.log('apiData',apiData)

                // NOTE: The first time you run this, you might want to comment out the BELOW, just to make sure the "titles" work
                // @ts-ignore
                const movieTmdbId = apiData.tmdbId;
                console.log('5',categoryName)
                console.log('movieTmdbId',movieTmdbId)
                const contender = await mongodb.collection<Contender>('contenders').findOne({
                    movieTmdbId,
                    // @ts-ignore
                    category: categoryName,
                });
                console.log('6')
                if (!contender) throw new Error(`Could not find contender for ${title}`);
                console.log('7')
                await mongodb.collection<Contender>('contenders').updateOne({_id: contender._id}, {$set: {
                    // @ts-ignore
                    accolade: "SHORTLIST",
                }});
                console.log('8')
                console.log('done!')
            }
        }
    } catch (e){
        console.error(e);
    }
}
handler()