'use strict';
const types = require('../types');
const utils = require('../utils');
const fields = require('../fields');
const debug = require('debug')('blm:user:sql');
const tableName = 'users';
const model = fields.user;
const name = model.name;

const User = sequelize => sequelize.define(name, {
  id: types.id(),
  firstname: types.name(),
  lastname: types.name(),
  email: types.email(),
  password: types.password()
}, {
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    setup: models => {
      models.User.belongsToMany(models.Account, {
        through: models.AccountUsers,
        onDelete: 'CASCADE'
      });
    },
    crud: () => model
  },
  defaultScope: {
    attributes: {exclude: ['password', 'created_at',
      'deleted_at', 'updated_at']},
    logging: debug
  },
  instanceMethods: {
    toJSON: utils.instanceToJSON(model, json => {
      if (json.AccountUsers) {
        json.role = json.AccountUsers.role;
        delete json.AccountUsers;
      }
    })
  }
});

module.exports = User;
