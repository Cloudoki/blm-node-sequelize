'use strict';
// const debug = require('debug')('blm:me');
const ctrl = Object.create(null);
const errors = require('../errors');

ctrl.name = 'me';

ctrl.operations = {
  me: (payload, blm, context) => {
    if (!context.user && !context.admin) {
      throw errors.notFound();
    }
    const user = context.user || context.admin;
    const data = user.toJSON();
    return user.getAccounts({
      transaction: context.transaction
    }).then(userAccounts => {
      data.accounts = userAccounts.map(x => x.toJSON());
      return ({
        statusCode: 200,
        body: {
          data
        }
      });
    });
  }
};

module.exports = ctrl;
