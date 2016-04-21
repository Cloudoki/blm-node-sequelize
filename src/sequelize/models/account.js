'use strict';
const types = require('../types');
const utils = require('../utils');
const fields = require('../fields');
const debug = require('debug')('blm:account:sql');
const tableName = 'accounts';
const model = fields.account;
const name = model.name;

const Account = sequelize => sequelize.define(name, {
  id: types.id(),
  name: types.uniqueName()
}, {
  timestamps: true,
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    setup: models => {
      models.Account.belongsToMany(models.User, {
        through: models.AccountUsers,
        onDelete: 'CASCADE'
      });
    },
    crud: () => model
  },
  defaultScope: {
    attributes: {exclude: ['created_at', 'deleted_at', 'updated_at']},
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

module.exports = Account;
