import { ObjectId } from "mongodb";
import { AmplifyAwardsBody, AmplifyCategoryName, AmplifyCategoryType, AmplifyContender, AmplifyContenderVisibility, AmplifyEvent, AmplifyEventStatus, AmplifyMovie, AmplifyPerson, AmplifyPrediction, AmplifyPredictionSet, AmplifySong, AmplifyUser, AmplifyUserRole } from "../types/amplifyApi.ts";
import { AwardsBody, CategoryName, CategoryType, EventStatus, MongoContender, MongoEventModel, MongoMovie, MongoPredictionSet, MongoRelationship, MongoSong, MongoUser, UserRole, iCategoryPrediction } from "../types/mongoApi.ts";

export const amplifyRoleToMongoRole = (role: AmplifyUserRole): UserRole => {
    switch (role) {
        case AmplifyUserRole.ADMIN:
            return UserRole.ADMIN;
        case AmplifyUserRole.TESTER:
            return UserRole.TESTER;
        default:
            return UserRole.USER;
    }
}

export const amplifyAwardsBodyToMongoAwardsBody = (awardsBody: AmplifyAwardsBody): AwardsBody => {
    return AwardsBody[awardsBody];
}
export const amplifyEventStatusToMongoEventStatus = (status: AmplifyEventStatus): EventStatus => {
    return EventStatus[status];
}

export const amplifyCategoryTypeToMongoCategoryType = (type: AmplifyCategoryType): CategoryType => {
    return CategoryType[type];
}
export const amplifyCategoryNameToMongoCategoryName = (type: AmplifyCategoryName): CategoryName => {
    return CategoryName[type];
}



// I have to create user FIRST, so how am I going to get the predictionsets first? It's circular
export const convertUser = (
    user: AmplifyUser,
    // followingCount: number,
    // followerCount: number,
    // recentPredictionSets: iRecentPredictions,
    // eventsPredicting: typeof ObjectId[]
): MongoUser => {
    return {
        amplify_id: user.id,
        email: user.email,
        name: user.name || undefined,
        username: user.username || undefined,
        role: amplifyRoleToMongoRole(user.role),
        image: user.image ?? undefined,
        bio: user.bio || undefined,
        // followingCount,
        // followerCount,
        // recentPredictionSets,
        // eventsPredicting,
    }
}

export const convertRelationship = (
    amplifyRelationshipId: string,
    mongoFollowedUserId: ObjectId, // have to get this first
    mongoFollowingUserId: ObjectId

): MongoRelationship => {
    return {
        amplify_id: amplifyRelationshipId,
        followedUserId: mongoFollowedUserId,
        followingUserId: mongoFollowingUserId,
    }
}

export const convertEvent = (
    amplifyEvent: AmplifyEvent,
): MongoEventModel => {
    return {
        amplify_id: amplifyEvent.id,
        awardsBody: amplifyAwardsBodyToMongoAwardsBody(amplifyEvent.awardsBody),
        year: amplifyEvent.year,
        status: amplifyEvent.status ? amplifyEventStatusToMongoEventStatus(amplifyEvent.status) : EventStatus.NOMS_STAGING,
        liveAt: amplifyEvent.liveAt ? new Date(amplifyEvent.liveAt) : undefined,
        nomDateTime: undefined,
        winDateTime: undefined,
        // @ts-ignore - no categories to begin with
        categories: {},
    }
}


// Movie, Person, the cron func fills in the rest of the info
export const convertMovie = (
    amplifyMovie: AmplifyMovie,
): MongoMovie => {
    return {
        amplify_id: amplifyMovie.id,
        tmdbId: amplifyMovie.tmdbId,
        // @ts-ignore - nothing to begin with
        categoryCredits: {},
    }
}
export const convertPerson = (
    amplifyPerson: AmplifyPerson,
): MongoMovie => {
    return {
        amplify_id: amplifyPerson.id,
        tmdbId: amplifyPerson.tmdbId,
        // @ts-ignore - nothing to begin with
        categoryCredits: {},
    }
}
// Must be done after Movie
export const convertSong = (
    amplifySong: AmplifySong,
    mongoMovieId: ObjectId,
): MongoSong => {
    return {
        amplify_id: amplifySong.id,
        title: amplifySong.title,
        movieId: mongoMovieId,
    }
}


export const convertContender = (
    amplifyContender: AmplifyContender,
    mongoMovieId: ObjectId,
    mongoEventId: ObjectId,
    categoryName: CategoryName,
    songId?: ObjectId,
    personId?: ObjectId,
): MongoContender => {
    const isHidden = amplifyContender.visibility === AmplifyContenderVisibility.HIDDEN ? true : false;
    return {
        amplify_id: amplifyContender.id,
        movieId: mongoMovieId,
        eventId: mongoEventId,
        category: categoryName,
        isHidden,
        songId,
        personId,
    }
}

export const dateToYyyymmdd = (date: Date) => {
  return parseInt(
    `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
  );
};

// How can we get the user's 5 most recent predictionsets from this? we use the createdAt field
export const convertPredictionSet = (
    amplifyPredictionSets: AmplifyPredictionSet[],
    amplifyPredictions: AmplifyPrediction[],
    mongoUserId: ObjectId,
    mongoEventId: ObjectId,
    amplifyCategoryIdToCategory: {[amplifyCategoryId: string]: { type: CategoryType, name: CategoryName }},
    amplifyContenderIdToMongoContenderId: {[amplifyContenderId: string]: ObjectId},
    amplifyContenderIdToMongoContender: {[amplifyContenderId: string]: MongoContender},
): MongoPredictionSet => {
    let latestYyyymmdd = 0;
    const categories = amplifyPredictionSets.reduce((acc, predictionSet)=>{
        const yyyymmdd = dateToYyyymmdd(new Date(predictionSet.createdAt));
        latestYyyymmdd = Math.max(latestYyyymmdd, yyyymmdd);
        const { name, type } = amplifyCategoryIdToCategory[predictionSet.categoryId];
        const predictionsInPredictionSet = amplifyPredictions.filter(prediction=>prediction.predictionSetId === predictionSet.id);
        const predictions = predictionsInPredictionSet.map((prediction)=>{
            return {
                contenderId: amplifyContenderIdToMongoContenderId[prediction.contenderId],
                ranking: prediction.ranking,
                movieId: amplifyContenderIdToMongoContender[prediction.contenderId].movieId,
                personId: amplifyContenderIdToMongoContender[prediction.contenderId].personId,
                songId: amplifyContenderIdToMongoContender[prediction.contenderId].songId,
            }
        })
        acc[name] = {
            type: type,
            createdAt: new Date(predictionSet.createdAt),
            predictions,
        }
        return acc;
    }, {} as {[key in CategoryName]: iCategoryPrediction})
    return {
        // amplify_id: amplifyPredictionSets.id, // can't do it; 23 predictionsets therein
        userId: mongoUserId,
        eventId: mongoEventId,
        yyyymmdd: latestYyyymmdd,
        categories,
    };
}

