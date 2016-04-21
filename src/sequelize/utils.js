'use strict';

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

module.exports = {
  instanceToJSON
};
