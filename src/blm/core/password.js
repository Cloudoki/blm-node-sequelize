'use strict';
const Promise = require('bluebird');
const crypt = require('../../crypt');
const errors = require('../errors');

// Minimum 4 characters at least 1 Alphabet and 1 Number:
const regex = new RegExp(/^(?=.*\d)(?=.*[a-zA-Z]).{4,}$/);

const invalid = errors.badRequest.bind(null,
  'invalid password: Minimum 4 characters at least a number and a letter');

const invalidCurrent = errors.badRequest.bind(null,
  'invalid current password');

const samePass = errors.badRequest.bind(null,
  'new password is equal to current');

const hashPassword = (payload, blm, context) => {
  if (payload.operationId === 'patchUser' &&
    !payload.body.password &&
    payload.body.password !== '' &&
    !payload.body.current_password &&
    payload.body.current_password !== '') {
    return null;
  }

  if (payload.operationId === 'patchUser' &&
    !payload.body.current_password &&
    !payload.body.current_password !== '') {
    return Promise.reject(invalidCurrent());
  }

  if (!payload.body.password || !regex.test(payload.body.password)) {
    return Promise.reject(invalid());
  }

  const user = context.user || context.admin;

  return Promise.resolve()
    .then(() => {
      if (payload.operationId === 'patchUser') {
        return blm.db.User.unscoped()
          .findById(user.get('id'), {
            attributes: ['password', 'deleted_at'],
            transaction: context.transaction
          }).then(data => {
            if (!data || data.get('deleted_at') !== null) {
              throw new Error('unexpected user removal');
            }
            return crypt.compare(payload.body.current_password, data.get(
              'password'));
          }).then(isEqual => isEqual ?
            isEqual : Promise.reject(invalidCurrent())
          ).then(() => payload.body.current_password === payload.body.password ?
            Promise.reject(samePass()) : true
          );
      }
      return true;
    }).then(() => crypt.hash(payload.body.password))
    .then(h => payload.body.password = h);
};

const password = (payload, blm, context) => {
  switch (payload.operationId) {
    case 'postUser':
    case 'postInvitation':
    case 'patchUser':
    case 'resetPassword':
      return hashPassword(payload, blm, context);
    default:
      return null;
  }
};

module.exports = {
  hashPassword,
  password,
};
