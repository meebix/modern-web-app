import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import uuid from 'uuid/v4';
import { prisma } from '@server/prisma/generated/prisma-client';
import config from '@config';
import generateCode from '@server/modules/code';
import logger from '@server/modules/logger';
import { jwtUserFragment, userAccountFragment } from '../fragments';

const oauthConfig = {
  callbackUrl: 'http://localhost:8080/oauth/google/callback',
  successRedirect: '/',
  failureRedirect: '/login',
};

/**
 * Send user to OAuth provider login page
 *
 * @remarks
 * This is an Express.js route callback function signature.
 *
 * @param req - Express.js request objet
 * @param res - Express.js response object
 * @returns Redirect to provider login
 */
export const authorize = (req, res): any => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SECRET,
    oauthConfig.callbackUrl
  );

  const scopes = ['https://www.googleapis.com/auth/userinfo.email'];
  const state = jwt.sign({ state: uuid() }, config.server.auth.jwt.secret, {
    expiresIn: '1m',
  });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    state,
    scope: scopes,
  });

  logger.info(
    { provider: 'google', method: 'authorize' },
    'OPEN-AUTH-MIDDLEWARE: Redirecting to provider'
  );

  return res.redirect(302, url);
};

/**
 * Verify an OAuth user coming back from the provider's login flow
 *
 * @remarks
 * This function will do the following:
 *    - Verify the state param for CSRF protection
 *    - If not user currently exists in the DB, create one
 *    - Exchange the access code for an access token
 *    - Create an OAuth DB entry
 *    - Attach the user to req.user and move forward to next middleware in the chain
 *
 * @returns An Express.js middleware closure
 */
export const verify = (): any => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SECRET,
    oauthConfig.callbackUrl
  );

  return async (req, res, next) => {
    const { code, state } = req.query;
    const verifiedState = jwt.verify(state, config.server.auth.jwt.secret);
    const { tokens } = await oauth2Client.getToken(code);
    const { email } = jwt.decode(tokens.id_token);
    let user: any = await prisma.user({ email }).$fragment(jwtUserFragment);

    if (!verifiedState) {
      logger.error(
        { state: verifiedState.state },
        'OPEN-AUTH-MIDDLEWARE: Could not verify oauth state session value'
      );

      return res.redirect(302, oauthConfig.failureRedirect);
    }

    if (!user) {
      const role: any = await prisma.role({ name: 'USER' });

      logger.info(
        { provider: 'google', method: 'verify' },
        'OPEN-AUTH-MIDDLEWARE: Creating user'
      );

      user = await prisma
        .createUser({
          role: { connect: { id: role.id } },
          email,
          userAccount: {
            create: config.server.auth.confirmable
              ? {
                  confirmedCode: generateCode(),
                }
              : {},
          },
        })
        .$fragment(jwtUserFragment);
    }

    const accessToken: any = tokens.access_token;
    const refreshToken: any = tokens.refresh_token;
    const expiresAt: any = tokens.expiry_date;

    try {
      const existingOauths = await prisma.openAuths({
        where: {
          AND: [{ user: { id: user.id } }, { provider: 'GOOGLE' }],
        },
      });

      if (existingOauths.length) {
        const existingOauth = existingOauths[0];

        logger.info(
          { id: existingOauth.id, provider: 'google', method: 'verify' },
          'OPEN-AUTH-MIDDLEWARE: Updating existing oauth record'
        );

        await prisma.updateOpenAuth({
          data: {
            accessToken,
            refreshToken,
            expiresAt: new Date(expiresAt),
          },
          where: { id: existingOauth.id },
        });
      } else {
        logger.info(
          { provider: 'google', method: 'verify' },
          'OPEN-AUTH-MIDDLEWARE: Creating new oauth record'
        );

        await prisma.createOpenAuth({
          user: { connect: { id: user.id } },
          provider: 'GOOGLE',
          accessToken,
          refreshToken,
          expiresAt: new Date(expiresAt),
        });
      }
    } catch (err) {
      logger.error(
        { userId: user.id, err },
        'OPEN-AUTH-MIDDLEWARE: Could not update or add open auth details to database'
      );

      return res.redirect(302, oauthConfig.failureRedirect);
    }

    req.user = user;
    return next();
  };
};

/**
 * Authenticates a user coming back from a provider flow
 *
 * @remarks
 * This function is called after a user successfully authenticates with an OAuth provider.
 * It will update a few properties on the user account, sign a new token, and set the token cookie
 * This is an Express.js route callback function signature.
 *
 * @param req - Express.js request objet
 * @param res - Express.js response object
 * @returns Redirect to the "success" route, usually the root path
 */
export const authenticate = async (req, res): Promise<any> => {
  const { user } = req;

  try {
    const { userAccount } = await prisma
      .user({ id: user.id })
      .$fragment(userAccountFragment);

    await prisma.updateUserAccount({
      data: {
        lastVisit: new Date(),
        ip: req.ip,
      },
      where: {
        id: userAccount.id,
      },
    });
  } catch (err) {
    logger.error(
      { userId: user.id, err },
      'OPEN-AUTH-MIDDLEWARE: Could not update user account database table'
    );

    return res.redirect(302, oauthConfig.failureRedirect);
  }

  logger.info(
    { provider: 'google', method: 'authenticate' },
    'OPEN-AUTH-MIDDLEWARE: Signing token'
  );

  const token = jwt.sign(
    { cuid: user.id, role: user.role.name },
    config.server.auth.jwt.secret,
    { expiresIn: config.server.auth.jwt.expiresIn }
  );

  logger.info(
    { provider: 'google', method: 'authenticate' },
    'OPEN-AUTH-MIDDLEWARE: Setting jwt cookie and redirecting'
  );

  res.cookie('usr', token, { path: '/' });
  return res.redirect(302, oauthConfig.successRedirect);
};
