const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('reset_password', {
    user_id: types.referenceId('users', 'id', true),
    reset_token: types.token(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('reset_password')
};
