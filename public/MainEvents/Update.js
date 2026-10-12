import { app, ipcMain } from 'electron'
import { requestJson } from './Helpers/Request.js'
import { isNewerVersion } from './Helpers/Version.js'

function mainEventUpdate (mainWindow) {
  ipcMain.on('app-version-get', () => {
    mainWindow.webContents.send('app-version', app.getVersion())
  })

  ipcMain.on(
    'check-update',
    async () => {
      const json = await requestJson('https://api.github.com/repos/thierrystr13/Telmi-Sync-Plus/releases', {})
      if (!json.length || !isNewerVersion(app.getVersion(), json[0].tag_name)) {
        return
      }
      mainWindow.webContents.send('check-update-data', 'https://github.com/thierrystr13/Telmi-Sync-Plus/releases')
    }
  )
}

export default mainEventUpdate
