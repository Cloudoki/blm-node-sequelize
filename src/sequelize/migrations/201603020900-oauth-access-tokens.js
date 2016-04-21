const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('oauth_access_tokens', {
    client_id: types.referenceCuid('oauth_clients', 'client_id'),
    user_id: types.referenceId('users'),
    access_token: types.token(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('oauth_access_tokens'),
};
