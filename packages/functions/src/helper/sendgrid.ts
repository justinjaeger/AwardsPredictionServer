import sgMail from '@sendgrid/mail';

const sendEmail = async (email: string, link: string): Promise<boolean> => {
  console.log('EMAIL:', email);
  console.log('LINK:', link);

  sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? ''); // important

  const SENDER = 'noreply@oscarexpert.com';

  const msg = {
    to: email, // Change to your recipient
    from: SENDER, // Change to your verified sender
    subject: 'Award Expert - Confirm your email',
    html: `
        <div>
            <h3 style="color: #1F1F1F; margin-bottom: 5px;">
                Click to verify your account
            </h3>
            <a href=${link}>
                <button style="background-color: #c48900; color: white; font-weight: 700; border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer;">
                    Verify Account
                </button>
            </a>
            <body style="color: #5E5E5E; margin-top: 20px;">
                You must verify on the same device you signed up on.
            </body>
            <body style="color: #5E5E5E;">
                If you did not sign up for Award Expert, please ignore this email.
            </body>
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
