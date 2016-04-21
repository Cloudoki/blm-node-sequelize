'use strict';
const types = require('../types');
const debug = require('debug')('blm:authorization:sql');
const tableName = 'authorizations';
const name = 'Authorization';
const Authorization = sequelize => sequelize.define(name, {
  user_id: types.referenceId('users', 'id', true),
  superadmin: types.boolean()
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  tableName,
  defaultScope: {
    logging: debug
  }
});

module.exports = Authorization;
