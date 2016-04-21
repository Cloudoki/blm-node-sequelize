const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('authorizations', {
    user_id: types.referenceId('users', 'id'),
    client_id: types.referenceCuid('oauth_clients', 'client_id'),
    superadmin: types.boolean(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('authorizations')
};
