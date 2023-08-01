import dotenv from 'dotenv';
dotenv.config();
import { ObjectId } from "mongodb";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
// @ts-ignore
import connectDynamoDB from "./helpers/connectDynamoDB.ts";
// @ts-ignore
import connectMongoDB from "./helpers/connectMongoDB.ts";

/**
 * Documentation, all dynamodb commands:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
 */

interface User {
    _id: ObjectId;
    name: string;
}

async function handler() {
    const dynamodb = await connectDynamoDB();
    const mongodb = await connectMongoDB();
    
    const scanCommand = new ScanCommand({ TableName: 'User-jrjijr2sgbhldoizdkwwstdpn4-prod' });
    const response = await dynamodb.send(scanCommand) as { Count: number, Items: any[], ScannedCount: number };
    console.log('dynamodb',Object.keys(response))

    const users = mongodb.collection<User>("users");
    const result = await users.find({}).toArray();
    console.log('mongodb', result)
    
}

handler();