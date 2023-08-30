import { dbWrapper } from './helper/wrapper';
import Jwt from './helper/jwt';

/**
 * Retrieve an access token
 * If trying to create a refresh token, that's "/token/post"
 */
export const get = dbWrapper<{ userId: string }, string>(
  async ({ params: { userId } }) => {
    if (!userId) {
      return {
        statusCode: 400,
        error: 'Must provide userId'
      };
    }
    const newAccessToken = Jwt.createAccessToken(userId);
    return {
      statusCode: 200,
      data: newAccessToken
    };
  }
);
