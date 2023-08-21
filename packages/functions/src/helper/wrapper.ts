import { type MongoClient, type Db } from 'mongodb';
import connect from './connect';
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda';
import { type ApiResponse } from '../types/responses';
import Jwt from './jwt';

/**
 * Sending for tokens on the client:
 * If (and only if) you get a TokenExpiredError from anywhere, frontend requests new token using the token.refreshToken endpoint.
 * If request fails, log the user out
 * If that succeeds, then the user can try the request again
 * If the request still fails, it won't be because of an expired token, so no infinite loop, unless frontend is not changing the access token
 */
export function dbWrapper<Req = {}, Res = {}>(
  // func is what you're wrapping, so in other words, the result of THIS function
  func: (props: {
    event: APIGatewayProxyEvent;
    context: Context;
    db: Db;
    client: MongoClient;
    authenticatedUserId: string | undefined; // returns string if user is authenticated
    payload: Req;
    params: Record<string, string | undefined>;
  }) => Promise<ApiResponse<Res>>
) {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    // apply default settings to requests
    context.callbackWaitsForEmptyEventLoop = false; // false sends the response right away when the callback runs, instead of waiting for the Node.js event loop to be empty. If this is false, any outstanding events continue to run during the next invocation.
    const payload = event.body ? JSON.parse(event.body) : {};
    // connect to mongodb
    const { db, client } = connect();
    // decode userId from jwt
    const accessToken = event?.headers?.Authorization?.split(' ')[1];
    let authenticatedUserId: string | undefined;
    if (accessToken) {
      try {
        const jwtPayload = Jwt.validateToken(accessToken);
        // don't authorize if it's a refresh token
        // but don't send an error either so that the getRefreshToken endpoint can user this
        if (!jwtPayload?.isRefreshToken) {
          authenticatedUserId = jwtPayload?.userId;
        }
      } catch (err: any) {
        if (err?.name === 'TokenExpiredError') {
          return {
            statusCode: 401,
            error: 'TokenExpiredError'
          };
        }
      }
    }
    const params = {
      ...event.pathParameters,
      ...event.queryStringParameters
    };
    return await func({
      event,
      context,
      db,
      client,
      authenticatedUserId,
      payload,
      params
    });
  };
}

// applies default settings to requests
export function wrapper<Req = {}, Res = {}>(
  func: (props: {
    event: APIGatewayProxyEvent;
    context: Context;
    payload: Req;
  }) => Promise<ApiResponse<Res>>
) {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    // apply default settings to requests
    context.callbackWaitsForEmptyEventLoop = false; // false sends the response right away when the callback runs, instead of waiting for the Node.js event loop to be empty. If this is false, any outstanding events continue to run during the next invocation.
    const payload = event.body ? JSON.parse(event.body) : {};
    return await func({ event, context, payload });
  };
}
