#!/usr/bin/env node

'use strict';

const crypt = require('../src/crypt');
const cuid = require('cuid');
const closeSequelize = require('../src/sequelize/utils').closeSequelize;

const debug = require('debug')('initdb');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const sequelize = require('../src/sequelize');
const config = require('config');
const sqlConfig = config.get('blm.sequelize');

const passwordRegex = require('../src/blm/core/password').regex;

const pass = process.argv[2];
if (process.argv.length < 2 || !pass) {
  throw new Error('Invalid arguments');
}

if (!passwordRegex.test(pass)) {
  throw new Error(
    'Invalid password: minimum 4 characters at least 1 letter and 1 number');
}

sqlConfig.logging = debug;
debug('sqlConfig', sqlConfig);

sequelize(sqlConfig)
  .tap(db => db.sequelize.authenticate())
  .then(db => {
    debug('db', Object.keys(db));

    return crypt.hash(pass)
      .then(password =>
        db.sequelize.transaction(transaction => Promise.all([
          db.User.create({
            firstname: 'Super',
            lastname: 'Admin',
            email: 'admin@domain.com',
            password,
          }, { transaction }),
          db.OauthClient.create({
            client_id: cuid(),
            redirect_uri: ''
          }, { transaction }),
          crypt.token()
        ]).then(values => Promise.all([
          db.OauthAccessToken.create({
            user_id: values[0].get('id'),
            client_id: values[1].get('client_id'),
            access_token: values[2],
          }, { transaction }),
          db.Authorization.create({
            user_id: values[0].get('id'),
            client_id: values[1].get('client_id'),
            superadmin: true
          }, { transaction })
        ]))))
      .then(values => values[0].get('access_token'))
      .then(token => console.log(`${token}\n`)) // eslint-disable-line no-console
      .catch(db.Sequelize.UniqueConstraintError, () =>
        console.log('Super Admin already exists') // eslint-disable-line no-console
      ).then(() => debug('close sequelize'))
      .then(() => closeSequelize(db.sequelize));
  });
