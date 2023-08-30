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

async function handler() {
    const dynamodb = await connectDynamoDB();
    const mongodb = await connectMongoDB();
    
    const scanCommand = new ScanCommand({ TableName: 'User-jrjijr2sgbhldoizdkwwstdpn4-prod' });
    const response = await dynamodb.send(scanCommand);
    console.log('dynamodb',response.Items[0])

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
    
    console.log('done!')
}

handler();