'use strict';

const types = require('../types');

module.exports = {
  up: queryInterface =>
    queryInterface.createTable('accounts_users', {
      account_id: types.referenceId('accounts'),
      user_id: types.referenceId('users'),
      created_at: types.createdAt(),
      updated_at: types.updatedAt()
    }, {
      charset: 'utf8mb4'
    }),
  down: queryInterface => queryInterface.dropTable('accounts_users')
};
