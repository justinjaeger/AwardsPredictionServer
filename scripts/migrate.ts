import { ModifyResult, ObjectId } from "mongodb";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { 
    AmplifyCategory, 
    AmplifyContender, 
    AmplifyEvent, 
    AmplifyMovie, 
    AmplifyPerson, 
    AmplifyPrediction, 
    AmplifyPredictionSet, 
    AmplifyRelationship, 
    AmplifySong, 
    AmplifyUser,
} from "./types/amplifyApi.ts";
import connectDynamoDB from "./helpers/connectDynamoDB.ts";
import connectMongoDB from "./helpers/connectMongoDB.ts";
import { amplifyCategoryNameToMongoCategoryName, amplifyCategoryTypeToMongoCategoryType, convertContender, convertEvent, convertMovie, convertPerson, convertPredictionSet, convertSong, convertUser } from "./helpers/conversions.ts";
import { CategoryName, CategoryType, MongoContender, MongoEventModel, MongoMovie, MongoPerson, MongoPredictionSet, MongoRelationship, MongoSong, MongoUser, iMongoCategories, iRecentPredictions } from "types/mongoApi.ts";

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
 * 
 * What about IMAGES??
 * - I actually don't know. People might just have to upload new images. And I need a new service
 * - Or we could just use aws still and do it the manual way
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

// Id is going to be in a different place depending on if it updated or created
const getResId = (res:any): ObjectId => res.value?._id || res.lastErrorObject?.upserted;

async function handler() {
    const dynamodb = await connectDynamoDB();
    const mongodb = await connectMongoDB();

    // mognodb test:
    // const a = await mongodb.collection('relationships').indexes();
    // console.log('done:', a)

    const getTableItems = async <AmplifyModel>(tableName: string) => {
        //@ts-ignore
        return (await dynamodb.send((new ScanCommand({ TableName: tableName })))).Items
            .map((item)=>{
                const itemKeys = Object.keys(item);
                const itemValues = Object.values(item);
                const itemEntries = itemKeys.map((key, index)=>{
                    const val = itemValues[index];
                    //@ts-ignore
                    const str = val.S;
                    //@ts-ignore
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
    const categoryItems = await getTableItems<AmplifyCategory>(categoryTable)
    const eventItems = await getTableItems<AmplifyEvent>(eventTable)
    const movieItems = await getTableItems<AmplifyMovie>(movieTable)
    const personItems = await getTableItems<AmplifyPerson>(personTable)
    const songItems = await getTableItems<AmplifySong>(songTable)
    const contenderItems = await getTableItems<AmplifyContender>(contenderTable)
    const predictionItems = await getTableItems<AmplifyPrediction>(predictionTable)
    const predictionSetItems = await getTableItems<AmplifyPredictionSet>(predictionSetTable)

    // CATEGORIES
    const amplifyEventIdToMongoCategories: {[amplifyEventId: string]: iMongoCategories} = {};
    const amplifyCategoryIdToCategory: {[amplifyCategoryId: string]: { type: CategoryType, name: CategoryName }} = {};
    for (const amplifyCategory of categoryItems) {
        if (!amplifyEventIdToMongoCategories[amplifyCategory.eventId]) {
            //@ts-ignore - allow categories to be partially filled out
            amplifyEventIdToMongoCategories[amplifyCategory.eventId] = {}
        }const type = amplifyCategoryTypeToMongoCategoryType(amplifyCategory.type);
        amplifyEventIdToMongoCategories[amplifyCategory.eventId][amplifyCategory.name] = {
            type,
        };
        amplifyCategoryIdToCategory[amplifyCategory.id] = {
            type,
            name: amplifyCategoryNameToMongoCategoryName(amplifyCategory.name),
        };
    }

    // console.log('amplifyEventIdToMongoCategories',amplifyEventIdToMongoCategories)

    const amplifyEventIdToMongoEventId: {[amplifyEventId: string]: ObjectId} = {};
    const amplifyEventIdToMongoEvent: {[amplifyEventId: string]: MongoEventModel} = {};

    // EVENTS
    for (const amplifyEvent of eventItems) {
        const amplify_id = amplifyEvent.id;
        const mongoEvent = {
            ...convertEvent(amplifyEvent),
            categories: amplifyEventIdToMongoCategories[amplify_id],
        };
        const res = await mongodb.collection<MongoEventModel>('events').findOneAndUpdate(
            { amplify_id },
            { $set: mongoEvent },
            { upsert: true }
        )
        amplifyEventIdToMongoEventId[amplify_id] = getResId(res);
        amplifyEventIdToMongoEvent[amplify_id] = mongoEvent;
    }

    // console.log('amplifyEventIdToMongoEventId', amplifyEventIdToMongoEventId)


    const amplifyUserIdToData: {[amplifyId: string]: {
        mongoId: ObjectId,
        followingCount: number,
        followerCount: number,
    }} = {};

    // INDEX TESTS:
    // for (let i=0; i<1; i++) {
    //     const amplifyUser = userItems[i];
    //     const mongoUser = convertUser(amplifyUser);
    //     const amplify_id = amplifyUser.id;
    //     const res = await mongodb.collection('users').createIndex({oauthId:1}, {unique:true, partialFilterExpression: {oauthId:{$exists: true}}})
    //     // const res = await mongodb.collection<MongoUser>('users').find({amplify_id}).explain()
    //     // const res = await mongodb.collection<MongoUser>('users').find({$text:{$search:'justin'}}).explain();
    //     // const res = await mongodb.collection('users').createIndex({name: 'text', username: 'text'});
    //     console.log('res',res)
    // }

    // USERS (part one)
    const userReqs: Promise<ModifyResult<MongoUser>>[] = [];
    for (const amplifyUser of userItems) {
        const mongoUser = convertUser(amplifyUser);
        const amplify_id = amplifyUser.id;

        userReqs.push(
            mongodb.collection<MongoUser>('users').findOneAndUpdate(
                { amplify_id },
                { $set: mongoUser },
                { upsert: true }
            )
        );
    }
    console.log('inserting users...')
    const userRes = await Promise.all(userReqs);
    console.log('done inserting users.')
    for (let i in userRes) {
        const res = userRes[i];
        const amplify_id = userItems[i].id;
        const mongoId = getResId(res);
        amplifyUserIdToData[amplify_id] = {
            mongoId,
            followingCount: 0,
            followerCount: 0,
        };
    }

    // RELATIONSHIPS
    const relationshipReqs: Promise<ModifyResult<MongoRelationship>>[] = [];
    for (const amplifyRelationship of relationshipItems) {
        const amplify_id = amplifyRelationship.id;
        const amplifyFollowingUserId = amplifyRelationship.followingUserId;
        const amplifyFollowedUserId = amplifyRelationship.followedUserId;
        relationshipReqs.push(
            mongodb.collection<MongoRelationship>('relationships').findOneAndUpdate(
                { amplify_id },
                { $set: {
                    followingUserId: amplifyUserIdToData[amplifyFollowingUserId].mongoId,
                    followedUserId: amplifyUserIdToData[amplifyFollowedUserId].mongoId,
                } },
                { upsert: true }
            )
        )
        amplifyUserIdToData[amplifyFollowingUserId].followingCount += 1;
        amplifyUserIdToData[amplifyFollowedUserId].followerCount += 1;
    }
    console.log('inserting relationships...')
    await Promise.all(relationshipReqs);
    console.log('done inserting relationships.')

    // console.log('amplifyIdToMongoId', amplifyUserIdToData) // this logs
    
    const amplifyMoviePersonOrSongToMongoId: {[amplifyId: string]: ObjectId} = {};

    // MOVIES
    const movieReqs: Promise<ModifyResult<MongoMovie>>[] = [];
    for (const amplifyMovie of movieItems) {
        const amplify_id = amplifyMovie.id;
        movieReqs.push(
            mongodb.collection<MongoMovie>('movies').findOneAndUpdate(
                { amplify_id },
                { $set: convertMovie(amplifyMovie) },
                { upsert: true }
            )
        )
    }
    console.log('inserting movies...')
    const movieRes = await Promise.all(movieReqs);
    console.log('done inserting movies.')
    for (let i in movieRes) {
        const res = movieRes[i];
        const amplify_id = movieItems[i].id;
        amplifyMoviePersonOrSongToMongoId[amplify_id] = getResId(res);
    }

    // PERSONS
    const personReqs: Promise<ModifyResult<MongoPerson>>[] = [];
    for (const amplifyPerson of personItems) {
        const amplify_id = amplifyPerson.id;
        personReqs.push(
            mongodb.collection<MongoPerson>('persons').findOneAndUpdate(
                { amplify_id },
                { $set: convertPerson(amplifyPerson) },
                { upsert: true }
            )
        )
    }
    console.log('inserting persons...')
    const personRes = await Promise.all(personReqs);
    console.log('done inserting persons.')
    for (let i in personRes) {
        const res = personRes[i];
        const amplify_id = personItems[i].id;
        amplifyMoviePersonOrSongToMongoId[amplify_id] = getResId(res);
    }

    // SONGS
    const songReqs: Promise<ModifyResult<MongoSong>>[] = [];
    for (const amplifySong of songItems) {
        const amplify_id = amplifySong.id;
        const mongoMovieId = amplifyMoviePersonOrSongToMongoId[amplifySong.movieId];
        songReqs.push(
            mongodb.collection<MongoSong>('songs').findOneAndUpdate(
                { amplify_id },
                { $set: convertSong(amplifySong, mongoMovieId) },
                { upsert: true }
            )
        )
    }
    console.log('inserting songs...')
    const songRes = await Promise.all(songReqs);
    console.log('done inserting songs.')
    for (let i in songRes) {
        const res = songRes[i];
        const amplify_id = songItems[i].id;
        amplifyMoviePersonOrSongToMongoId[amplify_id] = getResId(res);
    }

    // CONTENDERS
    const amplifyContenderIdToMongoContenderId: {[amplifyContenderId: string]: ObjectId} = {};
    const amplifyContenderIdToMongoContender: {[amplifyContenderId: string]: MongoContender} = {};
    const contenderReqs: Promise<ModifyResult<MongoContender>>[] = [];
    for (const amplifyContender of contenderItems) {
        const amplify_id = amplifyContender.id;
        const mongoMovieId = amplifyMoviePersonOrSongToMongoId[amplifyContender.movieId];
        const mongoEventId = amplifyEventIdToMongoEventId[amplifyContender.eventId];
        const categoryName = amplifyCategoryIdToCategory[amplifyContender.categoryId].name;
        const songId = amplifyContender.songId && amplifyMoviePersonOrSongToMongoId[amplifyContender.songId] || undefined;
        const personId = amplifyContender.personId && amplifyMoviePersonOrSongToMongoId[amplifyContender.personId] || undefined;
        const mongoContender = convertContender(amplifyContender, mongoMovieId, mongoEventId, categoryName, songId, personId);
        contenderReqs.push(
            mongodb.collection<MongoContender>('contenders').findOneAndUpdate(
                { amplify_id },
                { $set: mongoContender },
                { upsert: true }
            )
        )
        amplifyContenderIdToMongoContender[amplify_id] = mongoContender;
    }
    console.log('inserting contenders...')
    const contenderRes = await Promise.all(contenderReqs);
    console.log('done inserting contenders.')
    for (let i in contenderRes) {
        const res = contenderRes[i];
        const amplify_id = contenderItems[i].id;
        amplifyContenderIdToMongoContenderId[amplify_id] = getResId(res);
    }

    // PREDICTIONSETS
    // First, loop through events
    // Then, loop through users
    // For each combination, filter the prediction sets, then pass that info into convertPredictionSet
    // Then, upsert that prediction set
    // As we go, update the user's prediction set list
    for (const amplifyEvent of eventItems) {
        const amplifyEventId = amplifyEvent.id;
        const mongoDbEventId = amplifyEventIdToMongoEventId[amplifyEvent.id];

        const amplifyIdToMongoPredictionSet: {[amplifyId: string]: MongoPredictionSet} = {};
        const predictionSetReqs: Promise<ModifyResult<MongoPredictionSet>>[] = [];
        for (const amplifyUser of userItems) {
            const amplifyUserId = amplifyUser.id;
            const mongoDbUserId = amplifyUserIdToData[amplifyUserId].mongoId;
            const filteredPredictionSets = predictionSetItems.filter((predictionSet)=>predictionSet.eventId === amplifyEventId && predictionSet.userId === amplifyUserId);
            const filteredPredictionSetIds = filteredPredictionSets.map((predictionSet)=>predictionSet.id);
            const filteredPredictions = predictionItems.filter((prediction)=>filteredPredictionSetIds.includes(prediction.predictionSetId));
            const mongoDbPredictionSet = convertPredictionSet(
                filteredPredictionSets,
                filteredPredictions,
                mongoDbUserId,
                mongoDbEventId,
                amplifyCategoryIdToCategory,
                amplifyContenderIdToMongoContenderId,
                amplifyContenderIdToMongoContender,
            );
            predictionSetReqs.push(
                mongodb.collection<MongoPredictionSet>('predictionsets').findOneAndUpdate(
                    { userId: mongoDbUserId, eventId: mongoDbEventId, yyyymmdd: mongoDbPredictionSet.yyyymmdd },
                    { $set: mongoDbPredictionSet },
                    { upsert: true }
                )
            )
            amplifyIdToMongoPredictionSet[amplifyUserId] = mongoDbPredictionSet;
        }
        console.log('inserting predictionsets...')
        const predictionSetRes = await Promise.all(predictionSetReqs);
        console.log('done inserting predictionsets.')
        const userNestedFieldReqs = [];
        for (let i in predictionSetRes) {
            const res = predictionSetRes[i];
            const amplifyUserId = userItems[i].id;
            const mongoDbUserId = amplifyUserIdToData[amplifyUserId].mongoId;
            const predictionSetId = getResId(res);
            const mongoDbPredictionSet = amplifyIdToMongoPredictionSet[amplifyUserId];
            const iterableCategories = Object.entries(mongoDbPredictionSet.categories);
            iterableCategories.sort(([,p1], [,p2])=>p1.createdAt.getTime() - p2.createdAt.getTime());
            const fiveMostRecentPredictions: iRecentPredictions = iterableCategories.slice(0,5).map(([categoryName, category])=>{
                const { awardsBody, year } = amplifyEventIdToMongoEvent[amplifyEventId];
                return {
                    awardsBody,
                    year,
                    category: categoryName,
                    predictionSetId,
                    createdAt: category.createdAt,
                    topPredictions: category.predictions.slice(0,5),
                }
            })
            const eventsPredicting = fiveMostRecentPredictions.length > 0 ? [mongoDbEventId] : [];
            const followingCount = amplifyUserIdToData[amplifyUserId].followingCount;
            const followerCount = amplifyUserIdToData[amplifyUserId].followerCount;
            userNestedFieldReqs.push(
                mongodb.collection<MongoUser>('users').updateOne(
                    { _id: mongoDbUserId },
                    { $set: { 
                        recentPredictions: fiveMostRecentPredictions,
                        eventsPredicting,
                        followingCount,
                        followerCount,
                    }}
                )
            )
        }
        console.log('updating user nested fields...')
        await Promise.all(userNestedFieldReqs);
        console.log('done updating user nested fields.')
    }

    console.log('all done!')
}

handler();