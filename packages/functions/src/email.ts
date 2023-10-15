import { dbWrapper } from './helper/wrapper';
import Jwt from './helper/jwt';
import { SERVER_ERROR } from './types/responses';
import Sendgrid from './helper/sendgrid';
import { createEmailLink, parseEmailLink } from './helper/emailLink';

/**
 * Sends verification email
 */
export const send = dbWrapper<undefined, string>(
  async ({ params: { email } }) => {
    if (!email) {
      return {
        ...SERVER_ERROR.BadRequest,
        message: 'Must provide email'
      };
    }
    const token = Jwt.createEmailToken(email);
    const link = createEmailLink(token, email);
    console.log('verification link:', link);

    const hasSentSuccessfully = await Sendgrid.sendEmail(email, link);

    if (hasSentSuccessfully) {
      return {
        statusCode: 200
      };
    } else {
      return {
        ...SERVER_ERROR.Error
      };
    }
  }
);

/**
 * Confirm or deny email verification code
 * Note: client must verify that the payload email matches the email the person is trying to verify
 * link looks like: oscar://signin/?token={jwt}
 */
export const verify = dbWrapper<undefined, string>(
  async ({ params: { link } }) => {
    if (!link) {
      return {
        statusCode: 400,
        error: 'Must provide link in query params'
      };
    }
    // parse the link
    const { token } = parseEmailLink(link);
    const payload = Jwt.validateEmailToken(token);
    const email = payload?.email;
    if (!email) {
      return {
        ...SERVER_ERROR.InvalidTokenError,
        message: 'Invalid token'
      };
    } else {
      return {
        statusCode: 200,
        data: email
      };
    }
  }
);
