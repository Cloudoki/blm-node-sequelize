'use strict';
const debug = require('debug')('blm:accountUsers');
const ctrl = Object.create(null);
const Promise = require('bluebird');
const crypt = require('../../crypt');
const errors = require('../errors');

ctrl.name = 'accountUsers';

const firstOrLastName = (first, last) => ({
  $or: [{
    firstname: {
      $like: first
    }
  }, {
    lastname: {
      $like: last
    }
  }]
});

const searchName = data => {
  const words = data.split(' ');
  if (words.length < 2) {
    const name = '%' + data + '%';
    debug('name', name);
    return firstOrLastName(name, name);
  }
  const div = Math.floor(words.length / 2);
  const first = '%' + words.slice(0, div).join('%') + '%';
  const last = '%' + words.slice(div).join('%') + '%';
  debug('first', first);
  debug('last', last);
  return firstOrLastName(first, last);
};
/*
const roleToMethod = role => {
  if (!role) {
    return 'getUsers';
  }
  return role === 'client' ? 'getClients' : 'getProfessionals';
};
*/
ctrl.operations = {
  postAccountUser: (payload, blm, context) =>
    blm.db.Account.findById(payload.params.account_id, {
      transaction: context.transaction
    }).then(account => {
      if (!account) {
        throw errors.notFound();
      }
      context.account = account;

      return context.account.createUser(payload.body, {
        transaction: context.transaction,
        validate: true
      });
    }).catch(err => {
      if (err.name === 'SequelizeUniqueConstraintError') {
        err.name = 'UniqueUserConstraintError';
      }
      throw err;
    }).then(created => {
      context.createdUser = created;
      return crypt.token();
    }).then(invitation_token =>
      blm.db.Invitation.create({
        user_id: context.createdUser.get('id'),
        referral_id: context.user ? context.user.get('id') : context.admin.get(
          'id'),
        account_id: context.account.get('id'),
        invitation_token
      }, {
        transaction: context.transaction
      })
    ).then(invitation => {
      const data = invitation.toJSON();
      data.referral = context.user ? context.user.toJSON() : context.admin.toJSON();
      data.user = context.createdUser.toJSON();
      data.account = context.account.toJSON();
      blm.mailer.sendMail({
        to: context.createdUser.get('email'),
        template: 'invitation',
        context: {
          data
        }
      }).catch(err => blm.logger.error('invitation mail not sent', err));
      return null;
    }).then(() => ({
      statusCode: 201,
      body: {
        data: context.createdUser.toJSON()
      }
    })).catch(err => {
      if (err.name === 'UniqueUserConstraintError') {
        return blm.db.sequelize.transaction(tr =>
          blm.db.User.findOne({
            where: err.fields
          }, {
            transaction: tr
          }).then(other => other ?
            context.account.addUser(other, {
              transaction: tr,
              validate: true
            }) : Promise.reject(errors.notFound())
          ).then(() => ({
            statusCode: 204
          })));
      }
      throw err;
    }),
  getAccountUsers: (payload, blm, context) =>
    blm.db.Account.findById(payload.params.account_id, {
      transaction: context.transaction
    }).then(account => account ?
      account.getUsers({
        through: {
          attributes: [],
        },
        where: payload.params.name ?
          searchName(payload.params.name) : undefined,
        limit: payload.params.limit
      }, {
        transaction: context.transaction
      }) : Promise.reject(errors.notFound())
    ).then(data => ({
      statusCode: 200,
      body: {
        data: data ? data.map(u => u.toJSON()) : []
      }
    }))
};

module.exports = ctrl;
