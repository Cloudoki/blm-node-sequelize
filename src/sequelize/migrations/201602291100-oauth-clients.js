'use strict';

const types = require('../types');

module.exports = {
  up: queryInterface =>
    queryInterface.createTable('oauth_clients', {
      client_id: types.cuid(),
      redirect_uri: types.redirect_uri(),
      created_at: types.createdAt(),
      updated_at: types.updatedAt(),
      deleted_at: types.deletedAt()
    }, {
      charset: 'utf8mb4'
    }),
  down: queryInterface => queryInterface.dropTable('oauth_clients')
};
