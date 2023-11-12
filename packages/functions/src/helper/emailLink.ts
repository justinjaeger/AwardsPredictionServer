/**
 * Helper funcs for generating sign-in links
 * Link looks like:
 * oscar://signin/?token={jwt}&email={email")
 */

export const createEmailLink = (jwtString: string, email: string) => {
  return 'oscar://signin/' + '?token=' + jwtString + '&email=' + email;
};

const REDIRECT_WEBSITE = 'https://master.d3r2lxfrfpe7nd.amplifyapp.com/';
export const createRedirectLink = (jwtString: string, email: string) => {
  return REDIRECT_WEBSITE + '?token=' + jwtString + '&email=' + email;
};

export const parseEmailLink = (link: string): Record<string, string> => {
  const queryParams = link.split('?')[1];
  const keyValuePairs: Record<string, string> = {};
  queryParams.split('&').forEach((item) => {
    const s = item.split('=');
    const key = s[0];
    // value is everything after the first '=
    const value = s.slice(1).join('=');
    keyValuePairs[key] = value;
  });
  const { token, email } = keyValuePairs;
  return { token, email };
};
