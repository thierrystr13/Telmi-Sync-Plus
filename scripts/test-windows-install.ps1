param([string]$Installer=(Join-Path $PWD 'electron/dist/TELMI-Sync-Plus-Windows-x64.exe'),[string]$Previous=(Join-Path $PWD '.tools/upgrade-fixture/TELMI-Sync-Plus-Windows-x64.exe'))
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true'){throw 'Ce test est réservé au runner CI isolé; utiliser windows-maintenance.ps1 sur un PC personnel.'}
$taskKey='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\adefeceb-f6d0-5c3b-91bf-0ca69e035128'
$taskData=Join-Path $env:APPDATA 'telmi-sync-plus'
New-Item -ItemType Directory -Path $taskData -Force|Out-Null
$taskMarker=Join-Path $taskData 'upgrade-preservation-test.txt'
'personal settings preserved'|Set-Content -LiteralPath $taskMarker
function Install-Test([string]$File,[string]$Version){
 $taskProcess=Start-Process -FilePath $File -ArgumentList @('/S','/currentuser') -Wait -PassThru -WindowStyle Hidden
 if($taskProcess.ExitCode -ne 0){throw 'Installateur échoué'}
 $taskEntry=Get-ItemProperty -LiteralPath $taskKey
 if($taskEntry.DisplayVersion -ne $Version){throw ('Version inattendue: '+$taskEntry.DisplayVersion)}
 $taskAll=@(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'|Where-Object {$_.DisplayName -eq 'TELMI Sync Plus'})
 if($taskAll.Count -ne 1){throw 'Entrée Windows dupliquée'}
 if((Get-Content -LiteralPath $taskMarker).Trim() -ne 'personal settings preserved'){throw 'Réglages perdus'}
 return $taskEntry
}
$taskOld=Install-Test $Previous '0.19.0-dev.2'
$taskNew=Install-Test $Installer '0.20.0'
if($taskOld.InstallLocation -ne $taskNew.InstallLocation){throw 'Chemin modifié pendant la mise à jour'}
$taskUninstall=[regex]::Match($taskNew.UninstallString,'^"([^"]+)"').Groups[1].Value
if((Split-Path $taskUninstall) -ne (Join-Path $env:LOCALAPPDATA 'Programs\TELMI Sync Plus')){throw 'Désinstalleur inattendu'}
$taskProcess=Start-Process -FilePath $taskUninstall -ArgumentList @('/S','/currentuser') -PassThru -Wait -WindowStyle Hidden
for($taskAttempt=0;$taskAttempt -lt 30 -and (Test-Path -LiteralPath $taskKey);$taskAttempt++){Start-Sleep -Seconds 1}
if(Test-Path -LiteralPath $taskKey){throw 'Désinstallation incomplète'}
$taskClean=Install-Test $Installer '0.20.0'
$taskExe=Join-Path $taskClean.InstallLocation 'TELMI Sync Plus.exe'
if(!(Test-Path -LiteralPath $taskExe)){throw 'Exécutable installé absent'}
$taskShortcuts=@(Get-ChildItem (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs') -Filter '*TELMI Sync Plus*.lnk' -Recurse)
if($taskShortcuts.Count -ne 1){throw 'Raccourcis de menu Démarrer dupliqués ou absents'}
@{cleanInstall=$true;upgrade=$true;settingsPreserved=$true;oldVersion='0.19.0-dev.2';version='0.20.0';registryEntries=1;startMenuShortcuts=1;fixture='same stable application identity with previous version metadata'}|ConvertTo-Json|Set-Content 'electron/dist/INSTALLATION_TEST.json'
