//@ts-nocheck
const { 
    AmplifyCategory, 
    AmplifyContender, 
    AmplifyMovie, 
    AmplifyPerson, 
    AmplifyPrediction, 
    AmplifyPredictionSet, 
    AmplifyRelationship, 
    AmplifySong, 
    AmplifyUser,
} = require("./types/amplifyApi");

const dotenv = require('dotenv');
dotenv.config();
const { ObjectId } = require("mongodb");
const { ScanCommand } = require("@aws-sdk/client-dynamodb");
// @ts-ignore
const connectDynamoDB = require("./helpers/connectDynamoDB.ts");
const connectMongoDB = require("./helpers/connectMongoDB.ts");

/**
 * Documentation, all dynamodb commands:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
 */

// interface User {
//     _id: ObjectId;
//     name: string;
// }

/**
 * THE PLAN
 * I'm going to copy over tables from aws to mongodb
 * user -> users
 * relationship -> relationships
 * event/category -> events
 * predictionSet/prediction -> predictionSets
 * contender -> contenders
 * movie -> movies
 * person -> people
 * song -> songs
 * - for movie/person those can be filled out with their own cron func as long as tmdbId is there
 * 
 * categoryupdatelogs
 * - doesn't correspond to anything
 * - but since it's for history/calendar, just let it be blank for now. Then when users go and predict it will get filled out
 * 
 * Do not copy over any history.
 * Not even the community predictions.
 * - The cron func should just generate that for us based on current user predictions
 * 
 * DOING RELATIONSHIPS
 * - I might make a legacy_id field on each table so that I can keep track of what was migrated
 * - I may also have to create an object that associates previous id with new ids
 * - Take users for example. I'm going to put all the new user info into mongodb.
 * but the id is going to be unique and new, and after creating, I'll have to harness it.
 * In the future, the old id can reference the new id.
 * Then, when it comes to relationship, I'll have to do a lookup, what was the old id and what's its' new id? Then create the relationship like that.
 * - What about prediction sets? Those exist in a few different places, and write to a few different tables.
 * I'll just create the predictionset, then I'll go back and add to that user field by referencing the old id.
 * 
 * How I can run this multiple times
 * - It won't create the thing if the same values already exist
 * - but what if a user changes their name n stuff?
 * - We have to use their ID and read from the MONGODB tables, and see does a user exist who has this aws_id?
 * - If so, update their data, don't create new data.
 * - Should enable us to run as many times as we want without overwriting data.
 * - Maybe there's some "check if exists and update" func we can write?
 * 
 * What about OLD DUPLICATES???
 * - I'm def gonna need to elimnate them during this migration,
 * - but what I actually should do is run the deletion scripts first, then run this
 * - if a duplicate comes up, Mongodb unique indexes should catch it, then we can go and run that amplify script
 */

const userTable = "User-jrjijr2sgbhldoizdkwwstdpn4-prod"
const relationshipTable = 'Relationship-jrjijr2sgbhldoizdkwwstdpn4-prod'
const eventTable = 'Event-jrjijr2sgbhldoizdkwwstdpn4-prod'
const categoryTable = "Category-jrjijr2sgbhldoizdkwwstdpn4-prod"
const contenderTable = 'Contender-jrjijr2sgbhldoizdkwwstdpn4-prod'
const movieTable = 'Movie-jrjijr2sgbhldoizdkwwstdpn4-prod'
const personTable = 'Person-jrjijr2sgbhldoizdkwwstdpn4-prod'
const songTable = 'Song-jrjijr2sgbhldoizdkwwstdpn4-prod'
const predictionTable = 'Prediction-jrjijr2sgbhldoizdkwwstdpn4-prod'
const predictionSetTable = 'PredictionSet-jrjijr2sgbhldoizdkwwstdpn4-prod'

async function handler() {
    const dynamodb = await connectDynamoDB();
    const mongodb = await connectMongoDB();

    const getTableItems = async <AmplifyModel>(tableName: string) =>{
        return (await dynamodb.send((new ScanCommand({ TableName: tableName })))).Items
            .map((item)=>{
                const itemKeys = Object.keys(item);
                const itemValues = Object.values(item);
                const itemEntries = itemKeys.map((key, index)=>{
                    const val = itemValues[index];
                    const str = val.S;
                    const number = Number(val.N);
                    if (str === 'TRUE') return [key, true];
                    if (str === 'FALSE') return [key, false];
                    return [key, (number || str)];
                })
                return Object.fromEntries(itemEntries);
            }) as AmplifyModel[];
    }
    
    // get all dynamodb items
    const userItems = await getTableItems<AmplifyUser>(userTable)
    const relationshipItems = await getTableItems<AmplifyRelationship>(relationshipTable)
    const eventItems = await getTableItems<AmplifyUser>(eventTable)
    const categoryItems = await getTableItems<AmplifyCategory>(categoryTable)
    const contenderItems = await getTableItems<AmplifyContender>(contenderTable)
    const movieItems = await getTableItems<AmplifyMovie>(movieTable)
    const personItems = await getTableItems<AmplifyPerson>(personTable)
    const songItems = await getTableItems<AmplifySong>(songTable)
    const predictionItems = await getTableItems<AmplifyPrediction>(predictionTable)
    const predictionSetItems = await getTableItems<AmplifyPredictionSet>(predictionSetTable)
    console.log(contenderItems[0])

    // const users = mongodb.collection<User>("users");
    // const result = await users.find({}).toArray();
    // console.log('mongodb', result)

    // const a = await mongodb
    //   .collection('test').indexes();
    //   console.log('a',a)


    // const searchRes = await mongodb
    //   .collection('test')
    //   .find({ $text: { $search: 'hi' } }).toArray();
    // console.log('searchRes', searchRes);
}

handler();