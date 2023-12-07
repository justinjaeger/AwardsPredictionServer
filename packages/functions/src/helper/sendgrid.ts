import sgMail from '@sendgrid/mail';
import { createRedirectLink } from './emailLink';

const sendEmail = async (email: string, token: string): Promise<boolean> => {
  console.log('EMAIL:', email);
  console.log('TOKEN:', token);

  sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? ''); // important

  const SENDER = 'noreply@oscarexpert.com';

  const url = createRedirectLink(token, email);

  const msg = {
    to: email, // Change to your recipient
    from: SENDER, // Change to your verified sender
    subject: 'Award Expert - Confirm your email',
    html: `
        <div>
            <h3 style="color: #1F1F1F; margin-bottom: 5px;">
                Click to sign in
            </h3>
            <a href="${url}">
                <button style="background-color: #c48900; color: white; font-weight: 700; border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer;">
                    Sign In
                </button>
            </a>
        </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Confirmation code sent!');
    return true;
  } catch (error) {
    console.error('Error sending confirmation code:', error);
    return false;
  }
};

const Sendgrid = {
  sendEmail
};

export default Sendgrid;
