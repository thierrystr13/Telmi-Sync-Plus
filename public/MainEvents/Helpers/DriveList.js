import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const execute = promisify(execFile)
// drivelist 11.2 has no published Windows N-API prebuild. Use the Windows CIM
// DriveInfo API through a fixed command; keep upstream drivelist on Linux/macOS.
export async function list() {
  if (process.platform !== 'win32') return (await import('drivelist')).list()
  const script = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop';
    $result=@([System.IO.DriveInfo]::GetDrives() | Where-Object {$_.DriveType -ne 'Network' -and $_.DriveType -ne 'CDRom' -and $_.IsReady} | ForEach-Object {
      $removable=($_.DriveType -eq 'Removable');
      @{device=$_.Name; devicePath=$_.Name; raw=$_.Name; description=$_.VolumeLabel; size=[double]$_.TotalSize;
        mountpoints=@(@{path=$_.Name; label=$_.VolumeLabel}); isRemovable=$removable; isSystem=(!$removable);
        isVirtual=$false; isReadOnly=$false; partitionTableType='mounted'}
    }); ConvertTo-Json -InputObject $result -Depth 5 -Compress`
  const {stdout} = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024})
  const data = JSON.parse(stdout.trim() || '[]')
  return Array.isArray(data) ? data : [data]
}
