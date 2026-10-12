import * as path from 'path'
import * as fs from 'fs'
import {getExtraResourcesPath, getMusicPath, initTmpPath} from '../Helpers/AppPaths.js'
import { checkCoverExists, convertAudio } from './Helpers/AudioFile.js'
import { audioExtractMetadata, audioExtractPNG } from '../BinFiles/FFmpegCommand.js'
import { parseInfFile } from '../../Helpers/InfFiles.js'
import { getMusicBrainzCoverImage } from '../Helpers/MusicBrainzApi.js'
import { convertMusicImage } from './Helpers/ImageFile.js'
import { musicObjectToName } from '../../Helpers/Music.js'
import {audioProbe} from '../../Multimedia/audio.js'
import {run} from '../../Videos/process.js'

function convertMusic (srcPath) {
  process.stdout.write('*music-extracting-metadata*0*3*')

  const
    tmpPath = initTmpPath('music'),
    tmpMetadataTxtPath = path.join(tmpPath, 'metadata.txt'),
    metadata = {
      artist: 'unknow',
      album: 'unknow',
      track: '00',
      title: path.parse(srcPath).name
    },

    stepConvertAudio = () => {
      const
        musicPath = getMusicPath(),
        fileName = musicObjectToName(metadata),
        musicFileName = fileName + '.mp3',
        coverFileName = fileName + '.png',
        coverPath = path.join(musicPath, coverFileName),
        musicDstPath = path.join(musicPath, musicFileName),

        finish = () => {
          const tools = {ffprobe: path.join(getExtraResourcesPath(), 'video-tools', 'ffprobe.exe'), ffmpeg: path.join(getExtraResourcesPath(), 'video-tools', 'ffmpeg.exe')}
          audioProbe(tools, musicDstPath).then(() => run(tools.ffmpeg, ['-v', 'error', '-xerror', '-i', musicDstPath, '-f', 'null', '-']))
            .then(() => {fs.rmSync(tmpPath, {recursive: true, force: true}); process.stdout.write('success')})
            .catch(error => process.stderr.write(error.message))
        },

        stepCopyDefaultCover = () => {
          fs.copyFileSync(path.join(getExtraResourcesPath(), 'assets', 'images', 'unknow-album.png'), coverPath)
          finish()
        },

        stepCheckCover = () => {
          if (fs.existsSync(coverPath)) {
            return finish()
          }

          if (metadata.artist === 'unknow' || metadata.album === 'unknow') {
            return stepCopyDefaultCover()
          }

          getMusicBrainzCoverImage(metadata.artist, metadata.album, tmpPath)
            .then((pathFile) => {
              convertMusicImage(pathFile, coverPath)
                .then(() => {
                  if (!fs.existsSync(coverPath)) {
                    return stepCopyDefaultCover()
                  }
                  finish()
                })
                .catch(stepCopyDefaultCover)
            })
            .catch(stepCopyDefaultCover)
        }

      process.stdout.write('*converting-audio*1*3*')

      if(fs.existsSync(musicDstPath)) {
        finish()
        return
      }

      convertAudio(srcPath, musicDstPath, true, true)
        .then(() => {
          process.stdout.write('*music-searching-cover*2*3*')

          if(checkCoverExists(metadata.artist, metadata.album, coverPath)) {
            return stepCheckCover()
          }

          audioExtractPNG(srcPath, coverPath)
            .then(stepCheckCover)
            .catch(stepCheckCover)
        })
        .catch(() => {
          process.stderr.write('music-conversion-failed')
        })
    }

  audioExtractMetadata(srcPath, tmpMetadataTxtPath)
    .then(() => {
      if (fs.existsSync(tmpMetadataTxtPath)) {
        const
          md = parseInfFile(fs.readFileSync(tmpMetadataTxtPath).toString('utf8')),
          track = parseInt((md.track || metadata.track).split('/')[0], 10)

        metadata.artist = md.artist || metadata.artist
        metadata.album = md.album || metadata.album
        metadata.track = (track < 10 ? '0' : '') + track
        metadata.title = md.title || metadata.title
      }
      stepConvertAudio()
    })
    .catch(stepConvertAudio)
}

export default convertMusic
