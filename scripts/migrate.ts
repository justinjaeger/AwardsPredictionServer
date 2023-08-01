require('dotenv').config();
const connectDynamoDB = require("./helpers/connectDynamoDB.ts");
const { ScanCommand } = require("@aws-sdk/client-dynamodb");

/**
 * Documentation, all dynamodb commands:
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
 */
async function handler() {
    const dynamodb = await connectDynamoDB();
    
    const scanCommand = new ScanCommand({ TableName: 'User-jrjijr2sgbhldoizdkwwstdpn4-prod' });
    const response = await dynamodb.send(scanCommand) as { Count: number, Items: any[], ScannedCount: number };
    console.log('response',Object.keys(response))
}

handler();