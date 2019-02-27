# HANA Database Connection Pool


HANA Database Connection pool for Node.js, inspired (and copied some ideals) by: [Generic Pool](https://github.com/coopernurse/node-pool).

This module depends on the new hana-client  ([documentation](https://help.sap.com/viewer/0eec0d68141541d1b07893a39944924e/2.0.03/en-US/58c18548dab04a438a0f9c44be82b6cd.html)).


## Install
```bash
npm install node-hdb-pool
```

## Getting started


This is an example how to use this module:

```js
// import the module
const Pool = require('node-hdb-pool');

// HANA connection info
const dbParams = {
    hostName: 'hana-server-name',
    port: '30015',
    userName: 'user-name',
    password: 'user-password'
};

// pool options
const options = {
    min: 2,
    max: 15,
};

// create the pool
const pool = new Pool(dbParams, options);

// execute some sample sql via the pool 
pool.getConnection()
    .then(connection => {
        connection.exec('select current_timestamp from dummy', (err, rows) => {
            pool.release(client);
            if (err) {
                // error handling
            } else {
                // handle the result: rows
            }
        });
    })
    .catch(err => {
        // error handling
    });
```

### Creating a pool

The pool constructor takes two arguments:

- `dbParams`: a dictonary containing the HANA DB connection information.
- `options` : a dictonary containing the configuration for the `Pool`

```js
const Pool = require('node-hdb-pool');
const pool = new Pool(config, options);
```
#### dbParams

A dictionary with following properties:

- `hostName`: host name of HANA server.
- `port`: port number.
- `userName`: user name.
- `password`: password.

#### options

An <i>optional</i> dictionary with the any of the following properties:

- `max`: maximum number of resources to create at any given time. (default=50)
- `min`: minimum number of resources to keep in pool at any given time. (default=3)
- `maxWaitingRequests`: maximum number of waiting requests allowed. (default=0, no limit)
- `requestTimeout`: max milliseconds a `request` will wait for a resource before timing out. (default=5000)
- `checkInterval`: How often to run resource timeout checks. (default=0, disabled)
- `idleTimeout`: the minimum amount of time that an connection may sit idle in the pool before it is eligible for eviction due to idle time. (default=30000)
- `debug`: a flag for emitting those debug message. (default=false, disabled)

### Getting a connection

```js
pool.getConnection().then(connection => {...});
```

### Returning a connection

```js
pool.release(connection).then(() => {...});
```

This function is for when you want to return a connection to the pool.

`connection` takes one required argument:

- `connection`: a previously 'borrowed' connection

This function returns a `Promise`. This promise will resolve once the `connection` is accepted by the pool, or reject if the pool is unable to accept the `connection` for any reason (e.g `connection` is not a resource that came from the pool). If you do not care the outcome it is safe to ignore this promise.

### Destroying a connection

```js
pool.destroy(connection).then(() => {...});
```

This function is for when you want to return a connection to the pool but want it destroyed rather than being made available to other requests. E.g you may know the connection has timed out or crashed.

`destroy` takes one required argument:

- `connection`: a previously borrowed connection

This function returns a `Promise`. This promise will resolve once the `connection` is accepted by the pool, If you do not care the outcome it is safe to ignore this promise.

### Clearing the pool
```js
pool.clear().then(() => {...});
```

This function clears the pool, destroys all the connections in the pool and all the pending requests. 

### Receiving the event from pool

```js
pool.eventEmitter.on('poolDebug', myEventHandler);
pool.eventEmitter.on('poolError', myEventHandlerError);
pool.eventEmitter.on('connectionCreateError', myEventHandlerCreateError);
pool.eventEmitter.on('connectionValidationError', myEventHandlerValidateError);
pool.eventEmitter.on('requestTimeout', myEventHandlerValidateError);
```
pool supports five types event:
- `poolDebug`: debug infomation of the pool, needs to be enabled by options.debug first.
- `poolError`: error infomation of the pool.
- `connectionCreateError`: connection creation error.
- `connectionValidationError`: connection validation error.
- `requestTimeout`: request timeout.

## Run Tests
```bash
    npm install
    npm test
```

## License
 [MIT](/LICENSE)
