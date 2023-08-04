import { Db } from 'mongodb';
import connect from './connect';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export async function dbWrapper(func: (params: {
    event: APIGatewayProxyEvent,
    context: Context,
    db: Db,
}) => any) {
  // Get an instance of our database
  const db = await connect();
  return wrapper((event, context) => {
    return func({ event, context, db });
  })
}

export async function wrapper(func: (
    event: APIGatewayProxyEvent,
    context: Context,
) => any) {
  return (event: APIGatewayProxyEvent, context: Context) => {
    // config default settings here
    context.callbackWaitsForEmptyEventLoop = false; // false sends the response right away when the callback runs, instead of waiting for the Node.js event loop to be empty. If this is false, any outstanding events continue to run during the next invocation.
    return func(event, context);
  }
}

