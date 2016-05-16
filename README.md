# blm-node-sequelize

## Installation

### Requirements

- node: >4.2
- npm: >3.3
- MySQL: >5.5

##### Create the database for your specific enviroment
```
mysql -u root --password=<PASS> -e "CREATE DATABASE IF NOT EXISTS app_<test|development|production>"
```

#### Install dependencies

```
npm install [--production]
```

#### Install [PM2](https://github.com/Unitech/pm2) globally to manage your node cluster
```
sudo npm install -g pm2
```

#### Create your local configuration file

You will need to add a local configuration file: `./config/local.yaml` that
will overwrite the configuration, check [node-config](https://github.com/lorenwest/node-config) for details on how the configuration is setup.

## Launching the application

Cluster mode

```
pm2 start ecosystem.json -env <development|production>
```

Single node directly launched

```
NODE_ENV=<production|development> npm run start -s
```
## Launching the application


#### Cluster mode

```
pm2 start ecosystem.json -env <development|production>
```

#### Single node

```
NODE_ENV=<production|development> npm run start -s
```

#### Gracefull reload

For continuous integration with no downtime

```
pm2 gracefulReload blm
```

#### Debug mode

```
npm run debug -s
```

## [mocha](https://mochajs.org/) Testing and [istanbul](https://github.com/gotwarlost/istanbul) Coverage

```
npm run test -s
```

Coverage reports will be generated at `./coverage`

## [eslint](http://eslint.org/) linting check

```
npm run lint -s

```
## [jsDoc](http://usejsdoc.org/) Documentation

```
npm run docs -s
```

Documentation will be generated at `./docs`


To inspect `./coverage` and `./docs` you may want to serve your local files.
You can use `http-server` for that:

```
npm install -g http-server
http-server
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
