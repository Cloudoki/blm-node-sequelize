# blm-node-sequelize

Boilerplate for Business Logic Module Layer - Node.JS - Sequelize

The Business Logic Module layer services the API Layer
([api-node-swagger](https://github.com/Cloudoki/api-node-swagger))
through the Message Queue layer ([mq-node-amqp](https://github.com/Cloudoki/mq-node-amqp)),
in a scalable and balanced matter. It is built on top of [sequelize](https://github.com/sequelize/sequelize)
an SQL ORM. It provides an mailer service with implemented for the Mandrill service
but can be easily changed to use other since it's implemented using the [nodemailer](https://github.com/nodemailer/nodemailer) module without using
any service specific feature with exception of the response handler,
 which should be changed/removed according to each service response.

 * [Features](#features)
 * [How to Install](#how-to-install)
 * [Configuration](#configuration)
 * [Launching the application](#launching-the-application)
     - [Cluster mode](#cluster-mode)
     - [Single node](#single-node)
     - [Graceful reload](#graceful-reload)
     - [Debug mode](#debug-mode)
 * [Usage](#usage)
     - [Executing requests](#executing-requests)
     - [How to create a controller and operation handler](#how-to-create-a-controller-and-operation-handler)
       * [Controller setup](#controller-setup)
     - [Core](#core)
       * [Authentication](#authentication)
       * [Authorization](#authorization)
       * [Password](#password)
       * [Alias](#alias)
     - [Sequelize](#sequelize)
       * [How to create a new model](#how-to-create-a-new-model)
       * [How to use the migrations](#how-to-use-the-migrations)
       * [How to use the revert a migration script](#how-to-use-the-revert-a-migration-script)
       * [How to use the CRUD controller](#how-to-use-the-crud-controller)
     - [Mailer service](#mailer-service)
       * [How to add a new mail template](#how-to-add-a-new-mail-template)
       * [How to change to a different mailing service](#how-to-change-to-a-different-mailing-service)
     - [Logging](#logging)
     - [Debugging](#debugging)
     - [Error handling](#error-handling)
 * [API Reference](#api-reference)
 * [Testing and Coverage](#testing-and-coverage)
 * [Check linting](#check-linting)

![3-Layer Architecture](http://i.imgur.com/6KbTryk.png)

## Features

- Integrates with the **3-layered architecture**:
    * Message Queue Layer [mq-node-amqp](https://github.com/Cloudoki/mq-node-amqp)
    * Business Logic Module [api-node-swagger](https://github.com/Cloudoki/api-node-swagger)
- **Operation oriented** with controllers and core service abstraction as middleware
- **OAuth2** Module
    * Implicit flow for client-side authentication (with invitation, reset password)
- Superadmin
    * Aliased operations redirection for endpoint reuse
- **Mailer** Service
    * Views for mail templates that are styled using a customizable UI package
- **Migrations** extensive use of database migrations and provided by the
[sequelize](https://github.com/sequelize/sequelize) module which allow for
automated and version controlled databases changes
- **Rollback** your latest changes to the database easily with the provided
revert script to migrate down the latest change.
- **CRUD** operations controller provided including some relations related operations
- **Highly configurable** with [config](https://github.com/lorenwest/node-config)
- Explicit and customizable **error handling** with normalized json output
- **Clustered** mode, graceful shutdown or reload with [PM2](https://github.com/Unitech/pm2)
- Integration and unit tests (with [mocha](https://mochajs.org/) and [supertest](https://github.com/visionmedia/supertest))
- Test code coverage ([istanbul](https://github.com/gotwarlost/istanbul) and generated report)
- Asynchronous logging with multi transport support ([winston](https://github.com/winstonjs/winston)) and promised logging
- Debug synchronously with diff timing ([debug](https://github.com/visionmedia/debug))
- [bluebird](https://github.com/petkaantonov/bluebird) promises

## How to Install

Requirements:

- node: >4.2
- npm: >3.3
- MySQL: >5.5
- RabbitMQ: >3.6.1 (or equivalent AMQP broker)

You will need the Message Queue Layer setup before you attempt to start the BLM as
it will try connect to it and abort (see: [mq-node-amqp](https://github.com/Cloudoki/mq-node-amqp)).

Create the database for your specific enviroment:
```
mysql -u root --password=<PASS> -e "CREATE DATABASE IF NOT EXISTS app_<test|development|production>"
```

Install dependencies:

```
npm install [--production]
```

Install [PM2](https://github.com/Unitech/pm2) globally to manage your node cluster

```
sudo npm install -g pm2
```

Create your local configuration file:

You will need to add a local configuration file: `./config/local.yaml` that
will overwrite the configuration, check the [configuration](#configuration) section
 for details on how the configuration is setup.

Bootstrap your application by creating the OAuth clients necessary (platform and
superadmin) and by creating a superadmin user.

```
NODE_ENV=<production|development> npm run bootstrap -s
```

This script will create the oauthClients needed and the superadmin users according
to the configuration. And output an JSON containing the tokens for each superadmin.
So you can start using the Swagger-UI by using this token for `api_key`,
you may instead just login (using the configured credentials) on the superadmin
client application.

## Configuration

For configuration the [config](https://github.com/lorenwest/node-config) module
that allows for configuration on specific enviroments:

 - `./config/development.yaml` for `NODE_ENV=development` or if `NODE_ENV` is not set
 - `./config/production.yaml` for `NODE_ENV=production`
 - `./config/test.yaml` for `NODE_ENV=test`

You will eventually need to create an `local.yaml` file
that replaces the default configuration on sensitive or server specific configuration
that is not pushed to version control (eg. github).

Your deployed `local.yaml` file should at least have the following configurations:

```yaml
blm:
  mailer:
    mandrill:
      auth:
        apiKey: your_mandrill_api_key
    mailFrom: 'YourName <info@domain.com>'
    platform: 'http://platform.domain.com/'
```

You might need to change the sequelize section of the configuration to match
your database credentials.

```yaml
# default settings
blm:
  sequelize:
    username: root
    password: root
    host: 127.0.0.1
```

You will want to change the scripts configuration namely:

```yaml
scripts:
  oauthclient:
    redirect_uri:
      platform: http://localhost:8080/auth.html
      superadmin: http://localhost:8081/auth.html
  superadmins:
    -
      firstname: Super
      lastname: Admin
      email: super@domain.com
      password: pass1
```

For local development enviroment these can do but you will need definitely
change these for other enviroments.

## Launching the application

#### Cluster mode

```
pm2 start ecosystem.json -env <development|production>
```

#### Single node

```
NODE_ENV=<production|development> npm run start -s
```

#### Graceful reload

For continuous integration with no downtime

```
pm2 gracefulReload blm
```

#### Debug mode

```
npm run debug -s
```

## Usage

#### Executing requests

Executing Remote Procedural Calls from the API Layer through the Message Queue

The processing is done with the executor provided by the [mq-node-amqp](https://github.com/Cloudoki/mq-node-amqp)
module.

```javascript
const amqp = require('mq-node-amqp');
amqp.createExecutor({
  connection: {
    url: 'amqp://localhost'
  },
  queue: {
    name: 'rpc'
  }
}).then(exec => executor.listen(function process(payload) {
    // do your processing here and return a promise of the result
    return Promise.resolve(payload)
  },
    err => console.log('failed to respond to a request', err);
  ));
```

This process function is built in `./src/blm/index.js` and performs the following
flow

```javascript
Promise.resolve()
  // calls core modules by the following order
  .then(() => core.authenticate(payload, blm, context))
  .then(() => core.authorize(payload, blm, context))
  .then(() => core.password(payload, blm, context))
  .then(() => core.alias(payload, blm, context))
  // the following will redirect the operation if needed, this redirection
  // is set in the alias core module
  .then(() => {
    // the op variable here corresponds to payload.operationId
    const operation = context.redirectOperation || op;
    if (!blm.dispatch[operation]) {
      throw errors.dispatch(url, op, method, context.redirectOperation);
    }
    return operation;
  // then it will call the specific operation from the registered controller
  }).then(operation => blm.dispatch[operation](payload, blm,
    context));
```

The operations are registered with the BLM on setup, by loading the controllers
from the controller dir. You will need to implement a controller and the operations
it performs. The operations must have unique identifier it will fail to setup
register the controller on setup if they are not.

#### How to create a controller and operation handler

The simplest example of a controller that implements a single operation is
the ping controller `./src/blm/controllers/ping.js`. It exports an object
with two fields `name` and `operations`.
Alternately you may instead return an object with the `setup` method
that will be called if needed (see: [controller setup](#controller-setup)) and
this should return the controller(s) instance(s).

The name is just a string to identify the module easily on logs and so on.
The operations corresponds to a object that maps operationIds to the their handler.

To build this handler you should keep in mind the following:

- function signature, note do not use the `this` context since the operation will
be called without binding it to controller.

```javascript
/** @returns response {object | Promise.<object>} */
module.exports.operations.myOperationId = function handler(payload, blm, context)
```

- [fields provided in the payload](https://github.com/Cloudoki/api-node-swagger#how-to-build-a-custom-message-payload)
for the specific operation and abstain from mutating the payload object or any of its nested references.

- You should return a promise (or the object directly for synchronous operations) with the
response object following the [interface expected on the api](https://github.com/Cloudoki/api-node-swagger#how-to-build-a-custom-response-handler) and taking into account the
[payload generated fields](https://github.com/Cloudoki/mq-node-amqp#payload-generated-fields).

- Besides the payload the handler will also be called with the blm as argument.
You can use the blm to access shared services, for example the mailer service `blm.mailer`,
the database modules `blm.db.YourModel`, logger `blm.logger` and so on.

- The **context** object will already have some defined fields which ones will depend
on the specific operation since it will go through different flow of core middlewares,
and you should be careful on assuming which are available since
if you may later on change call the operation from a alias redirect and it will
go through for example a different authorization flow which may not produce the
expected fields on the context object. However you can assume you have available
the following fields:
    * `context.transaction`: for every blm operation an sequelize transaction is initiated so that
    the conditions verified on the authentication and authorization still apply,
    you should by general rule use this transaction for all the controller operations
    on the database.
    * every request authenticated will produce an `context.user` or `context.admin`
    (instance of sequelize user model) and also an `context.isSuperadmin`
    that resolves which one is available.

    ```javascript
    if (blm.excludeAuthentication[payload.operationId]) {
        const userMakingTheRequest = context.isSuperadmin ? context.user : context.admin;
    }
    ```

##### Controller setup

Sometimes a more complex setup of the controller is required. For that expose an
setup method on the controller and it will be called with the corresponding config namespace
which correspondes to `configuration.blm.nameOfTheController` and the BLM instance.
It should return an array of controllers objects or a promise that will resolve
to an array of controllers.

```javascript
/** @returns {Array.<controllerObject> | Promise.<Array.<controllerObject>>} */
module.exports.setup = function ctrlSetup(config, blm)
```

#### Core

Core middlewares correspond to operations that modify the flow chain by
throwing a error (eg. unauthorize operation) or by operation redirection.
Mutations to the payload object should be avoided and when required used to a minimum.
Use the context object for sharing state with the rest of the chain and not
with the resolved value.
Usually you will want to add in middleware that apply to multiple operations, if
thats not the case, you might as well apply the function on operation handler in
 the controller itself.

##### Authentication

The authentication middleware `./src/blm/core/authentication.js` for operations not excluded,
 that is operations not listed in the `configuration.blm.excludeAuthentication` array, will
try to match the provided token (for the configured expiration `configuration.blm.oauth2.accessToken.expiration`)
in the payload with the available access tokens,
since each access token is associated with an application client id and user id
we are able to discern between applications and have the same user on
the superadmin application and the platform application (or any other).

Then if sucessful in finding the accessToken we can use the authorizations table
to identify if the match of user id and application client id matchs an superadmin
authorization or not. The `context.isSuperadmin` is set true if there's a match
and the current user data is referenced in `context.admin` or `context.user` depending
on if a superadmin or not respectively.

##### Authorization

The authorization `./src/blm/core/authorize.js` corresponds to basically a
switch on the operationId that applies an specialized authorization function
if required. Here the context object is usually populated and you may use this
on the controller to reduce the amount of queries to database. Make sure you
keep your context propriety names relevant and be careful to avoid collisions
along the chain.

##### Password

This middleware `./src/blm/core/password.js` provides a password operation
that validates and hashs the the password in the body field of the payload
it will attempt to match the stored one on update.

##### Alias

The alias middleware `./src/blm/core/alias.js` can be used to endpoint reuse,
that is for example in the superadmin application interface there are endpoints
that overlap with the base API, the alias middleware identifies this cases and
redirects the operation to the correct one if required.

Mutations to the payload object may occur here, but use with care.

It can also be used to populate the context object in cases where
the controller operations is expecting fields that since the superadmin
skips the authorization layer will miss.

#### Sequelize

To allow for more control we are not using the sequelize sync method which handles
 migrations for you and make sure the database matches your current defined models.
We make use of its sister library [umzug](https://github.com/sequelize/umzug).

On BLM setup up we verify the currently versioned migrations on the migrations
folder and compare to the stored in the SQL database, if they do not match it will
before start accepting requests migrate the database.

You may also use the Sequelize CLI since `.sequelizerc` is provided. Although you
should not need to. You may instead build an library of scripts such as the provided revert script
`./bin/revert.js`.

Also the additional parameters for migrations won't be
used on the CLI so you should take that into account since migrations that make
use of the additional arguments will fail.

##### How to create a new model

To get started on a new model, create a new file in `./src/sequelize/models`.
you will need to export the a function that that will be called with the
`sequelize` instance and the `Sequelize.DataTypes`. Usually you will want here to
call the `sequelize.define` method.

After all the models are defined you may asynchronously setup relations by setting
up a class method of the model named `setup`.

```javascript
/** @returns { Any | Promise.<Any> } */
YourModelClass.setup(db, config)
```

If you are using the CRUD controller you will also need to implement here the
`crud` method which should return an descriptive model object (see: [how to use the CRUD controller](#how-to-use-the-crud-controller)).

- [Sequelize models documentation](http://docs.sequelizejs.com/en/latest/docs/models-definition/)

##### How to use the migrations

To get started on a new migration, create a migration.js file in `./src/sequelize/migrations`
with a similar name format `YYYYMMDDHHmm-title-of-the-migration.js`.
you will need to export the `up` and `down` methods which both should return a
promise, a simple example is the first migration `201601311000-create-users.js`.

Umzug migrations parameters (`./bin/start.js`):

```javascript
umzugCfg.migrations.params = [
    // the query interface
    db.sequelize.getQueryInterface(),
    // Sequelize module
    db.Sequelize,
    // initialized models
    db
];
```

- [Sequelize migrations documentation](http://docs.sequelizejs.com/en/latest/docs/migrations/)

##### How to use the revert a migration script

To use it you can just run the script when needed, it will rollback the
last migration applied to the database using the `down` method of
that corresponding migration.

```
npm run revert -s
```

Note that it will then not output anything to the console except in case of error.

##### How to use the CRUD controller

In order to use use the CRUD controller you will need to implement the `crud`
class method on your model which returns an descriptive object of the model.
You can use the provided models as examples:  `user`, `account`, `accountUsers`.

Crud operations available, (see: `./src/blm/controllers/crud.js`):

- create: creates a new instance

- read: reads a instance, requires `payload.params.id`

- readAll: returns all instances of the model

- replace: updates the instance of the model for the fields defined in `crud.replace`,
requires `payload.params.id`

- update: updates the instance of the model for the fields defined in `crud.replace`

- delete: removes the instance of the model (if it is a paranoid model will instead set the deleted_at field), requires `payload.params.id` this will respond with `204` empty response if sucessful

- readAssociation: returns the association model, requires `payload.params.<ids>` which are defined in `crud.ids`

- deleteAssociation: destroys an association, requires `payload.params.<ids>` which are defined in `crud.ids`

- readAllAssociations: returns all assocations of one instance (defined in the payload parameters) to other model with `payload.params.<id>` which corresponds to one of the ids defined in `crud.ids`

- updateAssociation: similar to update but for an association, requires `payload.params.<id>` which corresponds to one of the ids defined in `crud.ids`

- createAndAssociate: creates with the fields in `payload.body` an instance of a model and associates it with an exiting one. It also creates the association model from the defined `crud.associationFields` in `payload.body`, requires `payload.params.<id>` which corresponds to one of the ids defined in `crud.ids` to identify the exiting model.

- associate: creates an association between two existing models, requires `payload.params.<ids>` which are defined in `crud.ids`

- createAndOrAssociate: similar to createAndAssociate but if the model already exists (fails with unique constraint)
will instead associate the two existing models

Some examples:

```javascript
{
  // name of the Model
  name: 'User',
  // operations that should be bind to
  operations: {
    getUser: 'read',
    getUsers: 'readAll',
    patchUser: 'update',
    deleteUser: 'delete',
    postUser: 'create'
  },
  // name the fields that are allowed to be updated
  update: ['firstname', 'lastname', 'password'],
  // remove these fields from the output
  restrict: ['password'],
  // fields that may be null: they will be removed if they are null
  nullable: [],
  // describe if the model is in paranoid mode (deleted_at will be present)
  paranoid: true
},

// relational example
{
  name: 'AccountUsers',
  operations: {
    deleteAccountUser: 'deleteAssociation',
    postUserAccount: 'createAndAssociate',
    getUserAccounts: 'readAllAssociations'
  },
  // ids correspond to the matching parameters names in for example
  // /accounts/{account_id}/users
  // /users/{user_id}/accounts
  // /accounts/{account_id}/users/{user_id}
  ids: ['account_id', 'user_id'],
  // the model that corresponds to the above parameter name (order matters)
  associates: ['Account', 'User'],
  ...
}

// you may want to mutate the returned object when including associations
// for example an user that has a role in a specific account that is defined
// in the account_users table
{
  ...
  association: 'accountUsers',
  associationFields: ['role']
}
// this will mutate the user object returned from
// user {
//   ...
//   accountUsers: {
//     id: 1,
//     role: 'admin'
//   }
// }
//
// to
//
// user {
//   ...
//   role: 'admin'
// }
//
```

You will also need add to list in the configuration of which models have CRUD operations
in `configuration.blm.crud` if you are adding a new model using the crud controller
for some operations.

#### Mailer service

To use this service you can access it through `blm.mailer`. To send mails
you can use the sendMail method, the options correspond to the
[nodemailer data object](https://github.com/nodemailer/nodemailer#e-mail-message-fields)
with some added properties and enhanced behaviour (see: `./src/mailer.js`).
The views are generated from templates using [express-handlebars](https://github.com/ericf/express-handlebars)

```javascript
/**
 * sendMail
 *
 * @param {object} options              nodemailer data with some added options
 *                                      fields
 *
 * @param {string | array} [options.from=configuration.mailer.mailFrom]
 *                  				   	defines `from` field in the mail, it will
 *                  				   	by default use the configured mailFrom
 *                  					
 * @param {string} [options.template]   name the template to generate the html
 *                                      (note: options.html must not be provided)
 *                                     
 * @param {object} [options.context]    object with data to supply the template generator
 *                                      this object will also be used as options in the
 *                                      to renderView of the express-handlebars module
 *                          
 * @return {Promise.<object>}           mail service api response
 */
blm.mailer.sendMail(options).then(response => console.log('mail sent', response));
```

##### How to add a new mail template

You will need to create a new file in the `./src/views` folder with name format
`templatename.mail.hbs`, you can also optionally provide a template for the subject
`templatename.subject.hbs`.

This template will be default use the mail layout,
but you may provide your own in the `./src/views/layouts` and when calling the sendMail method
provide the layout filename in `options.context.layout` property.

```javascript
blm.mailer.sendMail({
  to: 'someone@example.com',
  template: 'templatename',
  context: {
    data: {
      somedata: 'here'
    },
    layout: 'otherlayout'
  }
})
```

##### How to change to a different mailing service

You will need to make some changes to the `./src/mailer.js`. Here's how to replace
the current to the SendGrid mailing service.

- replace previous mandrill dependency and with sendgrid transport.

```
npm remove --save nodemailer-mandrill-transport
```

```
npm install --save nodemailer-sendgrid-transport
```

- replace the require statement

```javascript
const sendgridTransport = require('nodemailer-sendgrid-transport');

// const mandrillTransport = require('nodemailer-mandrill-transport');
```
- replace the handleMailerResponse function

```javascript
const handleMailerResponse = (resolve, reject) =>
  (err, res) => err ? reject(err) : resolve(res);

/**
const handleMailerResponse = (resolve, reject) => (err, res) => {
  if (err) {
    return reject(err);
  }

  if (res.accepted.length) {
    return resolve(res);
  }

  if (res.rejected.length) {
    const error = new Error(res.rejected[0] ?
      res.rejected[0].reject_reason : 'rejected');
    error.code = 'MAIL_REJECTED';
    return reject(error);
  }

  reject(new Error('unexpected mailer response'));
};
*/
```

- replace transport

```javascript
const sendgrid = nodemailer.createTransport(
  sendgridTransport(config.sendgrid)
);

sendgrid.use('compile', htmlToText(config.htmlToText));

return {
  sendgrid,

  ...

  .then(() => new Promise((resolve, reject) =>
    sendgrid.sendMail(options, handleMailerResponse(resolve, reject))))

/**
const mandrill = nodemailer.createTransport(
  mandrillTransport(config.mandrill)
);
mandrill.use('compile', htmlToText(config.htmlToText));
const mandrillClient = mandrill.transporter.mandrillClient;
return {
  mandrill,
  mandrillClient,

  ...

  .then(() => new Promise((resolve, reject) =>
    mandrill.sendMail(options, handleMailerResponse(resolve, reject))))
*/
```

- replace your local configuration

```yaml
blm:
  sendgrid:
    auth:
      api_key: your_sendgrid_api_key

#blm:
#  mandrill:
#    auth:
#      apiKey: your_mandrill_apiKey
```

#### Logging

For logging you may use the provided log builder `./src/log.js` it uses the
[winston](https://github.com/winstonjs/winston) module that provides asynchronous
 logging and multiple transports. The builder provides an easy way to setup
 multiple transports from a single configuration. You will want to keep them
 to two arguments: message and data object. Avoid doing computation intensive
 actions to generate this data object.

 ```javascript
logger.info('your message here', {
  time: new Date().toISOString()
  something: yourvariable
})
```

If you want to wait on logging callback you can use the promise api:

```javascript
logger.promise.info('log this please').then(() => doSomethingAfterLogging())
```

#### Debugging

For debugging your application you should use the [debug](https://github.com/visionmedia/debug)
module which namepscaes different of your code and diffs the time between debug sections
it will only be active for namespaces provided in the DEBUG environment variable.

`DEBUG=blm:*` is the one used for npm debug script (`npm run debug`). But you may want to debug specific sections (eg: `DEBUG:mailer,blm:oauth2`).

As long as your are not doing a compute intensive task to produce the object to debug
you may leave the debug statment there since it will be converted to noop function
(`() => ()`) if not in debugging mode and shouldn't affect performance.

#### Error handling

All errors on the controllers or core  if not handled are propagated to the
process error handler defined at `./src/blm/errors.js` or if the controller is
not found it will generate a dispatch error instead. This handler is mounted
at the end of the blm process chain in the init script `./src/blm/index.js`.

It will generate an response object with the following format:

```javascript
{
  statusCode: 401,
  body: {
    errors: [{
      code: 'UNAUTHORIZED',
      message: 'token invalid or expired'
    }]
  }
}
```

If you want to propagate an error make sure it is created with code and status
property so that it will not throw an unexpected error instead.

```javascript
// error in a route handler
  if (conditionNotMet) {
    const err = new Error('your message');
    err.code = 'YOUR_CODE';
    err.status = 400;
    throw err;
  }
```

## API Reference

- [jsDoc](http://usejsdoc.org/)

```
npm run docs -s
```

API Reference Documentation will be generated at `./docs`


To inspect `./coverage` and `./docs` you may want to serve your local files.
You can use `http-server` for that:

```
npm install -g http-server
http-server
```

## Testing and Coverage

 - [mocha](https://mochajs.org/)
 - [istanbul](https://github.com/gotwarlost/istanbul)

```
npm run test -s
```

Coverage reports will be generated at `./coverage`

## Check linting

- [eslint](http://eslint.org/)

```
npm run lint -s
```
