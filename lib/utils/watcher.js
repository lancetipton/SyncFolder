'use strict'
const chokidar = require('chokidar')
const watchers = {}
let inExit
/**
 * Loops all the cached file watchers, and remove them
 * @return { void }
 */
const stopWatch = () => Object.keys(watchers).map(
  watcher => watchers[watcher].close()
)

/**
 * Creates watchers on the passed in dirs
 * Adds event listeners to listen to file changes
 * @param  { object } tdConf - internal config object
 * @param  { method } onChange - method to call on a file change
 * @return { void }
 */
const watchDirs = (tdConf, onChange) => {
  Object.keys(tdConf.srcMap).map(srcDir => {
    // Ensure the watchers are not set twice
    if (watchers[srcDir] || !tdConf.srcMap[srcDir].length) return
    // Add to the watchers list, for ref later
    watchers[srcDir] = chokidar
      // Pass in an array of paths to be watched
      .watch(tdConf.srcMap[srcDir])
      // Listen for the ready, to start watching files
      .on('ready', () => tdConf.watchReady = true)
      // Listen to all events, if ready was called, call the onChange
      .on('all', (e, p, s) => tdConf.watchReady && onChange(tdConf, e, p, s))
  })
}

// Called multiple times for watchers, and child watchers
const exitEvent = eventType => {
  stopWatch()
  if(!inExit){
    inExit = true
    console.log(` ----- Got "Exit Event" from: ${eventType} -----`)
    console.log(` ----- Stopping Watchers -----`)
  }
}
// Watch all possiable exit types
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) =>
  process.on(eventType, exitEvent.bind(null, eventType))
)


module.exports = {
  stopWatch,
  watchDirs,
}
