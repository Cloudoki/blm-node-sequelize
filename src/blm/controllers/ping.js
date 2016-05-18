'use strict';

const ctrl = Object.create(null);

ctrl.name = 'ping';

const pong = () => ({
  statusCode: 204
});

ctrl.operations = {
  ping: pong
};

module.exports = ctrl;
