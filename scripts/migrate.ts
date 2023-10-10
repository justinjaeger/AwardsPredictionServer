import { ModifyResult, ObjectId } from "mongodb";
import { AttributeValue, ScanCommand, ScanCommandOutput } from "@aws-sdk/client-dynamodb";
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
import { ApiData, CategoryName, CategoryType, Contender, EventModel, PredictionSet, Relationship, User, iCategory, iRecentPrediction } from "types/mongoApi.ts";
import { amplifyCategoryNameToMongoCategoryName, amplifyCategoryTypeToMongoCategoryType, convertContender, convertEvent, convertMovie, convertPerson, convertPredictionSet, convertSong, convertUser } from "./helpers/conversions.ts";

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
 * What about OLD DUPLICATES???
 * - What I actually should do is run the deletion scripts first, then run this
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

/**
 * AFTER RUNNING:
 * - run updateTmdb script AND recordCommunityHistory scripts
 * 
 * DELETE THIS ONCE MIGRATION IS OVER!
 * - too risky to keep this around
 */
// NOTE: If last set of data was inaccurate, should delete all predictionsets before running
const getResId = (res:any): ObjectId => res.value?._id || res.lastErrorObject?.upserted;

async function handler() {
    console.log('STARTING...')
    const dynamodb = await connectDynamoDB();
    const mongodb = await connectMongoDB();

    // WARN: This would be terrible to run in production. Delete after first use!!!
    // DELETE OLD DATA:
    await mongodb.collection('relationships').deleteMany({});
    await mongodb.collection('users').deleteMany({});
    await mongodb.collection('contenders').deleteMany({});
    await mongodb.collection('apidata').deleteMany({});
    await mongodb.collection('predictionsets').deleteMany({});
    // await mongodb.collection('movies').deleteMany({});
    // await mongodb.collection('songs').deleteMany({});
    // await mongodb.collection('persons').deleteMany({});

    // mognodb test:
    // const a = await mongodb.collection('relationships').indexes();
    // console.log('done:', a)

    // DELETE AFTER USE:
    // create index on mongodb "apidata" collection
    // await mongodb.collection('apidata').dropIndex('year_1')
    // await mongodb.collection('apidata').createIndex({eventYear:1}, {unique:true})
    // console.log('dropping collection')
    // await mongodb.collection('contenders').dropIndex('eventId_1_category_1_movieId_1_personId_1_songId_1')
    // console.log('creating collection')
    // await mongodb.collection('contenders').createIndex({eventId:1, category: 1, movieTmdbId:1, personTmdbId: 1, songId: 1}, {unique:true})

    /**
     * NOTE: If the total size of scanned items exceeds the maximum dataset size limit of 1 MB, the scan completes and results are returned to the user.
     * This means we have to paginate so we don't miss any items
     */
    const getTableItems = async <AmplifyModel>(tableName: string) => {
        const result = [];
        let hasMoreScans = true;
        let ExclusiveStartKey: Record<string, AttributeValue> | undefined = undefined;
        //  If LastEvaluatedKey is present in the response, pagination is required to complete the full table scan.
        while (hasMoreScans) {
            const res: ScanCommandOutput = await dynamodb.send((new ScanCommand({ TableName: tableName, ExclusiveStartKey })));
            ExclusiveStartKey = res.LastEvaluatedKey;
            if (!ExclusiveStartKey) {
                hasMoreScans = false;
            }
            if (res.Items) {
                const formattedItems = res.Items.map((item)=>{
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
                result.push(...formattedItems);
            }
        }
        return result;
    }
    
    // get all dynamodb items
    console.log('fetching dynamodb items...')
    const userItems = await getTableItems<AmplifyUser>(userTable)
    const relationshipItems = await getTableItems<AmplifyRelationship>(relationshipTable) // 4620, actually 6,232
    const categoryItems = await getTableItems<AmplifyCategory>(categoryTable)
    const eventItems = await getTableItems<AmplifyEvent>(eventTable)
    const movieItems = await getTableItems<AmplifyMovie>(movieTable)
    const personItems = await getTableItems<AmplifyPerson>(personTable)
    const songItems = await getTableItems<AmplifySong>(songTable)
    const contenderItems = await getTableItems<AmplifyContender>(contenderTable) // 977, correct
    const predictionItems = await getTableItems<AmplifyPrediction>(predictionTable) // TODO: this says 4540 items but it's actually 99,875 items
    const predictionSetItems = await getTableItems<AmplifyPredictionSet>(predictionSetTable) // 3856 but is actually 12,274

    // CATEGORIES
    const amplifyEventIdToMongoCategories: {[amplifyEventId: string]: Record<CategoryName, iCategory>} = {};
    const amplifyCategoryIdToCategory: {[amplifyCategoryId: string]: { type: CategoryType, name: CategoryName }} = {};
    for (const amplifyCategory of categoryItems) {
        if (!amplifyEventIdToMongoCategories[amplifyCategory.eventId]) {
            //@ts-ignore - allow categories to be partially filled out
            amplifyEventIdToMongoCategories[amplifyCategory.eventId] = {}
        }
        const type = amplifyCategoryTypeToMongoCategoryType(amplifyCategory.type);
        const name = amplifyCategoryNameToMongoCategoryName(amplifyCategory.name);
        amplifyEventIdToMongoCategories[amplifyCategory.eventId][name] = {
            type,
            name,
        };
        amplifyCategoryIdToCategory[amplifyCategory.id] = {
            type,
            name: amplifyCategoryNameToMongoCategoryName(amplifyCategory.name),
        };
    }

    // console.log('amplifyEventIdToMongoCategories',amplifyEventIdToMongoCategories)

    const amplifyEventIdToMongoEventId: {[amplifyEventId: string]: ObjectId} = {};
    const amplifyEventIdToMongoEvent: {[amplifyEventId: string]: EventModel} = {};

    // EVENTS
    for (const amplifyEvent of eventItems) {
        const amplify_id = amplifyEvent.id;
        const mongoEvent: EventModel = {
            ...convertEvent(amplifyEvent),
            categories: amplifyEventIdToMongoCategories[amplify_id],
        };
        const res = await mongodb.collection<EventModel>('events').findOneAndUpdate(
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

    // USERS (part one)
    const userReqs: Promise<ModifyResult<User>>[] = [];
    for (const amplifyUser of userItems) {
        const mongoUser = convertUser(amplifyUser);
        const amplify_id = amplifyUser.id;

        userReqs.push(
            mongodb.collection<User>('users').findOneAndUpdate(
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
    const relationshipReqs: Promise<ModifyResult<Relationship>>[] = [];
    // to help not push duplicates:
    const seenRelationships: {[key: string]: boolean} = {};
    for (const amplifyRelationship of relationshipItems) {
        const amplify_id = amplifyRelationship.id;
        const amplifyFollowingUserId = amplifyRelationship.followingUserId;
        const amplifyFollowedUserId = amplifyRelationship.followedUserId;
        if (seenRelationships[`${amplifyFollowingUserId}-${amplifyFollowedUserId}`]) {
            console.log('duplicate relationship found', amplifyRelationship)
            continue;
        } 
        seenRelationships[`${amplifyFollowingUserId}-${amplifyFollowedUserId}`] = true;
        relationshipReqs.push(
            mongodb.collection<Relationship>('relationships').findOneAndUpdate(
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
    
    // This is also to ANY KEY including songs
    const amplifyMoviePersonOrSongToTmdbId: {[amplifyId: string]: string} = {};
    // const mongoMovieIdToAmplifyMovieId: {[mongoId: string]: string} = {};
    const amplifyIdToTmdbId: {[amplifyId: string]: string} = {};

    const getSongKey = (movieTmdbId:number, title:string)=>`${movieTmdbId}-${title}`;

    // NOTE: this would not work if there were multiple events/years
    const eventYear = Object.values(amplifyEventIdToMongoEvent)[0].year;
    const apiData: ApiData = { eventYear };

    // MOVIES
    for (const amplifyMovie of movieItems) {
        // @ts-ignore - weird bug when I use CategoryType, so I'm doing just the strings
        apiData[amplifyMovie.tmdbId] = {...convertMovie(amplifyMovie), type: 'FILM'};
        amplifyIdToTmdbId[amplifyMovie.id] = amplifyMovie.tmdbId.toString();
        amplifyMoviePersonOrSongToTmdbId[amplifyMovie.id] = amplifyMovie.tmdbId.toString();
    }

    // PERSONS
    for (const amplifyPerson of personItems) {
        // @ts-ignore - weird bug when I use CategoryType, so I'm doing just the strings
        apiData[amplifyPerson.tmdbId] = {...convertPerson(amplifyPerson), type: 'PERFORMANCE'};
        amplifyMoviePersonOrSongToTmdbId[amplifyPerson.id] = amplifyPerson.tmdbId.toString();
    }
    // SONGS
    for (const amplifySong of songItems) {
        const tmdbId = parseInt(amplifyIdToTmdbId[amplifySong.movieId]);
        const key = getSongKey(tmdbId, amplifySong.title);
        // @ts-ignore - weird bug when I use CategoryType, so I'm doing just the strings
        apiData[key] = {...convertSong(amplifySong, tmdbId), type: 'SONG'};
        amplifyMoviePersonOrSongToTmdbId[amplifySong.id] = key;
    }

    // INSERT API DATA
    // we know this works ONLY because there is JUST ONE event
    // when we insert api data in future, we have to make sure to insert them into the correct year
    console.log('inserting api data...')
    await mongodb.collection<ApiData>('apidata').findOneAndUpdate(
        { eventYear },
        { $set: apiData },
        { upsert: true }
    )
    console.log('done inserting api data')


    // CONTENDERS
    const amplifyContenderIdToMongoContenderId: {[amplifyContenderId: string]: ObjectId} = {};
    const amplifyContenderIdToMongoContender: {[amplifyContenderId: string]: Contender} = {};
    const contenderReqs: Promise<ModifyResult<Contender>>[] = [];
    for (const amplifyContender of contenderItems) {
        const amplify_id = amplifyContender.id;
        const movieTmdbId = parseInt(amplifyMoviePersonOrSongToTmdbId[amplifyContender.movieId]);
        const mongoEventId = amplifyEventIdToMongoEventId[amplifyContender.eventId];
        const categoryName = amplifyCategoryIdToCategory[amplifyContender.categoryId].name;
        const songId = amplifyContender.songId && amplifyMoviePersonOrSongToTmdbId[amplifyContender.songId] || undefined;
        const personTmdbId = amplifyContender.personId && parseInt(amplifyMoviePersonOrSongToTmdbId[amplifyContender.personId]) || undefined;
        const mongoContender = convertContender(amplifyContender, mongoEventId, categoryName, movieTmdbId, personTmdbId, songId);
        contenderReqs.push(
            mongodb.collection<Contender>('contenders').findOneAndUpdate(
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

        const amplifyIdToMongoPredictionSet: {[amplifyId: string]: PredictionSet} = {};
        const predictionSetReqs: Promise<ModifyResult<PredictionSet> | void>[] = [];
        for (const amplifyUser of userItems) {
            const amplifyUserId = amplifyUser.id;
            const mongoDbUserId = amplifyUserIdToData[amplifyUserId].mongoId;
            // get predictionsets where userId and eventId match
            const filteredPredictionSets = predictionSetItems.filter((predictionSet)=>predictionSet.eventId === amplifyEventId && predictionSet.userId === amplifyUserId);
            if (filteredPredictionSets.length === 0) {
                // create a bogus promise so that the below loop doesn't break - we need the index to match
                predictionSetReqs.push(Promise.resolve())
                continue;
            };
            const mongoDbPredictionSet = convertPredictionSet(
                filteredPredictionSets,
                predictionItems,
                mongoDbUserId,
                mongoDbEventId,
                amplifyCategoryIdToCategory,
                amplifyContenderIdToMongoContenderId,
                amplifyContenderIdToMongoContender,
            );
            // keep in mind: we just recorded these yesterday, so they won't match today.
            // and yesterday's were broken.
            // So we should delete all in the table, before running this again
            predictionSetReqs.push(
                mongodb.collection<PredictionSet>('predictionsets').findOneAndUpdate(
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
            if (!res) continue; // because some promises are bogus
            const amplifyUserId = userItems[i].id;
            const mongoDbUserId = amplifyUserIdToData[amplifyUserId].mongoId;
            const predictionSetId = getResId(res);
            const mongoDbPredictionSet = amplifyIdToMongoPredictionSet[amplifyUserId];
            const iterableCategories = Object.entries(mongoDbPredictionSet.categories);
            // NOTE: this should be, most recent at the FRONT, least at the BACK
            iterableCategories.sort(([,p1], [,p2]) => p2.createdAt.getTime() - p1.createdAt.getTime());
            const fiveMostRecentPredictions: iRecentPrediction[] = iterableCategories.slice(0,5).map(([categoryName, category])=>{
                const { awardsBody, year } = amplifyEventIdToMongoEvent[amplifyEventId];
                return {
                    awardsBody,
                    year,
                    category: categoryName,
                    predictionSetId,
                    createdAt: category.createdAt,
                    // NOTE: this should be, highest ranked at the FRONT, least at the BACK
                    topPredictions: category.predictions.sort((a, b) => a.ranking - b.ranking).slice(0,5),
                }
            })
            const eventsPredicting = fiveMostRecentPredictions.length > 0 ? [mongoDbEventId] : [];
            const followingCount = amplifyUserIdToData[amplifyUserId].followingCount;
            const followerCount = amplifyUserIdToData[amplifyUserId].followerCount;
            userNestedFieldReqs.push(
                mongodb.collection<User>('users').updateOne(
                    { _id: mongoDbUserId },
                    { $set: { 
                        recentPredictionSets: fiveMostRecentPredictions,
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