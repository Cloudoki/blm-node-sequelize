#!/usr/bin/env node

'use strict';

const cuid = require('cuid');
const closeSequelize = require('../src/sequelize/utils').closeSequelize;

const debug = require('debug')('oauthclient');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const sequelize = require('../src/sequelize');
const cfg = require('config');
const sqlConfig = cfg.get('blm.sequelize');
const config = cfg.get('scripts.oauthclient');

sqlConfig.logging = debug;
debug('sqlConfig', sqlConfig);

sequelize(sqlConfig)
  .tap(db => db.sequelize.authenticate())
  .then(db => db.sequelize.transaction(transaction =>
      Promise.all([
        config.get('redirect_uri.platform'),
        config.get('redirect_uri.superadmin')
      ].map(uri => db.OauthClient.findOne({
        where: {
          redirect_uri: uri
        }
      }, { transaction }).then(client => {
        if (client) {
          return debug('client already exists', uri);
        }
        return db.OauthClient.create({
          client_id: cuid(),
          redirect_uri: uri
        }, { transaction });
      }))))
    .then(() => closeSequelize(db.sequelize))
  );
