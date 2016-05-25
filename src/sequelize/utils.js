'use strict';

const Promise = require('bluebird');

const instanceToJSON = (model, fn) => function toJSON() {
  const json = this.constructor.super_.prototype.toJSON.apply(this, arguments);

  if (!model.timestamps) {
    delete json.created_at;
    delete json.updated_at;
  }

  if (model.nullable) {
    model.nullable.forEach(n => json[n] === null ? delete json[n] : null);
  }

  if (fn) {
    fn(json);
  }

  return json;
};


const closeSequelize = (sequelize, wait) => {
  const pool = sequelize && sequelize.connectionManager ?
    sequelize.connectionManager.pool : null;

  if (pool) {
    return new Promise(resolve => pool.drain(() => {
      pool.destroyAllNow();
      resolve();
    })).then(() => Promise.delay(wait || 100));
  }

  throw new Error('invalid sequelize or no pool');
};

module.exports = {
  instanceToJSON,
  closeSequelize
};
