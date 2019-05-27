const {
  getConfig,
  getOnChange,
  getCmdArgs,
  setLogging,
  tdLog,
} = require('./utils/helpers')
const { watchDirs, stopWatch } = require('./utils/watcher')
const { initSync } = require('./sync')
const defOnChange = require('./utils/event_cb')
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

const validateConfig = config => {
  // throw if config can not be loaded
  if (!config) throw new Error('Config Not Found')
  else if(!config.dirs || typeof config.dirs !== 'object')
     throw new Error(`Invalid Config: 'dir' attribute must be an object!`)
  else if(!config.dirs.src || typeof config.dirs.src !== 'string')
    throw new Error(`Invalid Config: 'dir.src' attribute must be a string!`)
  else if(!config.dirs.dest || !Array.isArray(config.dirs.dest))
    throw new Error(`Invalid Config: 'dir.dest' attribute must be an array!`)
  else if(config.dirs.dest.length === 0)
    throw new Error(`Invalid Config: 'dir.dest' is empty, not destinations to sync!`)
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
    validateConfig(config)
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
    tdLog(e.message, 'error')
    stopWatch()
    tdConf.fromCmd
      ? process.exit(1)
      : null
  }
}

if (tdConf.fromCmd) tdSyncDirs(getCmdArgs())
else module.exports = tdSyncDirs

