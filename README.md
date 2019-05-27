### Install

  * Clone the repo
    ```bash
      $ git clone https://github.com/lancetipton/jsUtils.git
    ```
  * cd into the cloned repo directory
    ```bash
      $ cd <path/to/cloned/repo>
      $ <yarn || npm> install
    ```


### Setup

  * Edit the sync.config.json file
    * Update `dirs.default.src` to point to source folder
      * Files get synced **FROM** this location when SyncFolder boots
    * Add destination paths to the `dirs.default.dest` array
      * Files get synced **TO** this location when SyncFolder boots
        * The source folder files will be copied into these paths
      * **Important**
        * Any files with the same name as the source files are overwritten
        * **You have been warned!**

### To Run
  ```bash
    $ node ./index.js
  ```


### Arguments

* Locations
  * `l1` = source dir ( from )
  * `l2` = dest dir ( to )
  * Can also use `loc1` and `loc2`

  ```bash
    $ node dir_sync/index.js -l1=./components -l2=../web/components
  ```

* Sync Timeout 
  * `st` = sync timeout ( time between re-syncing updates )
    * defaults to `1000`
    * can also set ENV VAR `SYNC_TIMEOUT`

  ```bash
    $ node dir_sync/index.js -st=2000
  ```

* Watch for file changes
  * `w` = Watch for file changes
    * defaults to `true`
    * can also use `watch` or set ENV VAR `WATCH`

  ```bash
    $ node dir_sync/index.js -w
  ```

* Custom Config File
  * `c` = load a custom config file
    * defaults to `root/sync.config.js`
    * can also use `config` or set ENV VAR `CONFIG`
    * can be json or js
      * js must return an object or fuction that returns an object

  ```bash
    $ node dir_sync/index.js -c=./path/to/my/config/file
  ```

* Custom file change function 
  * `oc` = load a custom onChange function
    * defaults to internal function
    * can also be `change` or set ENV VAR `ON_CHANGE`
    * Must be `.js` file

  ```bash
    $ node dir_sync/index.js -oc=./path/to/my/onChange/function
  ```
