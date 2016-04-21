'use strict';

const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('users', {
    id: types.id(),
    firstname: types.name(),
    lastname: types.name(),
    email: types.email(),
    password: types.password(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt(),
    deleted_at: types.deletedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('users')
};
