const { getSrcPath, tdLog } = require('./helpers')
const { stopWatch } = require('./watcher')
const {  syncWith, syncWithSrc } = require('../sync')

/**
 * Event callback from chokidar. Can be overwritten
 * @param  { string } event - type of event
 * @param  { string } path - uri to the changed file
 * @return { void }
 */
const eventCB = async (tdConf, event, path) => {
  try {
    // If the event is an error, path will be the actual error, so throw it
    if (event === 'error') throw new Error(path)
    // Get the paths for the src, and chang dest
    const { src, dests, change } = getSrcPath(tdConf, path)
    // If can't find the data, then nothing to do
    if (!src || !dests || !change) return
    // Get the current time to test agains the last time it was synced
    const currentTime = new Date().getTime()
    const lastSync = tdConf.syncing[src]
    // If it's been less then the syncTimeout since the last sync, just return
    if ((currentTime - lastSync) < tdConf.syncTimeout) return
    // Get all dest, except for the changed path
    const toSync = syncWith(change, dests)
    // If nothing to sync just return
    if (!toSync || !toSync.length) return
    // Set flag for syncing
    tdConf.syncing[src] = currentTime
    // Gets the path to the change file or dir
    const fileBase = path.replace(change, '')

    switch (event){
      case 'unlink':
      case 'unlinkDir': {
        tdLog(`Syncing dests to remove event at ${change}`)
        // Remove the only the file base that was remove
        await syncWithSrc(change, toSync, 'remove', fileBase)
        break
      }
      case 'addDir':
      case 'add':
      case 'change': {
        tdLog(`Syncing dests to update event at ${change}`)
        // Update only the filebase that way updated
        await syncWithSrc(change, toSync, 'update', fileBase)
        break
      }
      default: {
        tdLog(`Re-syncing dests to src path: ${change}`)
        // Sync all the dests with the changed src
        // Syncs the entire folder
        await syncWithSrc(change, toSync)
      }

    }


  }
  catch (e){
    stopWatch()
    console.error(e)
    return tdConf.fromCmd
      ? process.exit(1)
      : null
  }
}


module.exports = eventCB
