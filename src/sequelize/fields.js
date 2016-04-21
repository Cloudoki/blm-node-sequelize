module.exports = {
  user: {
    name: 'User',
    operations: {
      getUser: 'read',
      getUsers: 'readAll',
      patchUser: 'update',
      deleteUser: 'delete',
      postUser: 'create'
    },
    update: ['firstname', 'lastname', 'password'],
    restrict: ['password'],
    nullable: [],
    paranoid: true
  },
  account: {
    name: 'Account',
    operations: {
      getAccount: 'read',
      getAccounts: 'readAll',
      patchAccount: 'update',
      deleteAccount: 'delete',
      postAccount: 'create'
    },
    update: ['name'],
    restrict: [],
    paranoid: true
  },
  accountUsers: {
    name: 'AccountUsers',
    operations: {
      deleteAccountUser: 'deleteAssociation',
      postUserAccount: 'createAndAssociate',
      getUserAccounts: 'readAllAssociations'
    },
    ids: ['account_id', 'user_id'],
    associates: ['Account', 'User'],
    // Are we sure we are not paranoid?!
    paranoid: false,
    restrict: []
  }
};
