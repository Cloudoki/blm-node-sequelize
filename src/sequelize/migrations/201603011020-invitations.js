const types = require('../types');

module.exports = {
  up: queryInterface => queryInterface.createTable('invitations', {
    account_id: types.referenceId('accounts'),
    user_id: types.referenceId('users'),
    referral_id: types.referenceId('users'),
    invitation_token: types.token(),
    created_at: types.createdAt(),
    updated_at: types.updatedAt()
  }, {
    charset: 'utf8mb4'
  }),
  down: queryInterface => queryInterface.dropTable('invitations'),
};
