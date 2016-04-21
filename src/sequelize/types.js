'use strict';

const Sequelize = require('sequelize');

const types = Object.create(null);

const isAlpha = /^[A-Z]+$/i;

types.id = () => ({
  allowNull: false,
  autoIncrement: true,
  primaryKey: true,
  type: Sequelize.INTEGER
});

types.fixedId = () => ({
  allowNull: false,
  primaryKey: true,
  unique: 'compositeIndex',
  type: Sequelize.INTEGER
});

types.cuid = () => ({
  allowNull: false,
  type: Sequelize.CHAR(32),
  unique: true,
  primaryKey: true
});

types.fixedCuid = () => ({
  allowNull: false,
  type: Sequelize.CHAR(32),
  unique: 'compositeIndex',
  primaryKey: true
});

types.boolean = () => ({
  allowNull: false,
  type: Sequelize.BOOLEAN()
});

types.referenceId = (reference, key, unique) => {
  const id = types.fixedId();
  id.references = {
    model: reference,
    key: key || 'id'
  };
  if (typeof unique !== 'undefined') {
    id.unique = unique;
  }

  id.onDelete = 'CASCADE';
  id.onUpdate = 'CASCADE';
  return id;
};

types.referenceCuid = (reference, key, unique) => {
  const id = types.fixedCuid();
  id.references = {
    model: reference,
    key: key || 'id'
  };
  if (typeof unique !== 'undefined') {
    id.unique = unique;
  }
  id.onDelete = 'CASCADE';
  id.onUpdate = 'CASCADE';
  return id;
};

types.createdAt = () => ({
  allowNull: false,
  type: Sequelize.DATE,
  field: 'created_at'
});

types.updatedAt = () => ({
  allowNull: false,
  type: Sequelize.DATE,
  field: 'updated_at'
});

types.deletedAt = () => ({
  type: Sequelize.DATE,
  field: 'deleted_at'
});

types.name = () => ({
  allowNull: false,
  unique: false,
  type: Sequelize.STRING(32),
  validate: {
    notEmpty: true,
    isAlpha: val => isAlpha.test(val)
  }
});

types.uniqueName = () => {
  const name = types.name();
  name.unique = true;
  return name;
};

types.email = () => ({
  allowNull: false,
  unique: true,
  type: Sequelize.STRING(80),
  validate: {
    isEmail: true
  }
});

types.token = () => ({
  allowNull: false,
  type: Sequelize.CHAR(32),
  unique: true
});

types.password = () => ({
  allowNull: true,
  type: Sequelize.CHAR(60)
});

types.redirect_uri = () => ({
  allowNull: false,
  type: Sequelize.STRING(256)
});

module.exports = types;
