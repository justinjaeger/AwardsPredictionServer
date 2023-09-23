import { dbWrapper } from './helper/wrapper';
import Jwt from './helper/jwt';
import { SERVER_ERROR } from './types/responses';
import Sendgrid from './helper/sendgrid';
import { createEmailLink, parseEmailLink } from './helper/emailLink';

/**
 * Sends verification email
 */
export const send = dbWrapper<{ email: string }, string>(
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
 * link looks like: oscar://signin/?token={jwt}&email={email")
 */
export const verify = dbWrapper<{ link: string }, string>(
  async ({ params: { link } }) => {
    if (!link) {
      return {
        statusCode: 400,
        error: 'Must provide link in query params'
      };
    }
    // parse the link
    const { email, token } = parseEmailLink(link);
    const payload = Jwt.validateEmailToken(token);
    if (!payload) {
      return {
        ...SERVER_ERROR.InvalidTokenError,
        message: 'Invalid token'
      };
    } else if (payload.email !== email) {
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
