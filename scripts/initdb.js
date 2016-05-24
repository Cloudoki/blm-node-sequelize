#!/usr/bin/env node
'use strict';

const crypt = require('../src/crypt');
const debug = require('debug')('initdb');
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const sequelize = require('../src/sequelize');
const config = require('config');
const sqlConfig = config.get('blm.sequelize');
sqlConfig.logging = debug;
debug('sqlConfig', sqlConfig);

sequelize(sqlConfig)
.then( (db) => {

    debug('db', Object.keys(db));

    if( process.argv.length < 2 ){
    	console.log("Invalid arguments. No arguments.");
    	process.exit();
    }
    return crypt.hash(process.argv[2])
    	.tap( () => { return db.sequelize.authenticate() })
    	.then( (password) => {
	
		return db.User.create({
			firstname: "Super",
			lastname: "Admin",
			email: "admin@domain.com",
			password: password
		});

    	}).then(function(res){
		console.log(res);
    	});

});

