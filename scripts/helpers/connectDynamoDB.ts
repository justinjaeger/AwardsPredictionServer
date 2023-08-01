import {DynamoDB} from "@aws-sdk/client-dynamodb";

/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/
 */

const connectDynamoDB = async () =>{
    const REGION = "us-east-1";
    const dynamoDBClient = new DynamoDB({
        region: REGION, 
        credentials: {
            accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY || '',
        },      
    });
    return dynamoDBClient;
}

export default connectDynamoDB;