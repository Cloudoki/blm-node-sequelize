'use strict';
const types = require('../types');
const debug = require('debug')('blm:invitation:sql');
const tableName = 'invitations';
const name = 'Invitation';
const Invitation = sequelize => sequelize.define(name, {
  account_id: types.referenceId('accounts'),
  user_id: types.referenceId('users'),
  referral_id: types.referenceId('users'),
  invitation_token: types.token()
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    setup: models => {
      models.Invitation.belongsTo(models.Account, {
        foreignKey: 'account_id',
        as: 'account',
        targetKey: 'id'
      });
      models.Invitation.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        targetKey: 'id'
      });
      models.Invitation.belongsTo(models.User, {
        foreignKey: 'referral_id',
        as: 'referral',
        targetKey: 'id'
      });
      models.Invitation.addScope('defaultScope', {
        include: [{
          model: models.User,
          as: 'user',
          required: true
        }, {
          model: models.User,
          as: 'referral',
          required: true
        }, {
          model: models.Account,
          as: 'account',
          required: true
        }
      ],
        attributes: {
          exclude: ['created_at']
        },
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

module.exports = Invitation;
