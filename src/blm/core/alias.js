'use strict';
const debug = require('debug')('blm:alias');

const aliasUserAccounts = (payload, blm, context) => {
  debug('aliasUserAccounts');

  if (payload.params.user_id) {
    debug('user id in params');
    return null;
  } else if (context.user) {
    debug('params user_id from context user');
    payload.params.user_id = context.user.get('id');
    return null;
  } else if (payload.operationId === 'getUserAccounts') {
    context.redirectOperation = 'getAccounts';
    debug('redirect getUserAccounts > getAccounts');
    return null;
  }

  debug('no alias');
  return null;
};

const alias = (payload, blm, context) => {
  switch (payload.operationId) {
    case 'getUserAccounts':
      return aliasUserAccounts(payload, blm, context);
    default:
      return null;
  }
};

module.exports = {
  alias
};
