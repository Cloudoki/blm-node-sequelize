#!/usr/bin/env node

'use strict';
const debug = require('debug')('blm:start');
debug('run');
const _ = require('lodash');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const config = require('config');
const Promise = require('bluebird');

debug('environment', _.pick(process.env,
  'NODE_ENV',
  'NODE_DEBUG',
  'cwd',
  // https://github.com/lorenwest/node-config/wiki/Environment-Variables
  'NODE_APP_INSTANCE',
  'NODE_CONFIG',
  'NODE_CONFIG_DIR',
  'NODE_CONFIG_STRICT_MODE',
  'SUPPRESS_NO_CONFIG_WARNING',
  'ALLOW_CONFIG_MUTATIONS',
  'HOST',
  'HOSTNAME'
));

const blm = require('../src/blm');
const log = require('../src/log');
const mailer = require('../src/mailer');

let logger;

debug('setup blm');
const cfgBlm = config.get('blm');
cfgBlm.logging = logger = log.createLogger(config.get('blm.logger'));
cfgBlm.mailing = mailer.createMailer(config.get('blm.mailer'));

blm.setup(cfgBlm)
  .then(() => debug('blm ready'))
  .catch(err => {
    debug('error', err);
    Promise.resolve()
      .then(() => blm.close())
      .then(() => blm.db ? Promise.delay(250) : null)
      .then(() => logger.promise.error('servers stopped on error: ' + err))
      .then(() => debug('server stop'))
      .catch(error => logger.promise.error('stopping error', error)
        .then(() => Promise.delay(100)))
      .then(() => {
        // Forced exit after 250ms because blm.close
        // will hang if connection was initiated
        // (there's no callback/promise api)
        throw err;
      });
  });

let SIGINTListener;

const gracefulShutdown = msg => {
  if (msg === 'shutdown' || msg === 'SIGINT') {
    process.removeListener('message', gracefulShutdown);
    if (msg !== 'SIGINT') {
      process.removeListener('SIGINT', SIGINTListener);
    }
    Promise.resolve()
      .then(() => blm.close())
      .then(() => logger.promise.info('servers stopped on message: ' + msg))
      .then(() => debug('server stop'))
      .catch(err => logger.promise.error('shutdown error', err)
        .then(() => Promise.delay(100))
        .then(() => {
          throw err;
        }));
  } else {
    logger.warn('unexpected process msg', msg);
  }
};

SIGINTListener = gracefulShutdown.bind(null, 'SIGINT');

process.once('SIGINT', SIGINTListener);
process.on('message', gracefulShutdown);

module.exports = blm;
