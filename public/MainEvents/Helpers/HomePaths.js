import * as path from 'path'
import {createPathDirectories, rmDirectory} from './Files.js'
import {getShortPath} from './Paths.js'
import {storagePaths} from './Storage.js'

function homePaths(homeLongPath) {
  const
    homePath = getShortPath(homeLongPath),
    STORES_PATH = path.join(homePath, '.telmi', 'stores'),
    BIN_PATH = path.join(homePath, '.telmi', 'bin'),
    PARAMETERS_PATH = path.join(homePath, '.telmi', 'parameters')

  return {
    initAppPaths: () => {
      createPathDirectories(storagePaths(homeLongPath).stories)
      createPathDirectories(storagePaths(homeLongPath).music)
    },

    initTmpPath: (dirName) => {
      const dirPath = path.join(storagePaths(homeLongPath).work, dirName)
      rmDirectory(dirPath)
      createPathDirectories(dirPath)
      return dirPath
    },

    getTmpPath: (dirName) => {
      const root = storagePaths(homeLongPath).work
      return dirName === undefined ? root : path.join(root, dirName)
    },

    getStoriesPath: (dirStory) => {
      const root = storagePaths(homeLongPath).stories
      return dirStory === undefined ? root : path.join(root, dirStory)
    },

    getMusicPath: (fileAudio) => {
      const root = storagePaths(homeLongPath).music
      return fileAudio === undefined ? root : path.join(root, fileAudio)
    },

    getBinPath: (filePath) => {
      createPathDirectories(BIN_PATH)
      return filePath === undefined ? BIN_PATH : path.join(BIN_PATH, filePath)
    },

    getStoresPath: (filePath) => {
      createPathDirectories(STORES_PATH)
      return filePath === undefined ? STORES_PATH : path.join(STORES_PATH, filePath)
    },

    getParametersPath: (filePath) => {
      createPathDirectories(PARAMETERS_PATH)
      return filePath === undefined ? PARAMETERS_PATH : path.join(PARAMETERS_PATH, filePath)
    }
  }
}

export default homePaths
