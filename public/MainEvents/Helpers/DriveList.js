import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const execute = promisify(execFile)
// drivelist 11.2 has no published Windows N-API prebuild. Use the Windows CIM
// API through a fixed command; keep upstream drivelist on Linux/macOS.
export async function list() {
  if (process.platform !== 'win32') return (await import('drivelist')).list()
  const script = `$ErrorActionPreference='Stop'; $result=@(Get-CimInstance Win32_DiskDrive | ForEach-Object {
    $disk=$_; $mountpoints=@(Get-CimAssociatedInstance -InputObject $disk -Association Win32_DiskDriveToDiskPartition | ForEach-Object {
      Get-CimAssociatedInstance -InputObject $_ -Association Win32_LogicalDiskToPartition | ForEach-Object { @{path=($_.DeviceID+'\\'); label=$_.VolumeName} }
    }); $removable=($disk.MediaType -match 'Removable' -or $disk.InterfaceType -eq 'USB');
    @{device=$disk.DeviceID; devicePath=$disk.DeviceID; raw=$disk.DeviceID; description=$disk.Model; size=[double]$disk.Size;
      mountpoints=$mountpoints; isRemovable=$removable; isSystem=(!$removable); isVirtual=$false; isReadOnly=$false;
      partitionTableType= $(if($disk.Partitions -gt 0){'mbr'}else{$null})}
  }); ConvertTo-Json -InputObject $result -Depth 5 -Compress`
  const {stdout} = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024})
  const data = JSON.parse(stdout.trim() || '[]')
  return Array.isArray(data) ? data : [data]
}
