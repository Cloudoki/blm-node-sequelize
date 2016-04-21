'use strict';
const debug = require('debug')('blm:crud');
const Promise = require('bluebird');
const errors = require('../errors');

const toData = (instance, restricted, hideNull, timestamps, trimId,
  associationFields, association) => {
  const data = instance.toJSON();
  debug('toData', data);
  if (restricted) {
    debug('restrict', restricted);
    restricted.forEach(f => delete data[f]);
  }

  if (hideNull) {
    debug('hideNull', hideNull);
    hideNull.forEach(h => data[h] === null ? delete data[h] : null);
  }

  if (trimId && data[trimId] && !data.id) {
    debug('trimId', trimId);
    data.id = data[trimId];
    delete data[trimId];
  }

  if (associationFields && association && data[association]) {
    debug('associationFields', associationFields);
    associationFields.forEach(f => {
      data[f] = data[association][f];
    });
  }

  if (association) {
    debug('association', association);
    delete data[association];
  }

  if (!timestamps) {
    delete data.created_at;
    delete data.updated_at;
    delete data.deleted_at;
  }

  debug('data', data);
  return data;
};

const create = (model, payload, blm, context) => {
  return blm.db[model.name].create(payload.body, {
    transaction: context.transaction
  }).then(instance => ({
    statusCode: 201,
    body: {
      data: toData(instance, model.restrict, model.hideNull, model.timestamps)
    }
  }));
};

const readAll = (model, payload, blm, context) =>
  blm.db[model.name].findAll({
    transaction: context.transaction
  }).then(instances => ({
    statusCode: 200,
    body: {
      data: instances.map(i => toData(i, model.restrict, model.hideNull,
        model.timestamps))
    }
  }));

const read = (model, payload, blm, context) =>
  blm.db[model.name].findById(payload.params.id, {
    transaction: context.transaction
  }).then(instance => instance ? ({
    statusCode: 200,
    body: {
      data: toData(instance, model.restrict, model.hideNull, model.timestamps)
    }
  }) : Promise.reject(errors.notFound()));

const destroy = (model, payload, blm, context) => blm.db[model.name].destroy({
  where: {
    id: payload.params.id
  },
  limit: 1,
  transaction: context.transaction
}).then(deleted => deleted ? ({
  statusCode: 204
}) : Promise.reject(errors.notFound()));

const update = (model, payload, blm, context) =>
  blm.db[model.name].update(payload.body, {
    where: model.paranoid ? {
      id: payload.params.id,
      deleted_at: null
    } : {
      id: payload.params.id
    },
    limit: 1,
    fields: model.update,
    validate: true,
    transaction: context.transaction
  }).then(affected => affected ?
    read(model, payload, blm, context) : Promise.reject(errors.notFound()));

const replace = (model, payload, blm) =>
  blm.db[model.name].update(payload.body, {
    where: {
      id: payload.params.id,
      deleted_at: null
    },
    limit: 1,
    fields: model.replace,
    validate: true
  }).then(affected => affected ?
    read(model, payload, blm) : Promise.reject(errors.notFound()));

const whereIds = (ids, payload, paranoid) => {
  const where = {};
  ids.forEach(id => where[id] = payload.params[id]);
  if (paranoid) {
    where.deleted_at = null;
  }
  return where;
};

const readAssociation = (model, payload, blm, context, force) => {
  if (!force && model === 'AccountUser' && context.accountUser &&
    context.accountUser.get('user_id') === payload.params.user_id) {
    return ({
      statusCode: 200,
      body: {
        data: toData(context.accountUser, model.restrict, model.hideNull,
          model.timestamps)
      }
    });
  }
  return blm.db[model.name].findOne({
    where: whereIds(model.ids, payload),
    transaction: context.transaction
  }).then(instance => instance ? ({
    statusCode: 200,
    body: {
      data: toData(instance, model.restrict, model.hideNull, model.timestamps)
    }
  }) : Promise.reject(errors.notFound()));
};

const deleteAssociation = (model, payload, blm, context) =>
  blm.db[model.name].destroy({
    where: whereIds(model.ids, payload),
    limit: 1,
    transaction: context.transaction
  }).then(deleted => deleted ? ({
    statusCode: 204
  }) : Promise.reject(errors.notFound()));

const readAllAssociations = (model, payload, blm, context) => {
  debug('readAllAssociations', model);
  const ids = model.ids;
  const idx = ids.findIndex(x => payload.params[x]);
  const id = payload.params[ids[idx]];
  const name = model.associates[idx];
  const associateName = model.associates[idx ? 0 : 1];
  const aModel = blm.db[associateName].crud();
  const restricted = aModel.restrict.concat([ids[idx ? 0 : 1]]);
  debug('id', id);
  debug('retrive associations', associateName);
  debug('restricted', restricted);
  return blm.db[name].findById(id, {
    transaction: context.transaction
  }).then(instance => instance ? instance['get' + associateName + 's']({
    transaction: context.transaction
  }).then(instances => {
    debug('found' + associateName, instances.length);
    const data = instances.map(i => toData(i, restricted, aModel.hideNull,
      aModel.timestamps, ids[idx], model.associationFields, model
      .name));
    return ({
      statusCode: 200,
      body: {
        data
      }
    });
  }) : Promise.reject(errors.notFound()));
};

const updateAssociation = (model, payload, blm, context) =>
  blm.db[model.name].update(payload.body, {
    where: whereIds(model.ids, payload, model.paranoid),
    limit: 1,
    fields: model.associationFields,
    validate: true,
    transaction: context.transaction
  }).then(affected => affected ?
    readAssociation(model, payload, blm, context, true) :
    Promise.reject(errors.notFound())
  );

const optionsOfAssociation = (data, t, associationFields, validate) => {
  const options = {};

  if (t) {
    options.transaction = t;
  }

  if (validate) {
    options.validate = true;
  }

  if (associationFields && associationFields.length) {
    associationFields.forEach(field => {
      options[field] = data[field];
    });
  }

  return options;
};

const createAndAssociate = (model, payload, blm, context) => {
  const idx = model.ids.findIndex(id => payload.params[id]);
  return blm.db[model.associates[idx]]
    .findById(payload.params[model.ids[idx]], {
      transaction: context.transaction
    }).then(instance => instance['create' + model.associates[idx ? 0 : 1]](
      payload.body,
      optionsOfAssociation(payload.body,
        context.transaction,
        model.associationFields,
        true)
    )).then(created => {
      const m = blm.db[model.associates[idx ? 0 : 1]].crud();
      return ({
        statusCode: 201,
        body: {
          data: toData(created, m.restrict, m.hideNull || [], m.timestamps)
        }
      });
    });
};

const associate = (model, payload, blm, context) => {
  const idx = model.ids.findIndex(id => payload.params[id]);
  return blm.db[model.associates[idx]]
    .findById(payload.params[model.ids[idx]], {
      transaction: context.transaction
    }).then(instance => instance ? (
      instance['add' + model.associates[idx ? 0 : 1]](
        payload.body[model.ids[idx ? 0 : 1]],
        optionsOfAssociation(payload.body,
          context.transaction,
          model.associationFields,
          true)
      ).then(() => ({
        statusCode: 204
      }))) : Promise.reject(errors.notFound()));
};

const createAndOrAssociate = (model, payload, blm, context) => {
  const idx = model.ids.findIndex(id => payload.params[id]);
  return blm.db[model.associates[idx]]
    .findById(payload.params[model.ids[idx]], {
      transaction: context.transaction
    }).then(instance =>
      instance['create' + model.associates[idx ? 0 : 1]](payload.body,
        optionsOfAssociation(payload.body,
          context.transaction,
          model.associationFields,
          true)
      ).then(created => {
        const m = blm.db[model.associates[idx ? 0 : 1]].crud();
        return ({
          statusCode: 201,
          body: {
            data: toData(created, m.restrict, m.hideNull || [], m.timestamps)
          }
        });
      }).catch(err => {
        if (err.name === 'SequelizeUniqueConstraintError') {
          return blm.db.sequelize.transaction(tr =>
            blm.db[model.associates[idx ? 0 : 1]].findOne({
              where: err.fields
            }, {
              transaction: tr
            }).then(other => other ?
              instance['add' + model.associates[idx ? 0 : 1]](other,
                optionsOfAssociation(payload.body, tr,
                  model.associationFields, true)
              ) : Promise.reject(errors.notFound())
            ).then(() => ({
              statusCode: 204
            })));
        }
        throw err;
      })
    );
};

const build = model => ({
  create: create.bind(null, model),
  read: read.bind(null, model),
  readAll: readAll.bind(null, model),
  replace: replace.bind(null, model),
  update: update.bind(null, model),
  delete: destroy.bind(null, model),
  readAssociation: readAssociation.bind(null, model),
  deleteAssociation: deleteAssociation.bind(null, model),
  readAllAssociations: readAllAssociations.bind(null, model),
  updateAssociation: updateAssociation.bind(null, model),
  createAndOrAssociate: createAndOrAssociate.bind(null, model),
  createAndAssociate: createAndAssociate.bind(null, model),
  associate: associate.bind(null, model)
});

const connectPipes = (operations, crud) => {
  const web = {};
  Object.keys(operations).forEach(op => {
    web[op] = crud[operations[op]];
  });
  return web;
};

module.exports = {
  setup: (config, blm) => config.map(name => {
    const crudModel = blm.db[name].crud();
    debug('crudModel', crudModel);
    const ctrl = build(crudModel);
    ctrl.operations = connectPipes(crudModel.operations, ctrl);
    ctrl.name = name;
    return ctrl;
  })
};
