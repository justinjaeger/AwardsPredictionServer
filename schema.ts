import { ObjectId } from 'mongodb';

type User = {
    _id: ObjectId;
    email: string; // required AND unique
    oauthId: string; // INDEXED
    // email: String!
    //     @index(name: "userByEmail", queryField: "userByEmail") # UNIQUE
    // oauthId: String
    //     @index(name: "userByOauthId", queryField: "userByOauthId") # UNIQUE
    // username: String
    //     @index(name: "userByUsername", queryField: "userByUsername") # UNIQUE
    // name: String
    // bio: String
    // image: String
    // role: UserRole! @default(value: "USER")
    // predictionSets: [PredictionSet] 
    //     @hasMany(indexName: "predictionSetsbyUserIdAndCreatedAt" fields: ["id"]) # get recent predictions from user
    // historyPredictionSets: [HistoryPredictionSet] 
    //     @hasMany(indexName: "historyPredictionSetsbyUserIdAndCreatedAt" fields: ["id"]) # 
    // followers: [Relationship] 
    //     @hasMany(indexName: "followersByUser", fields: ["id"])
    // following: [Relationship] 
    //     @hasMany(indexName: "followingByUser", fields: ["id"])
}

type Relationship = {
    // id: ID! @primaryKey
    // followedUserId: ID! 
    //     @index(name: "followersByUser", queryField: "relationshipByFollowedUserId")
    //     @index(name: "uniqueRelationshipViaFollowedUser", sortKeyFields: ["followingUserId"], queryField: "uniqueRelationshipViaFollowedUser") # used for getting unique followings
    // followedUser: User! @hasOne(fields: ["followedUserId"])
    // followingUserId: ID! 
    //     @index(name: "followingByUser", queryField: "relationshipByFollowingUserId")
    // followingUser: User! @hasOne(fields: ["followingUserId"])
}
