import { wrapper } from './helper/wrapper';
import Jwt from './helper/jwt';

/**
 * Retrieve an access token
 * If trying to create a refresh token, that's "/token/post"
 */
export const get = wrapper<{ userId: string }, string>(async ({ payload }) => {
  const { userId } = payload;
  const newAccessToken = Jwt.createAccessToken(userId);
  return {
    statusCode: 200,
    data: newAccessToken
  };
});
