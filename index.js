/*
Call Example
  $ node dir_sync/index.js

Call with Args Example

  $ node dir_sync/index.js -l1=./components -l2=../web/components
    - l1 = source dir
    - l2 = dest dir
    - can also use `loc1` and `loc2`

  $ node dir_sync/index.js -st=2000
    - st = sync timeout ( time between re-syncing updates )
      - defaults to `1000`
      - can also set ENV VAR `SYNC_TIMEOUT`

  $ node dir_sync/index.js -w
    - w = Watch for file changes
      - defaults to `true`
      - can also use `watch` or set ENV VAR `WATCH`

  $ node dir_sync/index.js -c=./path/to/my/config/file
    - c = load a custom config file
      - defaults to `root/sync.config.js`
      - can also use `config` or set ENV VAR `CONFIG`
      - can be json or js
        - js must return an object or fuction that returns an object

  $ node dir_sync/index.js -oc=./path/to/my/onChange/function
    - c = load a custom onChange function
      - defaults to internal function
      - can also be `change` or set ENV VAR `ON_CHANGE`
      - Must be `.js` file

*/
const {
  getConfig,
  getOnChange,
  getCmdArgs,
  setLogging,
  tdLog,
} = require('./lib/utils/helpers')
const syncDirs = require('./lib')

const runSync = async () => await syncDirs(getCmdArgs())

module.exports = syncDirs
// Auto run project sync if run from the CMD line
typeof process.mainModule.exports === 'function' && runSync()