'use strict';
const types = require('../types');
const fields = require('../fields');
const debug = require('debug')('blm:accountUsers:sql');
const tableName = 'accounts_users';
const model = fields.accountUsers;
const name = model.name;

const AccountUsers = sequelize => sequelize.define(name, {
  account_id: types.referenceId('accounts'),
  user_id: types.referenceId('users')
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    crud: () => model
  },
  defaultScope: {
    logging: debug
  }
});

module.exports = AccountUsers;
