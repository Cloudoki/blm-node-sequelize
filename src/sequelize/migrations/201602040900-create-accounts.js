'use strict';

const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('accounts', {
    id: types.id(),
    name: types.uniqueName(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt(),
    deleted_at: types.deletedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('accounts')
};
