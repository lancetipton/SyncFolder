'use strict'
const path = require('path')
const ncp = require('ncp').ncp
const rimraf = require('rimraf')
const { stopWatch } = require('./watcher')
const { pathExists, getRootPath, tdLog } = require('./helpers')
const configAttrs = [ 'watch', 'on_change', 'syncTimeout' ]
let fromCmd

/**
 * Removes whatever is found at the passed in path
 * @param  { string } toRemove - path to be removed
 * @return { promise | void }
 */
const removePath = toRemove => {
  // Remove the old dir, to overwrite with the src dir
  tdLog(` ----- Removing path at: ${toRemove} -----`)
  return new Promise((res, rej) =>
    rimraf(toRemove, err => err && rej(err) || res())
  )
}

/**
 * Filters out the src from an array of dests
 * @param  { string } src - location to copy from
 * @param  { array } dests - group of locations to update
 * @return filtered array of dests
 */
const syncWith = (src, dests) => dests.filter(dest => dest != src)

/**
 * Loops over array of dests and calls syncDir
 * @param  { string } src - location to copy from
 * @param  { array } dests - group of locations to update
 * @param  { string } type - type of update to make ( remove | update | undefined )
 * @param  { string } file - path that was updated relative to the src path
 * @return { promise | void }
 */
const syncWithSrc = async (src, dests, type, file) => {
  return Promise.all(dests.map(
    async destDir => await syncDir(src, destDir, type, file))
  )
}

/**
 * Replace the dest with the src content based on the type of change
 * Remove or updates a single path, or replaces entire path if type does not exist
 * @param  { string } src - location where change occurred
 * @param  { string } dest - location to update
 * @param  { string } type - type of update to make ( remove | update | undefined )
 * @param  { string } file - path that was updated relative to the src path
 * @return { promise | void }
 */
const syncDir = async (src, dest, type, file) => {
  try {
    return new Promise(async (res, rej) => {
      if (!src || !dest) return rej(new Error('Src and Dest are required!'))

      switch (type){
        case 'remove': {
          // Remove the path from each dest
          const removed = await removePath(path.join(dest, file))
          res(removed)
          break
        }
        case 'update': {
          // Copy the path to each dest
          ncp(path.join(src, file), path.join(dest, file),
            { clobber: true },
            err => err && rej(err) || res()
          )
          break
        }
        default: {
          // Copies the entire folder from src to dest
          ncp(src, dest, { clobber: true }, err => err && rej(err) || res())
        }
      }
    })
  }
  catch (e){
    stopWatch()
    console.error(e)
    return fromCmd
      ? process.exit(1)
      : null
  }
}

/**
 * Checks if dest is already set to be synced.
 * If not it syncs it with the src by calling syncDir
 * @param  { object } tdConf - internal config
 * @param  { string } src - path to be synced
 * @param  { array } dests - paths to be synced to
 * @return { promise | void }
 */
const buildSync = async (tdConf, srcDir, dests) => {
  try {

    if (!dests || !dests.length || tdConf.srcMap[srcDir]) return null
    // Cache the srcDir watcher, and sync the src with the dest
    if (!tdConf.srcMap[srcDir]) tdConf.srcMap[srcDir] = [ srcDir ]

    return Promise.all(dests.map(async destDir => {
      // If it's already been mapped to sync, don't add it
      if (tdConf.dirMap[destDir]) return
      // Setup the sync between src and dir
      await syncDir(srcDir, destDir)
      // Set the sync time for compare later
      tdConf.syncing[srcDir] = new Date().getTime()
      // Add the srcDir to the DirMap so we can find it later
      tdConf.dirMap[destDir] = srcDir
      // Add the destDir to the srcMap so it will be watched for changes
      tdConf.srcMap[srcDir].push(destDir)
      return null
    }))
  }
  catch (e){
    stopWatch()
    tdLog(e, 'error')
    return fromCmd
      ? process.exit(1)
      : null
  }
}

/**
 * Finds the src and dir paths relative to the root folder
 * Checks if src exists, and throws if it does not
 * Calls buildSync, to sync the src with the dests
 * @param  { object } tdConf - internal config
 * @param  { string } src - path to be synced
 * @param  { array } dests - paths to be synced to
 * @return { promise | void }
 */
const syncDirs = async (tdConf, src, dests) => {
  try {
    // If it's already been synced, just return
    if (tdConf.srcMap[src]) return
    // Get the sync dir
    const srcDir = path.join(getRootPath(), src)
    const exists = await pathExists(srcDir)
    if (!exists) throw new Error(`Source Dir does not exist at: ${srcDir}`)
    // Loop the dests and sync the dirs
    const destsFull = []
    Array.isArray(dests) && dests.map(dest => {
      // If the dest is no a string, then just return
      if (typeof dest !== 'string') return
      // Get the dest dir
      const destDir = path.join(getRootPath(), dest)
      // Cache the full dests paths
      destsFull.indexOf(destDir) === -1 && destsFull.push(destDir)
    })
    // Build the sync, and copy the src to all dests
    return await buildSync(tdConf, srcDir, destsFull)
  }
  catch (e){
    stopWatch()
    tdLog(e, 'error')
    return fromCmd
      ? process.exit(1)
      : null
  }
}

/**
 * Kicks off the sync process based on the config setting
 * @param  { object } config - config set by caller
 * @param  { object } tdConf - internal config
 * @return { promise | void }
 */
const initSync = (config, tdConf) => {
  fromCmd = tdConf.fromCmd
  try {
    tdLog(' -----Starting Sync -----')
    const toSync = config.dirs || config
    return Promise.all(Object.keys(toSync).map(async key => {
      // Ensure the configAttrs are not used on the dir sync
      if (configAttrs.indexOf(key) !== -1) return
      // Get the paths to sync
      const syncPaths = toSync[key]
      // Ensure we have data to sync
      if (typeof syncPaths.src !== 'string' || !syncPaths.dest) return
      // Ensure dests is an array
      const dests = !Array.isArray(syncPaths.dest)
        ? [ syncPaths.dest ]
        : syncPaths.dest
      // Sync all the dest to the src
      await syncDirs(tdConf, syncPaths.src, dests)
      tdLog(' ----- Finished Dir Sync -----')
      return null
    }))
  }
  catch (e){
    stopWatch()
    tdLog(e, 'error')
    return fromCmd
      ? process.exit(1)
      : null
  }
}

module.exports = {
  initSync,
  removePath,
  syncDirs,
  syncDir,
  syncWith,
  syncWithSrc,
}
