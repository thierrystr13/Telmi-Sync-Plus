$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $repositoryRoot 'extraResources/video-tools'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
$archive = Join-Path $toolsRoot 'ffmpeg.zip'
Invoke-WebRequest -Uri 'https://github.com/GyanD/codexffmpeg/releases/download/6.1.1/ffmpeg-6.1.1-essentials_build.zip' -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $toolsRoot 'ffmpeg-distribution') -Force
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne '742E32FC9F92681F9F254B925E1B613FDD8074BA40749D4879AEFDB009B94CC5') { throw 'FFmpeg checksum mismatch' }
foreach ($name in @('ffmpeg.exe', 'ffprobe.exe')) {
  $source = Join-Path $toolsRoot "ffmpeg-distribution/ffmpeg-6.1.1-essentials_build/bin/$name"
  Copy-Item -LiteralPath $source -Destination (Join-Path $toolsRoot $name) -Force
}
Copy-Item -LiteralPath (Join-Path $toolsRoot 'ffmpeg-distribution/ffmpeg-6.1.1-essentials_build/LICENSE') -Destination (Join-Path $toolsRoot 'FFmpeg-LICENSE.txt') -Force
Copy-Item -LiteralPath (Join-Path $toolsRoot 'ffmpeg-distribution/ffmpeg-6.1.1-essentials_build/README.txt') -Destination (Join-Path $toolsRoot 'FFmpeg-BUILD.txt') -Force
Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.exe' -OutFile (Join-Path $toolsRoot 'yt-dlp.exe')
if ((Get-FileHash -LiteralPath (Join-Path $toolsRoot 'yt-dlp.exe') -Algorithm SHA256).Hash -ne '66674953FE251B89F4D08C5F0E35E0728679BD67AB3D7D05C0562AF101DD3E7A') { throw 'yt-dlp checksum mismatch' }
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.08.19/LICENSE' -OutFile (Join-Path $toolsRoot 'yt-dlp-LICENSE.txt')
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.08.19/THIRD_PARTY_LICENSES.txt' -OutFile (Join-Path $toolsRoot 'yt-dlp-THIRD-PARTY.txt')
Write-Output 'FFmpeg, FFprobe and yt-dlp verified and ready.'
