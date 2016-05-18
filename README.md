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
     - [Core middleware](#core-middleware)
       * [Authentication](#authentication)
       * [Authorization](#authorization)
       * [Password](#password)
       * [Alias](#alias)
     - [Sequelize](#sequelize)
       * [How to create a new model](#how-to-create-a-new-model)
       * [How to use the migrations](#how-to-use-the-migrations)
       * [How to revert a migration](#how-to-revert-a-migration)
     - [Mailer service](#mailer-service)
       * [How to add a new mail template](#how-to-add-a-new-mail-template)
     - [Logging](#logging)
     - [Debugging](#debugging)
     - [Error handling](#error-handling)
 * [API Reference](#api-reference)
 * [Testing and Coverage](#testing-and-coverage)
 * [Check linting](#check-linting)

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

You might also need to change the sequelize section of the configuration to match
your database credentials.

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

The name is just a string to identify
the module easily on logs and so on.

The operations corresponds to a object that
maps operationIds to the their handler.

To build this handler you should keep in mind the following:

- function signature, note do not use the `this` context since the operation will
be called without binding it to controller.

```javascript
handler(payload, blm, context) => response {object | Promise.<object>}
```

- [fields provided in the payload](https://github.com/Cloudoki/api-node-swagger#how-to-build-a-custom-message-payload)
for the specific operation and abstain from mutating the payload object or any of its nested references.

- You should return a promise (or the object directly for synchronous operations) with the
response object following the [interface expected on the api](https://github.com/Cloudoki/api-node-swagger#how-to-build-a-custom-response-handler) and taking into account the
[payload generated fields](https://github.com/Cloudoki/mq-node-amqp#payload-generated-fields).

- Besides the payload the handler will also be called with the blm as argument.
You can use the blm to access shared services, for example the mailer service `blm.mailer`,
the database modules `blm.db.YourModel`, and so on.

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

Sometimes a more complex setup of the controller is required. For that expose an
setup method on the controller and it will be called with the corresponding config namespace
which correspondes to `config.blm.nameOfTheController` and the BLM instance.
It should return an array of controllers objects or a promise that will resolve
to an array of controllers.

```javascript
setup(config, blm) => response {Array.<controllerObject> | Promise.<Array.<controllerObject>>}
```

#### Core middleware

##### Authentication

##### Authorization

##### Password

##### Alias

#### Sequelize

##### How to create a new model

##### How to use the migrations

##### How to revert a migration

#### Mailer service

##### How to add a new mail template

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
