'use strict';

const Promise = require('bluebird');
const ctrl = Object.create(null);

ctrl.name = 'ping';

const pong = () => {
  return Promise.resolve({
    statusCode: 204
  });
};

ctrl.operations = {
  ping: pong
};

module.exports = ctrl;
