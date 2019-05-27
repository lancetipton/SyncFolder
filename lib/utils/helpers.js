const path = require('path')
const fs = require('fs')
const findRoot = require('find-root')
let logMessage = process.env.LOG || true
let rootPath
try {
  rootPath = findRoot(path.dirname(require.main.filename))
}
catch(e){
  rootPath = path.dirname(require.main.filename)
}

/**
 * Updates message logging
 * @param  { boolean } to - toggle logs on and off
 * @return { void }
 */
const setLogging = (to) => logMessage = to

/**
 * Logs a message to console
 * @param  { string } message - message to log
 * @param  { string } type - console method to log the message
 * @return { void }
 */
const tdLog = (message, type) => {
  type = type || 'log'
  type === 'error'
    ? console.error(`\n----- [ SYNC ERROR ]-----\n\n${message}\n\n----- [ SYNC ERROR ]-----\n`)
    : logMessage && console[type](`[ SYNC ] ${message}`);
}

/**
 * Gets the root path set at require time
 * @return { srting } - rootPath
 */
const getRootPath = () => rootPath

/**
 * Converts args passed in from the cmd line into useage js object
 * @return object containing passed in args
 */
const getCmdArgs = () => {
  return process.argv.slice(2).reduce((args, val) => {
    const parts = val.split('=')
    args[ parts[0].replace('-', '') ] = parts[1] || true
    return args
  }, {})
}

/**
 * Helper method, called when no config can be found
 * Tries to load the config from the root or throws an error
 * @return { void }
 */
const noENV = () => {
  const config = reqFile('./sync.config.json')
  if (config) return config
  const message = 'ENV variables "CONFIG" or "LOC1 && LOC2 must be set"'
  tdLog(message, 'error')
  throw new Error(message)
}

/**
 * Helper method when the config is not formatted properly
 * @return { void }
 */
const noObj = () => {
  const message = 'Config file must return an object or function that returns an object'
  tdLog(message, 'error')
  throw new Error(message)
}

/**
 * Helper method to pull the sync locations from the command line
 * @param  { any } args - object
 * @return config object
 */
const getLocArgs = args => {
  const loc1 = args.l1 || args.loc1 || process.env.LOC1
  const loc2 = args.l2 || args.loc2 || process.env.LOC2
  // If no LOC args, throw error
  return !loc1 || !loc2
    ? noENV()
    : {
      ENV: {
        source: loc1,
        dest: [ loc2 ],
      }
    }
}

/**
 * Helper the check if a path exists
 * @param  {any} dataPath 
 * @return boolean
 */
const pathExists = dataPath => {
  return new Promise((res, rej) =>
    fs.access(dataPath, fs.constants.F_OK, err => err && res(false) || res(true))
  )
}

/**
 * Helper to require a file from the root path
 * @param  { string } filePath - file to require
 * @return required file
 */
const reqFile = filePath => {
  try {
    const reqPath = path.join(rootPath, filePath)
    tdLog(`Loading Path, ${reqPath}`)
    return require(reqPath)
  }
  catch (e){
    return false
  }
}

/**
 * Loads the config based on passed in path
 * @param  { string } configPath - path to config file
 * @return 
 */
const loadConfig = configPath => {
  // Try as js first
  let config = reqFile(path.join(configPath + '.js'))
  // then try as json if no config, or throw error
  return config || reqFile(path.join(configPath + '.json')) || noENV()
}

/**
 * Tries to find the correct config file to load
 * @param  { object } args - passed args when starting module
 * @return { object } found config file
 */
const getConfig = args => {
  // If no CONFIG arg, then check for LOC args
  // or try to load the CONFIG
  const configPath = args.c || args.config || process.env.CONFIG

  const config = !configPath
    ? getLocArgs(args)
    : reqFile(configPath) || loadConfig(configPath) || noENV()

  // If js returns a function, call the function
  const fConfig = typeof config === 'function'
    ? config()
    : config

  // Check that the final config is an object
  return typeof fConfig === 'object'
    ? fConfig
    : noObj()
}

/**
 * Finds the method to call when a file is changed
 * @param  { object } args - passed in args when calling the module
 * @param  { object } config - loaded config settings
 * @return { method } onChange function
 */
const getOnChange = (args, config) => {
  if (config.on_change){
    const onChange =
      reqFile(config.on_change) || reqFile(path.join(config.on_change + '.js'))
    if (!onChange){
      const message = `Can not find file at ${config.on_change}`
      tdLog(message, 'error')
      throw new Error(message)
    }
    return onChange
  }

  const onChangePath = args.oc || args.change || process.env.ON_CHANGE
  if (!onChangePath) return false
  return reqFile(onChangePath) || reqFile(path.join(onChangePath + '.js'))
}

/**
 * Get the src of the changed path
 * @param  { object } tdConf - internal config object
 * @param  { string } changedPath - path to file that was changed
 * @return { object } - conaines the src dir, change dir, linked dests
 */
const getSrcPath = (tdConf, changedPath) => {
  let foundSrc = Object.keys(tdConf.srcMap).reduce((found, srcPath) => {
    if (!found && changedPath.indexOf(srcPath) === 0){
      return { src: srcPath,  change: srcPath, dests: tdConf.srcMap[srcPath] }
    }

    return found
  }, null)

  return foundSrc || Object.keys(tdConf.dirMap).reduce((found, destPath) => {
    if (!found && changedPath.indexOf(destPath) === 0){
      const src = tdConf.dirMap[destPath]
      return { src: src, change: destPath,  dests: tdConf.srcMap[src] }
    }

    return found
  }, null)

}


module.exports = {
  getRootPath,
  getCmdArgs,
  getConfig,
  getOnChange,
  getSrcPath,
  pathExists,
  reqFile,
  setLogging,
  tdLog,
}
