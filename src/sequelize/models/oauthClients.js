'use strict';
const types = require('../types');
const debug = require('debug')('blm:oauth_clients:sql');
const tableName = 'oauth_clients';
const name = 'OauthClient';

const OauthClient = sequelize => sequelize.define(name, {
  client_id: types.cuid(),
  redirect_uri: types.redirect_uri()
}, {
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  tableName,
  defaultScope: {
    logging: debug
  },
});

module.exports = OauthClient;
