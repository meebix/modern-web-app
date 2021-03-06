import jwt from 'jsonwebtoken';
import Cookies from 'universal-cookie';
import { logger } from '@server/modules/logger';
import { config } from '@config';

/**
 * Checks if a user is authenticated
 *
 * @remarks
 * This function verifies a token and attaches the user to req.actor
 *
 * @param headers - The application request headers
 * @returns A user object
 */
const authenticate = (headers: any): any => {
  let token = '';
  const headerParts =
    (headers.authorization && headers.authorization.split(' ')) || [];

  if (headerParts.length === 2) {
    const scheme = headerParts[0];
    const credentials = headerParts[1];

    if (/^Bearer$/i.test(scheme)) {
      token = credentials;
    }
  }

  const uc = new Cookies(headers && headers.cookie);
  const uCookies = uc.getAll();
  const constructedToken =
    uCookies && uCookies['token-signature']
      ? `${token}.${uCookies['token-signature']}`
      : token;

  return jwt.verify(
    constructedToken,
    config.server.auth.jwt.secret,
    (err: any, decoded: any) => {
      const actor = { decoded: null, token: constructedToken };

      if (err) {
        logger.warn({ err }, `AUTHENTICATE-MIDDLEWARE: ${err.message}`);
      }

      // Add the decoded actor to context for continued access
      actor.decoded = decoded;
      return actor;
    }
  );
};

export { authenticate };
