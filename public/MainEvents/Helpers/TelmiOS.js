import * as path from 'path'
import * as fs from 'fs'

const defaults = {audioVolumeStartup: 0.3, audioVolumeMax: 0.6,
  screenBrightnessStartup: 0.3, screenBrightnessMax: 0.6,
  screenOnInactivityTime: 120, screenOffInactivityTime: 300, musicInactivityTime: 3600,
  storyDisplayTiles: false, storyDisableNightMode: false, storyDisableTimeline: false,
  musicDisableRepeatModes: false, bootSplashscreen: ''}

const
  getPathTelmiOsParameters = (drive) => {
    return path.join(drive, 'Saves/.parameters')
  },
  getPathTelmiOsFlashLogo = (drive) => {
    return path.join(drive, 'Saves/.flashLogo')
  },

  readTelmiOSParameters = (telmiDevice) => {
    let stored = {}
    try {
      const file = getPathTelmiOsParameters(telmiDevice.drive)
      if (fs.statSync(file).size <= 65536) {
        const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
        if (value && typeof value === 'object' && !Array.isArray(value)) stored = value
      }
    } catch { /* Missing or damaged settings must not hide an installed OS. */ }
    telmiDevice.telmiOS.parameters = {...defaults, ...stored}
    const pathFlashLogo = getPathTelmiOsFlashLogo(telmiDevice.drive)
    try {if(fs.existsSync(pathFlashLogo)) {
      telmiDevice.telmiOS.parameters.bootSplashscreen = fs.readFileSync(pathFlashLogo).toString('utf-8')
    } else {
      telmiDevice.telmiOS.parameters.bootSplashscreen = ''
    }} catch {telmiDevice.telmiOS.parameters.bootSplashscreen = ''}
    return telmiDevice
  },

  saveTelmiOSParameters = (telmiDevice) => {
    const parameters = {...telmiDevice.telmiOS.parameters}
    delete parameters.bootSplashscreen
    fs.writeFileSync(getPathTelmiOsParameters(telmiDevice.drive), JSON.stringify(parameters))
    if(telmiDevice.telmiOS.parameters.bootSplashscreen !== '') {
      fs.writeFileSync(getPathTelmiOsFlashLogo(telmiDevice.drive), telmiDevice.telmiOS.parameters.bootSplashscreen)
    }
  }

export {readTelmiOSParameters, saveTelmiOSParameters}
