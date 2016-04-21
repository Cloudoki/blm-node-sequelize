'use strict';
const types = require('../types');
const debug = require('debug')('blm:oauthaccesstoken:sql');
const tableName = 'oauth_access_tokens';
const name = 'OauthAccessToken';
const OauthAccessToken = sequelize => sequelize.define(name, {
  client_id: types.referenceCuid('oauth_clients', 'client_id'),
  user_id: types.referenceId('users'),
  access_token: types.token()
}, {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  tableName,
  classMethods: {
    setup: models => {
      models.OauthAccessToken.belongsTo(models.OauthClient, {
        foreignKey: 'client_id',
        as: 'oauthClient',
        targetKey: 'client_id'
      });
      models.OauthAccessToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        targetKey: 'id'
      });
      models.OauthAccessToken.addScope('defaultScope', {
        include: [{
          model: models.User,
          as: 'user',
          required: true
        }, {
          model: models.OauthClient,
          as: 'oauthClient',
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

module.exports = OauthAccessToken;
