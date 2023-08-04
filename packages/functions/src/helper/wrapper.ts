import { type Db } from 'mongodb';
import connect from './connect';
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda';
import { type ApiResponse } from '../types/responses';

export function dbWrapper<T>(
  // func is what you're wrapping, so in other words, the result of THIS function
  func: (props: {
    event: APIGatewayProxyEvent;
    context: Context;
    db: Db;
  }) => Promise<ApiResponse<T>>
) {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    const db = await connect();
    context.callbackWaitsForEmptyEventLoop = false; // false sends the response right away when the callback runs, instead of waiting for the Node.js event loop to be empty. If this is false, any outstanding events continue to run during the next invocation.
    return await func({ event, context, db });
  };
}

// applies default settings to requests
export function wrapper(
  func: (event: APIGatewayProxyEvent, context: Context) => any
) {
  return (event: APIGatewayProxyEvent, context: Context) => {
    context.callbackWaitsForEmptyEventLoop = false; // false sends the response right away when the callback runs, instead of waiting for the Node.js event loop to be empty. If this is false, any outstanding events continue to run during the next invocation.
    return func(event, context);
  };
}
