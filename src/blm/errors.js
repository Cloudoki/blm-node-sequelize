'use strict';
const debug = require('debug')('blm:errors');
const errors = {};

errors.unauthorized = () => {
  const err = new Error('token invalid or expired');
  err.code = 'UNAUTHORIZED';
  err.status = 401;
  return err;
};

errors.forbidden = msg => {
  const err = new Error(msg || 'Access denied');
  err.code = 'FORBIDDEN';
  err.status = 403;
  return err;
};

errors.notFound = resource => {
  const err = new Error((resource ? resource : 'resource') + ' not found');
  err.status = 404;
  err.code = (resource ? resource.toUpperCase() : 'RESOURCE') + '_NOT_FOUND';
  return err;
};

errors.undefined = () => {
  const err = new Error('undefined response');
  err.status = 500;
  err.code = 'UNDEFINED_RESPONSE';
  return err;
};

errors.dispatch = (url, operation, method, redirect) => {
  const err = new Error('no registered worker for this path ' + url +
    ' with operation: ' + operation +
    ' and method ' + method + (redirect ? (
      ' and redirect: ' +
      redirect) : ''));
  err.status = 500;
  err.code = 'DISPATCH_FAILED';
  return err;
};

errors.badRequest = msg => {
  const err = new Error(msg);
  err.code = 'BAD_REQUEST';
  err.status = 400;
  return err;
};

errors.unauthorized = () => {
  const err = new Error('token invalid or missing');
  err.code = 'UNAUTHORIZED';
  err.status = 401;
  return err;
};

errors.handler = (logger, err) => {
  const response = {
    body: {}
  };
  debug('error', err);

  if (err.code && err.status) {
    response.statusCode = err.status;
    response.body.errors = [{
      code: err.code.toString(),
      message: err.message
    }];
    return response;
  }

  if (err.name && Array.isArray(err.errors) && (
      err.name === 'SequelizeValidationError' ||
      err.name === 'SequelizeUniqueConstraintError')) {
    debug('validation error');
    response.statusCode = 400;
    response.body.errors = err.errors.map(e => ({
      code: e.type ? e.type.toUpperCase().replace(' ', '_') : e.name,
      message: e.message + ' (' + e.path + ')'
    }));
    return response;
  }

  if (err.name && err.name.indexOf('Sequelize') === 0) {
    debug('sequelize error');
    response.statusCode = 500;
    response.body.errors = [{
      code: err.name,
      message: err.message
    }];
    return response;
  }

  if (Array.isArray(err)) {
    response.statusCode = 500;
    response.body.errors = [];
    err.forEach(error => {
      response.body.errors.push({
        code: error.errors.name,
        message: error.errors.message
      });
    });
    return response;
  }

  logger.error('blm unexpected error', err);
  debug('unexpected');
  response.statusCode = 500;
  response.body.errors = [{
    code: 'UNEXPECTED_BLM_ERROR',
    message: err.message || 'no message'
  }];
  return response;
};

module.exports = errors;
