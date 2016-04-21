'use strict';
const crypto = require('crypto');
const Promise = require('bluebird');
const base64url = require('base64url');
const bcrypt = require('bcrypt');
const sizeToBytes = size => (Math.ceil(size / 4) * 3);
const TOKEN_SIZE = 32;
const TOKEN_BYTES = sizeToBytes(TOKEN_SIZE);

module.exports.token = size => new Promise((resolve, reject) =>
  crypto.randomBytes(size ? sizeToBytes(size) : TOKEN_BYTES, (err, buf) =>
    err ? reject(err) : resolve(base64url(buf).slice(0, size))
  ));

module.exports.hash = data => new Promise((resolve, reject) =>
  bcrypt.hash(data, 10, (err, hash) => err ? reject(err) : resolve(hash))
);

module.exports.compare = (data, hash) => new Promise((resolve, reject) =>
  bcrypt.compare(data, hash, (err, isEqual) =>
    err ? reject(err) : resolve(isEqual))
);
