'use strict';

const debug = require('debug')('blm:authenticate');
const errors = require('../errors');

const verifyOauthToken = (payload, blm, context) =>
  blm.db.OauthAccessToken.findOne({
    where: {
      access_token: payload.token,
      updated_at: {
        $gt: new Date(new Date().getTime() -
          blm.oauth2Config.accessToken.expiration)
      }
    }
  }, {
    transaction: context.transaction
  }).then(oauthAccessToken => {
    if (!oauthAccessToken) {
      throw errors.unauthorized();
    }
    context.token = payload.token;
    context.oauthAccessToken = oauthAccessToken;
    context.oauthClient = oauthAccessToken.oauthClient;

    return blm.db.Authorization.findOne({
      where: {
        user_id: oauthAccessToken.get('user_id'),
        client_id: oauthAccessToken.get('client_id')
      }
    }, {
      transaction: context.transaction
    }).then(auth => {
      if (auth) {
        context.isSuperadmin = auth.get('superadmin');
      }

      if (!context.isSuperadmin) {
        context.user = oauthAccessToken.user;
      } else {
        context.admin = oauthAccessToken.user;
      }
    });
  });

const authenticate = (payload, blm, context) => {
  debug('authenticate', payload.token);

  if (blm.excludeAuthentication[payload.operationId]) {
    debug('excluded ', payload.operationId);
    return null;
  }

  return verifyOauthToken(payload, blm, context);
};

module.exports = {
  authenticate
};
