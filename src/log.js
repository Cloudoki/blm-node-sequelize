'use strict';
/** @module log - multi-transport async logging */
const winston = require('winston');
const debug = require('debug')('log-winston');
const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');

/**
 * Create new Logger Instance
 *
 * @param {object} config - configuration of instance
 * @param {string} config.path - log path to folder relative to process.cwd
 * @param {Object.<string, TransportsConfiguration>} config.transports - instance
 *  tranports configuration with key name of the transport and value the
 *  configuration
 * @param {object} [config.colors] - colors with key level and value {string} color name
 * @param {object} [config.levels] - levels with key level and value {string} priority
 * @param {string} [config.level='info'] - defaut logger level
 * @param {boolean} [config.stripColors=false] - remove all colors
 * @param {boolean} [config.padLevels=false] - pad levels
 * @param {boolean|function} [config.exitOnError=true] - exit on exceptions
 * @param {boolean} [config.emitErrs=true] - suppress logger owns erros or
 *  handle them with logger.on('error', [Function])
 * @return {object} Logger
 */
const createLogger = config => {
  debug('create logger', config);
  const cfg = _.cloneDeep(config);
  if (!cfg || !cfg.transports || !Object.keys(cfg.transports).length) {
    throw new Error('missing configuration transports');
  }
  /**
   * [Documentation on Winston Transports]{@link https://github.com/winstonjs/winston/blob/master/docs/transports.md}
   *
   * @typedef {object} TransportsConfiguration
   * @property {string} type - transport type, most be one of
   *  if not a core winston transport do require the transport pior to transport
   *  creation
   * @property {object} options - options used on transport creation
   */
  cfg.transports = Object.keys(cfg.transports)
    .filter(name => !!cfg.transports[name])
    .map(name => {
      const transportConfig = cfg.transports[name];
      // remove transport if not defined options or set to false
      if (!transportConfig.options || !transportConfig.type) {
        throw new Error('missing transport options or type');
      }
      debug('init transport type:', transportConfig.type);
      const Transport = winston.transports[transportConfig.type];
      if (!Transport) {
        throw new Error('missing transport type: ' + transportConfig.type);
      }
      const options = transportConfig.options;
      // set name
      options.name = name;

      // join absolute path to filename option to relative log path
      if (options.filename) {
        options.filename = path.resolve(process.cwd(), (
          config.path || './log') + '/' + options.filename);
      }
      debug('new transport:', options);
      // initialize and return transport
      return new Transport(options);
    });

  /** Logger - An extended instance of [winston.Logger]{@link https://github.com/winstonjs/winston}
   * @namespace
   * @typedef Logger
   * @type {object}
   * @extends {winston.Logger} - [winston]{@link https://github.com/winstonjs/winston}
   * @property {object} promise - object with key the logger levels and values
   * the winston.Logger level that returns a promise that fire on logging object
   * @property {function} middleware - create express middleware@property
   * @property {function} errorHandler - create express error handler
   */
  const logger = new winston.Logger(cfg);

  logger.promise = Object.create(null);
  // for each logger level
  Object.keys(logger.levels).forEach(level => {
    logger.promise[level] = function promiseLog() {
      const args = arguments;
      debug('promise log', level);
      return new Promise(resolve => {
        const levelValue = logger.levels[level];
        let transports = Object.keys(logger.transports)
          .filter(key => logger.levels[logger.transports[key].level] >=
            levelValue)
          .length;
        debug('transports count for level' + level + ':',
          transports);
        if (transports) {
          const onLogging = () => {
            debug('on logging', level);
            transports--;
            if (transports <= 0) {
              logger.removeListener('logging', onLogging);
              debug('resolve', level);
              resolve();
            }
          };
          logger.on('logging', onLogging);
          logger[level].apply(logger, args);
        } else {
          debug('resolve', level);
          resolve();
        }
      });
    };
  });
  return logger;
};

module.exports = {
  createLogger
};
