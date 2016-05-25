#!/usr/bin/env node
'use strict';
const debug = require('debug')('revert');
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
const Umzug = require('umzug');
const sequelize = require('../src/sequelize');
const config = require('config');
const sqlConfig = config.get('blm.sequelize');
sqlConfig.logging = debug;
debug('sqlConfig', sqlConfig);
sequelize(sqlConfig)
.then(function(db){

    debug('db', Object.keys(db));
    const umzugCfg = config.get('blm.umzug');
    umzugCfg.storageOptions = {
      sequelize: db.sequelize
    };
    umzugCfg.logging = debug;

    if (umzugCfg.migrations && umzugCfg.migrations.path) {
      umzugCfg.migrations.params = [db.sequelize.getQueryInterface(),
        db.Sequelize, db];
    } else {
      throw new Error('missing umzug migrations.path');
    }
    debug('umzugCfg', umzugCfg);
    const umzug = new Umzug(umzugCfg);
    return db.sequelize.authenticate().then(() => umzug.down());
})
.then(migration => {
    debug('done', migration.file);
    process.exit(1);
});

