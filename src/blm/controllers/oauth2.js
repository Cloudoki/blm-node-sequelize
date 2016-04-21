'use strict';
const debug = require('debug')('blm:oauth2');
const crypt = require('../../crypt');
const queryParams = ['redirect_uri', 'response_type', 'client_id'];
const errors = require('../errors');

const invalid = errors.badRequest.bind(null, 'invalid credentials');
const invalidClient = errors.badRequest.bind(null, 'invalid client');
const invalidInvitationToken = errors.badRequest.bind(null,
  'invalid invitation token');
const invalidResetToken = errors.badRequest.bind(null, 'invalid reset token');

const verifyOauthClient = (payload, blm, context) =>
  blm.db.OauthClient.findOne({
    where: {
      client_id: payload.params.client_id,
      redirect_uri: payload.params.redirect_uri,
      deleted_at: null
    }
  }, {
    transaction: context.transaction
  }).then(client => {
    if (!client) {
      throw invalidClient();
    }
    context.oauthClient = client;
    return client;
  });

const verifyInvitationToken = (config, payload, blm, context) =>
  blm.db.Invitation.findOne({
    where: {
      invitation_token: payload.params.invitation_token,
      updated_at: {
        $gt: new Date(new Date().getTime() - config.expiration)
      }
    }
  }, {
    transaction: context.transaction
  }).then(invitation => {
    if (!invitation) {
      throw invalidInvitationToken();
    }
    context.invitation = invitation;
    return invitation;
  });

const verifyResetToken = (config, payload, blm, context) =>
  blm.db.ResetPassword.findOne({
    where: {
      reset_token: payload.params.reset_token,
      updated_at: {
        $gt: new Date(new Date().getTime() - config.expiration)
      }
    }
  }, {
    transaction: context.transaction
  }).then(resetPassword => {
    if (!resetPassword) {
      throw invalidResetToken();
    }
    context.resetPassword = resetPassword;
    return resetPassword;
  });

const oauth2 = config => {
  debug('oauth2');
  const ctrl = Object.create(null);
  ctrl.name = 'oauth2';
  ctrl.operations = {
    resetPassword: (payload, blm, context) =>
      verifyOauthClient(payload, blm, context)
      .then(() => verifyResetToken(config.resetToken,
        payload, blm, context))
      .then(resetPassword => resetPassword.user.update(payload.body, {
        transaction: context.transaction,
        fields: ['password'],
        validate: true
      }))
      .then(() => context.resetPassword.destroy({
        transaction: context.transaction,
      })).then(() => crypt.token())
      .tap(token => blm.db.OauthAccessToken.unscoped().upsert({
        client_id: context.oauthClient.get('client_id'),
        user_id: context.resetPassword.get('user_id'),
        access_token: token
      }, {
        transaction: context.transaction
      })).then(token => ({
        statusCode: 302,
        redirect: payload.params.redirect_uri + '?access_token=' +
          token
      })),
    forgot: (payload, blm, context) =>
      verifyOauthClient(payload, blm, context)
      .then(() => blm.db.User.findOne({
        where: {
          email: payload.body.email,
          deleted_at: null
        }
      }, {
        transaction: context.transaction
      })).then(user => {
        if (!user) {
          throw invalid();
        }
        context.user = user;
        return crypt.token();
      }).tap(token =>
        blm.db.ResetPassword.upsert({
          user_id: context.user.get('id'),
          reset_token: token
        }, {
          transaction: context.transaction
        })
      ).then(token => blm.mailer.sendMail({
        to: context.user.get('email'),
        subject: 'Reset Password Request',
        template: 'resetpassword',
        context: {
          data: {
            user_id: context.user.get('id'),
            reset_token: token,
            user: context.user.toJSON()
          }
        }
      })).then(() => ({
        statusCode: 200,
        body: {
          data: {
            resetPasswordSent: true
          }
        }
      })),
    getInvitation: (payload, blm, context) =>
      verifyOauthClient(payload, blm, context)
      .then(() => verifyInvitationToken(config.invitationToken,
        payload, blm, context))
      .then(invitation => {
        const data = invitation.toJSON();
        queryParams.forEach(p => data[p] = payload.params[p]);
        return ({
          statusCode: 200,
          body: {
            data
          }
        });
      }),
    postInvitation: (payload, blm, context) =>
      verifyOauthClient(payload, blm, context)
      .then(() => verifyInvitationToken(config.invitationToken,
        payload, blm, context))
      .then(invitation => invitation.user.update(payload.body, {
        transaction: context.transaction,
        fields: blm.db.User.crud().update.concat(['password']),
        validate: true
      }))
      .then(() => crypt.token())
      .then(token => blm.db.OauthAccessToken.create({
        client_id: context.oauthClient.get('client_id'),
        user_id: context.invitation.get('user_id'),
        access_token: token
      }, {
        transaction: context.transaction
      }))
      .then(oauthAccessToken => ({
        statusCode: 302,
        redirect: payload.params.redirect_uri + '?access_token=' +
          oauthAccessToken.get('access_token')
      })),
    login: (payload, blm, context) =>
      verifyOauthClient(payload, blm, context)
      .then(() => blm.db.User.unscoped().findOne({
        where: {
          email: payload.body.email,
          deleted_at: null,
          password: {
            $ne: null
          }
        }
      }, {
        transaction: context.transaction
      })).then(user => {
        if (!user) {
          throw invalid();
        }
        return crypt.compare(payload.body.password,
            user.get('password'))
          .then(isEqual => {
            if (!isEqual) {
              throw invalid();
            }
            context.user = user;
            return user;
          });
      }).then(() => crypt.token())
      .tap(token =>
        blm.db.OauthAccessToken.unscoped().upsert({
          client_id: payload.params.client_id,
          user_id: context.user.get('id'),
          access_token: token
        }, {
          transaction: context.transaction
        })
      ).then(token => ({
        statusCode: 302,
        redirect: payload.params.redirect_uri + '?access_token=' +
          token
      }))
  };

  return ctrl;
};

module.exports = {
  setup: config => ([oauth2(config)])
};
