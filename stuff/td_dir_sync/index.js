/*
Call Example
  $ node td_sync/index.js

Call with Args Example

  $ node td_sync/index.js -l1=./components -l2=../web/components
    - l1 = source dir
    - l2 = dest dir
    - can also use `loc1` and `loc2`

  $ node td_sync/index.js -st=2000
    - st = sync timeout ( time between re-syncing updates )
      - defaults to `1000`
      - can also set ENV VAR `SYNC_TIMEOUT`

  $ node td_sync/index.js -w
    - w = Watch for file changes
      - defaults to `true`
      - can also use `watch` or set ENV VAR `WATCH`

  $ node td_sync/index.js -c=./path/to/my/config/file
    - c = load a custom config file
      - defaults to `root/sync.config.js`
      - can also use `config` or set ENV VAR `CONFIG`
      - can be json or js
        - js must return an object or fuction that returns an object

  $ node td_sync/index.js -oc=./path/to/my/onChange/function
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
} = require('./helpers')
const { watchDirs, stopWatch } = require('./watcher')
const { initSync } = require('./sync')
const defOnChange = require('./event_cb')
let onChange

const tdConf = {
  dirMap: {},
  srcMap: {},
  syncing: {},
  fromCmd: !module.parent,
  syncTimeout: process.env.SYNC_TIMEOUT || 1000,
  watchChanges: process.env.WATCH !== 'false',
}

const setConfigItems = (args, config) => {
  setLogging(args.log || config.log || process.env.LOG || false)
  tdConf.syncTimeout = args.st || config.syncTimeout || tdConf.syncTimeout
  if (args.w === false || args.watch === false || config.watch === false)
    tdConf.watchChanges = false
}

/**
 * Init the folder sync. Loads the config, and cb method
 * Then starts watching the folders
 * @param  { object } args - config settings
 * @param  { function } cb - called when a watched dir is changed
 * @return {void}
 */
const tdSyncDirs = async (args, cb) => {
  args = args || {}
  try {
    // Load the config settings
    const config = getConfig(args)
    // throw if config can not be loaded
    if (!config) throw new Error('Config Not Found')
    // Get the onChange function, called when a watched dir changes
    onChange = cb || getOnChange(args, config) || defOnChange
    setConfigItems(args, config)
    // Sync all dest from src
    await initSync(config, tdConf, args)
    // Wait for the folders to get synced
    // Call watchDirs to watch for changes to all dirs
    tdConf.watchChanges && await watchDirs(tdConf, onChange, args)
  }
  catch (e){
    tdLog(e, 'error')
    stopWatch()
    tdConf.fromCmd
      ? process.exit(1)
      : null
  }
}

if (tdConf.fromCmd) tdSyncDirs(getCmdArgs())
else module.exports = tdSyncDirs

