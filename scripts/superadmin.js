#!/usr/bin/env node

'use strict';

const crypt = require('../src/crypt');
const closeSequelize = require('../src/sequelize/utils').closeSequelize;

const debug = require('debug')('initdb');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const sequelize = require('../src/sequelize');
const cfg = require('config');
const sqlConfig = cfg.get('blm.sequelize');
const oauthclientConfig = cfg.get('scripts.oauthclient');
const superadmins = cfg.get('scripts.superadmins');

const passwordRegex = require('../src/blm/core/password').regex;

if (!superadmins.length) {
  throw new Error('missing superadmins');
}

superadmins.forEach(admin => {
  if (!admin.password || !passwordRegex.test(admin.password)) {
    throw new Error(
      'Invalid password: minimum 4 characters at least 1 letter and 1 number'
    );
  }
});

sqlConfig.logging = debug;
debug('sqlConfig', sqlConfig);

sequelize(sqlConfig)
  .tap(db => db.sequelize.authenticate())
  .then(db => db.sequelize.transaction(transaction =>
    db.OauthClient.findOne({
      where: {
        redirect_uri: oauthclientConfig.get('redirect_uri.superadmin')
      }
    }).then(client => {
      if (!client) {
        throw new Error('OauthClient superadmin missing: redirect_uri',
          oauthclientConfig.get('redirect_uri.superadmin'));
      }

      debug('superadmin client', client);

      return Promise.all(superadmins.map(admin =>
        crypt.hash(admin.password).then(password =>
          Promise.all([
            db.User.create({
              firstname: admin.firstname,
              lastname: admin.lastname,
              email: admin.email,
              password,
            }, { transaction })
            .catch(db.Sequelize.UniqueConstraintError, () => {
              debug('Superadmin already exists', admin.email);
              return db.User.findOne({
                where: {
                  email: admin.email
                }
              }, { transaction });
            }),
            crypt.token()
          ]).then(values => Promise.all([
            db.OauthAccessToken.upsert({
              user_id: values[0].get('id'),
              client_id: client.get('client_id'),
              access_token: values[1],
            }, { transaction }),
            db.Authorization.upsert({
              user_id: values[0].get('id'),
              client_id: client.get('client_id'),
              superadmin: true
            }, { transaction }),
            values[1]
          ])).then(values => ({
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email,
            token: values[2]
          }))
        )));
      /* eslint-disable no-console */
    })).then(result => console.log(JSON.stringify(result, null, 2)))
    /* eslint-enable no-console */
    .then(() => closeSequelize(db.sequelize)));
