# SAP HANA Database Connection Pool for Node

[![npm](https://img.shields.io/npm/v/hdb-pool.svg?style=flat-square)](https://www.npmjs.com/package/hdb-pool) [![Travis](https://img.shields.io/travis/ckyycc/hdb-pool.svg?style=flat-square)](https://travis-ci.org/ckyycc/hdb-pool) [![Coverage Status](https://coveralls.io/repos/github/ckyycc/hdb-pool/badge.svg?branch=master)](https://coveralls.io/github/ckyycc/hdb-pool?branch=master) [![npm downloads](https://img.shields.io/npm/dm/hdb-pool.svg)](https://www.npmjs.com/package/hdb-pool) [![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ckyycc/hdb-pool/blob/master/LICENSE)

HANA Database Connection pool for Node.js, inspired by (and copied some ideals from): [Generic Pool](https://github.com/coopernurse/node-pool).

This module supports [hana-client](https://help.sap.com/viewer/0eec0d68141541d1b07893a39944924e/2.0.03/en-US/58c18548dab04a438a0f9c44be82b6cd.html) and [node-hdb](https://github.com/SAP/node-hdb).
If both exist, the [hana-client](https://help.sap.com/viewer/0eec0d68141541d1b07893a39944924e/2.0.03/en-US/58c18548dab04a438a0f9c44be82b6cd.html) will be chosen.  

## Table of contents

* [Install](#install)
* [Getting started](#getting-started)
* [Creating a pool](#creating-a-pool)
* [Getting a connection](#getting-a-connection)
* [Returning a connection](#returning-a-connection)
* [Destroying a connection](#destroying-a-connection)
* [Clearing the pool](#clearing-the-pool)
* [Receiving events from pool](#receiving-events-from-pool)
* [Getting status overview of pool](#getting-status-overview-of-pool)
* [Running tests](#running-tests)
* [License](#license)

## Install
```bash
npm install hdb-pool
```

## Getting started


This is an example how to use this module:

```js
// import the module
const Pool = require('hdb-pool');

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
const pool = Pool.createPool(dbParams, options);

// execute some sample sql via the pool 
pool.getConnection()
    .then(conn => {
        conn.exec('select current_timestamp from dummy', (err, rows) => {
          //return the connection back to pool  
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

- `dbParams`: a dictionary containing the HANA DB connection information.
- `options` : a dictionary containing the configuration for the `Pool`

```js
const Pool = require('hdb-pool');
const pool = Pool.createPool(dbParams, options);
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
- `checkInterval`: how often to run resource timeout checks. (default=0, disabled)
- `idleTimeout`: the time of a connection staying idle in the pool that eligible for eviction. (default=30000)
- `debug`: a flag for emitting those debug message. (default=false, disabled)

### Getting a connection

```js
pool.getConnection()
    .then(conn => {...})
    .catch(err => {...});
```

Getting a HANA `connection` from the pool, the `getConnecction` does not have any argument. 

It returns a `Promise`. The promise will be resolved with a `connection` if the connection is available in the pool. And the promise will be rejected with an error if the pool is unable to give a connection(eg: timeout). 

### Returning a connection

```js
pool.release(connection)
    .then(() => {...})
    .catch(err => {...});
```

Returning a connection to the pool, the `connection` takes one required argument:

- `connection`: a 'borrowed' connection.

This function returns a `Promise`. This promise will resolve once the `connection` is accepted by the pool, or reject if the pool is unable to accept the `connection` for any reason (e.g `connection` is not a resource that came from the pool). If you do not care the outcome it is safe to ignore this promise.

### Destroying a connection

```js
pool.destroy(connection)
    .then(() => {...})
    .catch(err => {...});
```
Removing the connection from the pool and destroy the connection itself as well. The function takes one required argument:

- `connection`: a "borrowed" connection.

This function returns a `Promise`. This promise will resolve once the `connection` is accepted by the pool, If you do not care the outcome it is safe to ignore this promise.

### Clearing the pool
```js
pool.clear()
    .then(() => {...})
    .catch(err => {...});
```

This function clears the pool, removing/destroying all the connections and all the pending requests from the pool. 

### Receiving events from pool

```js
Pool.eventEmitter.on('poolDebug', myEventHandler);
Pool.eventEmitter.on('poolError', myEventHandlerError);
Pool.eventEmitter.on('connectionCreateError', myEventHandlerCreateError);
Pool.eventEmitter.on('connectionValidationError', myEventHandlerValidateError);
Pool.eventEmitter.on('requestTimeout', myEventHandlerValidateError);
```
Pool supports 5 different types of events:
- `poolDebug`: debug information of the pool, needs to be enabled by  [options.debug](#options) first.
- `poolError`: error information of the pool.
- `connectionCreateError`: connection creation error.
- `connectionValidationError`: connection validation error.
- `requestTimeout`: request timeout.

### Getting status overview of pool
```js
const overview = pool.getPoolStatusOverview();
```
This function will show the current status of the pool.

## Running tests
```bash
npm install
npm test
```

## License
 [MIT](/LICENSE)
