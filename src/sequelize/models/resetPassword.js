'use strict';
const types = require('../types');
const debug = require('debug')('blm:resetPassword:sql');
const tableName = 'reset_password';
const name = 'ResetPassword';
const ResetPassword = sequelize => sequelize.define(name, {
  user_id: types.referenceId('users', 'id', true),
  reset_token: types.token()
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    setup: models => {
      models.ResetPassword.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        targetKey: 'id'
      });
      models.ResetPassword.addScope('defaultScope', {
        include: [{
          model: models.User,
          as: 'user',
          required: true
        }
      ],
        logging: debug
      }, {
        override: true
      });
    }
  },
  defaultScope: {
    logging: debug
  }
});

module.exports = ResetPassword;
