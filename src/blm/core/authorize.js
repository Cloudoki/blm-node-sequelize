'use strict';

const debug = require('debug')('blm:authorize');
const errors = require('../errors');

const onlyAccountUser = (accountId, blm, context) =>
  blm.db.AccountUsers.findOne({
    where: {
      user_id: context.user.get('id'),
      account_id: accountId
    }
  }, {
    transaction: context.transaction
  }).then(instance => {
    if (!instance) {
      throw errors.forbidden();
    }
    context.accountUser = instance;
  });

const authorize = (payload, blm, context) => {
  debug('authorize');

  if (context.isSuperadmin) {
    debug('excluded: isSuperadmin');
    return null;
  }

  if (blm.excludeAuthentication[payload.operationId]) {
    debug('excluded ', payload.operationId);
    return null;
  }

  switch (payload.operationId) {
    case 'getUsers':
    case 'getUser':
    case 'getAccount':
    case 'postUser':
      // only superadmin
      throw errors.forbidden();
    case 'patchUser':
    case 'deleteUser':
      if (context.user.get('id') !== payload.params.id) {
        debug('denied mismatch id');
        throw errors.forbidden();
      }
      debug('allowed');
      return null;
    case 'patchAccount':
      return onlyAccountUser(payload.params.id, blm, context);
    case 'deleteAccount':
      return onlyAccountUser(payload.params.id, blm, context);
    case 'postAccountUser':
    case 'getAccountUsers':
      return onlyAccountUser(payload.params.account_id, blm,
        context);
    case 'deleteAccountUser':
      if (payload.params.user_id === context.user.get('id')) {
        return null;
      }
      return onlyAccountUser(payload.params.account_id, blm, context);
    case 'me':
    case 'getUserAccounts':
      debug('allowed');
      return null;
    default:
      debug('unexpected operation');
      throw new Error('unexcepted operation');
  }
};

module.exports = {
  authorize
};
