import { wrapper } from './helper/wrapper';
import Jwt from './helper/jwt';

/**
 * Creates an access token
 * If trying to create a refresh token, that's "/token/post"
 */
export const create = wrapper<{ userId: string }, string>(
  async ({ payload }) => {
    const { userId } = payload;
    const newAccessToken = Jwt.createAccessToken(userId);
    return {
      statusCode: 200,
      data: newAccessToken
    };
  }
);
