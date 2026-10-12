import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import fs from 'node:fs/promises'

const execute = promisify(execFile)
export function shareDiscovery(discover, cacheMs = 3000) {
  let current = null, value = null, updated = 0
  return () => {
    if (current) return current
    if (value && Date.now() - updated < cacheMs) return Promise.resolve(value)
    current = Promise.resolve().then(discover).then(result => {value = result; updated = Date.now(); return result}).finally(() => {current = null})
    return current
  }
}
const sharedWindowsList = shareDiscovery(windowsList)
// drivelist 11.2 has no published Windows N-API prebuild. Use the Windows CIM
// DriveInfo API through a fixed command; keep upstream drivelist on Linux/macOS.
export async function list({physical = false} = {}) {
  if (process.platform !== 'win32') return (await import('drivelist')).list()
  // Formatting needs authoritative physical drive type; ordinary sync only
  // needs mounted volumes. Never infer that an unknown drive is removable.
  if (physical) return windowsMetadata()
  return sharedWindowsList()
}
async function windowsList() {
  return mountedWindowsVolumes(fs.statfs)
}
export async function mountedWindowsVolumes(statfs, timeoutMs = 3000) {
  const system = path.win32.parse(process.env.SystemRoot || 'C:\\Windows').root.toLowerCase()
  const results = await Promise.all(Array.from({length: 26}, async (_, index) => {
    const root = String.fromCharCode(65 + index) + ':\\'
    let timer
    try {
      const stat = await Promise.race([statfs(root), new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Unavailable volume')), timeoutMs)})])
      return {device: root, devicePath: root, raw: root, description: root,
        size: Number(stat.bsize) * Number(stat.blocks), mountpoints: [{path: root, label: root}],
        isRemovable: false, isSystem: root.toLowerCase() === system, isVirtual: false,
        isReadOnly: false, partitionTableType: null}
    } catch {return null} finally {clearTimeout(timer)}
  }))
  return results.filter(Boolean)
}
async function windowsMetadata() {
  const script = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop';
    $result=@([System.IO.DriveInfo]::GetDrives() | ForEach-Object {try {
      if ($_.DriveType -eq 'Network' -or $_.DriveType -eq 'CDRom' -or !$_.IsReady) {return}
      $removable=($_.DriveType -eq 'Removable');
      @{device=$_.Name; devicePath=$_.Name; raw=$_.Name; description=$_.VolumeLabel; size=[double]$_.TotalSize;
        mountpoints=@(@{path=$_.Name; label=$_.VolumeLabel}); isRemovable=$removable; isSystem=(!$removable);
        isVirtual=$false; isReadOnly=$false; partitionTableType='mounted'}
    } catch {}}); ConvertTo-Json -InputObject $result -Depth 5 -Compress`
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  let stdout
  try {
    ({stdout} = await execute(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024}))
  } catch (error) {
    throw new Error(error.killed ? 'La détection des lecteurs Windows est trop lente. Réessayez avec Actualiser.' : 'Impossible de lire les lecteurs Windows. Vérifiez que la carte apparaît dans l’Explorateur puis cliquez sur Actualiser.')
  }
  const data = JSON.parse(stdout.trim() || '[]')
  return Array.isArray(data) ? data : [data]
}
