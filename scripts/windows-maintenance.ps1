param([ValidateSet('Inventory','CleanInstall')][string]$Mode='Inventory',[string]$Installer,[string]$InstallerSha256,[string]$BackupRoot,[switch]$FullLibraryBackup)
$ErrorActionPreference='Stop'
$taskAllowed=@((Join-Path $env:LOCALAPPDATA 'Programs\telmi-sync'),(Join-Path $env:LOCALAPPDATA 'Programs\TELMI Sync Plus'),(Join-Path $env:ProgramFiles 'TELMI Sync Plus'))
$taskRegistry=@('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall')
$taskEntries=@(foreach($taskKey in $taskRegistry){Get-ItemProperty "$taskKey\*" -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -match '^(Telmi Sync|TELMI Sync Plus)(\s+\d.*)?$'} | ForEach-Object {
 $taskMatch=[regex]::Match($_.UninstallString,'^"([^"]+\.exe)"(.*)$')
 if(!$taskMatch.Success){throw 'Desinstalleur TELMI inattendu'}
 $taskUninstaller=[IO.Path]::GetFullPath($taskMatch.Groups[1].Value)
 if($taskAllowed -notcontains (Split-Path $taskUninstaller)){throw 'Installation hors des emplacements TELMI connus'}
 [pscustomobject]@{Name=$_.DisplayName;Version=$_.DisplayVersion;Registry=$_.PSPath;Uninstaller=$taskUninstaller;Arguments=$taskMatch.Groups[2].Value.Trim()}
 }})
$taskEntries|ConvertTo-Json -Depth 3
if($Mode -eq 'Inventory'){return}
if(!$Installer -or !$InstallerSha256 -or !(Test-Path -LiteralPath $Installer)){throw 'Installateur verifie obligatoire avant nettoyage'}
if((Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash -ne $InstallerSha256){throw 'Empreinte installateur incorrecte'}
if(!$BackupRoot){throw 'Dossier de sauvegarde explicite obligatoire'}
$taskBackup=[IO.Path]::GetFullPath($BackupRoot)
if($taskAllowed | Where-Object {$taskBackup.StartsWith($_,[StringComparison]::OrdinalIgnoreCase)}){throw 'Sauvegarde dans une installation interdite'}
New-Item -ItemType Directory -Path $taskBackup -Force|Out-Null
$taskIsAdmin=([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(Test-Path -LiteralPath (Join-Path $taskBackup 'result.json')){
 $taskPrevious=Get-Content -LiteralPath (Join-Path $taskBackup 'result.json') -Raw|ConvertFrom-Json
 if($taskPrevious.status -eq 'verified' -and $taskPrevious.installerSha256 -eq $InstallerSha256 -and $taskEntries.Count -eq 1 -and $taskEntries[0].Version -eq $taskPrevious.version){Write-Output 'Installation deja verifiee; aucune action.';return}
 if($taskPrevious.status -eq 'pending-administrator' -and $taskPrevious.installerSha256 -eq $InstallerSha256 -and !$taskIsAdmin){Write-Output 'Installation utilisateur deja verifiee; ancienne installation machine attend les droits administrateur.';return}
}
Write-Output 'Arret des processus TELMI identifies.'
Get-Process -Name 'Telmi Sync','TELMI Sync Plus' -ErrorAction SilentlyContinue|Where-Object {$_.Path -and $taskAllowed -contains (Split-Path $_.Path)}|ForEach-Object {Stop-Process -Id $_.Id -Force -ErrorAction Stop}
Write-Output 'Inventaire des bibliotheques personnelles.'
$taskHome=Join-Path $env:USERPROFILE '.telmi'
$taskMediaRoots=@((Join-Path $taskHome 'stories'),(Join-Path $taskHome 'music'))
$taskMediaManifest=@(foreach($taskMediaRoot in $taskMediaRoots){if(Test-Path -LiteralPath $taskMediaRoot){Get-ChildItem -LiteralPath $taskMediaRoot -Recurse -File -Force -ErrorAction Stop | ForEach-Object {@{source=$_.FullName;length=$_.Length;modified=$_.LastWriteTimeUtc.Ticks}}}})
$taskMediaManifest|ConvertTo-Json -Depth 3|Set-Content -LiteralPath (Join-Path $taskBackup 'preserved-library-manifest.json') -Encoding utf8
Write-Output ('Inventaire termine : '+$taskMediaManifest.Count+' fichiers personnels conserves sur place.')
$taskData=@((Join-Path $env:APPDATA 'telmi-sync'),(Join-Path $env:APPDATA 'telmi-sync-plus'),(Join-Path $env:APPDATA 'TELMI Sync Plus'))
if($FullLibraryBackup){$taskData+= $taskHome}else{$taskData+=(Join-Path $taskHome 'parameters');$taskData+=(Join-Path $taskHome 'stores')}
$taskRequired=0
foreach($taskDataRoot in $taskData){if(Test-Path -LiteralPath $taskDataRoot){$taskRequired+=(Get-ChildItem -LiteralPath $taskDataRoot -Recurse -File -Force|Measure-Object Length -Sum).Sum}}
$taskFree=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($taskBackup)).AvailableFreeSpace
if($taskFree -lt ($taskRequired+1GB)){throw 'Espace insuffisant pour la sauvegarde et installation; aucune desinstallation effectuee'}
$taskManifest=@(foreach($taskSource in $taskData){if(Test-Path -LiteralPath $taskSource){$taskDestination=Join-Path $taskBackup (Split-Path $taskSource -Leaf);if(Test-Path -LiteralPath $taskDestination){throw 'Sauvegarde deja presente : utiliser un nouveau dossier'};Copy-Item -LiteralPath $taskSource -Destination $taskDestination -Recurse -Force
 foreach($taskFile in Get-ChildItem -LiteralPath $taskSource -Recurse -File -Force){$taskRelative=$taskFile.FullName.Substring($taskSource.Length).TrimStart('\');$taskCopy=Join-Path $taskDestination $taskRelative;$taskHash=(Get-FileHash -LiteralPath $taskFile.FullName -Algorithm SHA256).Hash;if((Get-FileHash -LiteralPath $taskCopy -Algorithm SHA256).Hash -ne $taskHash){throw 'Sauvegarde non conforme, nettoyage abandonne'};@{source=$taskFile.FullName;backup=$taskCopy;sha256=$taskHash}}
}})
$taskManifest|ConvertTo-Json -Depth 3|Set-Content -LiteralPath (Join-Path $taskBackup 'backup-manifest.json') -Encoding utf8
Write-Output ('Sauvegarde verifiee : '+$taskManifest.Count+' fichiers.')
$taskEntries|ConvertTo-Json -Depth 3|Set-Content -LiteralPath (Join-Path $taskBackup 'installations.json') -Encoding utf8
foreach($taskEntry in $taskEntries){
 if(!$taskIsAdmin -and $taskEntry.Registry -match 'HKEY_LOCAL_MACHINE'){Write-Output 'Ancienne installation machine conservee : droits administrateur requis.';continue}
 if(Test-Path -LiteralPath $taskEntry.Uninstaller){
  $taskProcess=Start-Process -FilePath $taskEntry.Uninstaller -ArgumentList @('/S',$taskEntry.Arguments) -PassThru -Wait -WindowStyle Hidden
  if($taskProcess.ExitCode -ne 0){throw 'Desinstallation TELMI echouee, donnees sauvegardees'}
  for($taskAttempt=0;$taskAttempt -lt 60 -and (Test-Path -LiteralPath $taskEntry.Uninstaller);$taskAttempt++){Start-Sleep -Seconds 1}
  if(Test-Path -LiteralPath $taskEntry.Uninstaller){throw 'Desinstallation encore active; nettoyage abandonne'}
 }
}
# Only stale entries whose trusted uninstaller and application executable are gone.
foreach($taskEntry in $taskEntries){if(!$taskIsAdmin -and $taskEntry.Registry -match 'HKEY_LOCAL_MACHINE'){continue};if(Test-Path -LiteralPath $taskEntry.Registry){$taskDirectory=Split-Path $taskEntry.Uninstaller;if(!(Test-Path -LiteralPath $taskEntry.Uninstaller) -and !(Get-ChildItem -LiteralPath $taskDirectory -Filter '*.exe' -ErrorAction SilentlyContinue)){Remove-Item -LiteralPath $taskEntry.Registry}}}
$taskShell=New-Object -ComObject WScript.Shell
$taskShortcutRoots=@((Join-Path $env:USERPROFILE 'Desktop'),(Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),(Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'))
foreach($taskShortcutRoot in $taskShortcutRoots){if(!$taskIsAdmin -and $taskShortcutRoot.StartsWith($env:ProgramData,[StringComparison]::OrdinalIgnoreCase)){continue};foreach($taskShortcut in Get-ChildItem -LiteralPath $taskShortcutRoot -Filter '*Telmi*Sync*.lnk' -Recurse -ErrorAction SilentlyContinue){$taskTarget=$taskShell.CreateShortcut($taskShortcut.FullName).TargetPath;if($taskAllowed -contains (Split-Path $taskTarget) -and !(Test-Path -LiteralPath $taskTarget)){Remove-Item -LiteralPath $taskShortcut.FullName}}}
$taskInstall=Start-Process -FilePath $Installer -ArgumentList @('/S','/currentuser') -Wait -PassThru -WindowStyle Hidden
if($taskInstall.ExitCode -ne 0){throw 'Installation echouee; sauvegarde conservee'}
$taskAll=@(foreach($taskKey in $taskRegistry){Get-ItemProperty "$taskKey\*" -ErrorAction SilentlyContinue|Where-Object {$_.DisplayName -match '^(Telmi Sync|TELMI Sync Plus)(\s+\d.*)?$'}})
$taskUser=@($taskAll|Where-Object {$_.PSPath -match 'HKEY_CURRENT_USER'})
if($taskUser.Count -ne 1){throw 'Le controle final ne trouve pas une installation utilisateur unique'}
foreach($taskOriginal in $taskMediaManifest){$taskCurrent=Get-Item -LiteralPath $taskOriginal.source;if($taskCurrent.Length -ne $taskOriginal.length -or $taskCurrent.LastWriteTimeUtc.Ticks -ne $taskOriginal.modified){throw 'Une source personnelle a change pendant la maintenance; consulter le manifeste'} }
$taskStatus=if($taskAll.Count -eq 1){'verified'}else{'pending-administrator'}
@{status=$taskStatus;installations=$taskAll.Count;userInstallations=1;version=$taskUser[0].DisplayVersion;backup=$taskBackup;installerSha256=$InstallerSha256;personalFilesPreserved=$taskMediaManifest.Count;fullLibraryBackup=[bool]$FullLibraryBackup}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskBackup 'result.json') -Encoding utf8
Write-Output ('Installation utilisateur verifiee; statut global : '+$taskStatus+'. Bibliotheques et reglages conserves.')
