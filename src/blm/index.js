'use strict';
const utilDebug = require('debug');
const debug = utilDebug('blm:main');
const sqlDebug = utilDebug('blm:sql');
const migDebug = utilDebug('blm:mig');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const Umzug = require('umzug');
const sequelize = require('../sequelize');
const amqp = require('mq-node-amqp');
const errors = require('./errors');
const core = require('./core');
const closeSequelize = require('../sequelize/utils').closeSequelize;

const blm = Object.create(null);
blm.controllers = Object.create(null);
blm.dispatch = Object.create(null);

blm.register = ctrl => {
  const ops = Object.keys(ctrl.operations);
  debug('operations for ' + ctrl.name, ops);
  ops.forEach(op => {
    if (blm.dispatch[op]) {
      throw new Error('operation already registered');
    }
    blm.dispatch[op] = ctrl.operations[op];
  });
};

let logger;
let db;
let executor;

const loadDir = (relativePath, obj) => {
  const filePath = path.resolve(process.cwd(), relativePath);
  fs.readdirSync(filePath)
    .map(path.parse)
    .filter(file =>
      file.name &&
      file.name.indexOf('.') === -1 &&
      file.name !== 'index' &&
      file.ext === '.js')
    .forEach(file => {
      obj[file.name] = require(path.join(filePath, file.base));
    });
};

blm.setup = config => {
  const sqlConfig = config.sequelize;
  blm.amqp = config.amqp;
  blm.excludeAuthentication = {};
  config.excludeAuthentication.forEach(op =>
    blm.excludeAuthentication[op] = true);
  blm.oauth2Config = config.oauth2;
  blm.logger = config.logging;
  blm.mailer = config.mailing;
  blm.cleanup = config.cleanup;
  logger = blm.logger;
  sqlConfig.logging = sqlDebug;

  return sequelize(sqlConfig)
    .then(database => {
      blm.db = database;
      db = database;

      debug('db', Object.keys(blm.db));

      process.removeListener('exit',
        blm.db.sequelize.connectionManager.onProcessExit);

      debug('setup blm db', sqlConfig.database);
      return blm.db.sequelize.authenticate();
    }).then(() => {
      const umzugCfg = config.umzug;
      umzugCfg.storageOptions = {
        sequelize: db.sequelize
      };
      umzugCfg.logging = migDebug;

      if (umzugCfg.migrations && umzugCfg.migrations.path) {
        umzugCfg.migrations.params = [db.sequelize.getQueryInterface(),
          db.Sequelize, db
        ];
      } else {
        throw new Error('missing umzug migrations.path');
      }

      const umzug = new Umzug(umzugCfg);

      debug('execute all pending migrations');
      return umzug.up();
    }).then(migrations => {
      logger.info('migrations [' + migrations.length + ']',
        migrations.map(m => m.file));
      // Controller loading
      if (config.controllers) {
        debug('load controllers');

        loadDir(config.controllers, blm.controllers);

        debug('setup controllers');
        return Promise.all(_.flatten(Object.keys(blm.controllers)
          .map(name => {
            let ctrls;
            if (typeof blm.controllers[name].setup === 'function') {
              debug('generating controllers ', name);
              ctrls = blm.controllers[name].setup(config[name], blm);
            } else {
              debug('controller ', name);
              ctrls = [blm.controllers[name]];
            }
            return ctrls;
          })));
      }

      return Promise.Resolve([]);
    }).then(ctrls => ctrls.forEach(
      ctrl => blm.register(ctrl)
    )).then(() =>
      amqp.createExecutor(config.executor)
    ).then(exec => {
      executor = exec;
      return executor.listen(blm.process,
        err => logger.error('failed to send reply', err)
      );
    });
};

blm.close = () => Promise.resolve()
  .then(() => executor ? executor.close() : null)
  .then(() => db ? closeSequelize(db.sequelize) : null);

blm.process = payload => {
  debug('payload', payload);
  const op = payload.operationId;
  const method = payload.method ? payload.method.toLowerCase() : undefined;
  const url = payload.apiPath;
  const context = {};

  return Promise.resolve().then(() => {
    logger.info('BLM received', payload.id);

    // validate operation
    if (!method || !blm.dispatch[op]) {
      throw errors.dispatch(url, op, method);
    }

    return blm.db.sequelize.transaction(transaction => {
      context.transaction = transaction;
      return Promise.resolve()
        .then(() => core.authenticate(payload, blm, context))
        .then(() => core.authorize(payload, blm, context))
        .then(() => core.password(payload, blm, context))
        .then(() => core.alias(payload, blm, context))
        .then(() => {
          const operation = context.redirectOperation || op;
          if (!blm.dispatch[operation]) {
            throw errors.dispatch(url, op, method, context.redirectOperation);
          }
          return operation;
        }).then(operation => blm.dispatch[operation](payload, blm,
          context));
    });
  }).tap(res => {
    // reject undefined responses
    if (!res) {
      throw errors.undefined();
    }
  }).catch(err => errors.handler(logger, err)).tap(response => {
    debug('response', response);
    const details = ['BLM replied ', payload.id, payload.method, url,
      payload.operationId, response.statusCode
    ].join(' ');
    debug('details', details);
    let level = 'info';
    if (response.statusCode >= 500) {
      level = 'error';
    } else if (response.statusCode >= 400) {
      level = 'warn';
    }
    logger[level](details, level === 'error' ? response : '');
  });
};

module.exports = blm;
