import * as fs from 'fs'
import * as path from 'path'

const
  parseInfFile = (str) => {
    return str
      .split('\n')
      .reduce(
        (acc, v) => {
          const a = v.split('=', 2)
          if (a[1] === undefined) {
            return acc
          }
          return {...acc, [a[0].trim().toLowerCase()]: a[1].trim()}
        },
        {}
      )
  },

  parseTelmiOSAutorun = (drive) => {
    // Development cards may have no autorun or a renamed label. Require the
    // installed runtime and executable for this fallback, never a video folder alone.
    const regular = (name, directory = false) => {
      try {const stat = fs.lstatSync(path.join(drive, name)); return directory ? stat.isDirectory() : stat.isFile()} catch {return false}
    }
    const read = name => {
      try {
        if (!regular(name) || fs.statSync(path.join(drive, name)).size > 65536) return ''
        return fs.readFileSync(path.join(drive, name), 'utf8').replace(/^\uFEFF/, '')
      } catch {return ''}
    }
    const label = parseInfFile(read('autorun.inf')).label || ''
    const branded = /^(?:TelmiOS|TELMI\+|TELMIPLUS)(?:\s|[-_]|$)/i.test(label)
    const installed = regular('.tmp_update/runtime.sh') && regular('.tmp_update/bin/storyTeller')
    if (!branded && !installed) return null
    const plus = regular('TELMI_PLUS', true) || /TELMI\+|TELMIPLUS/i.test(label)
    const installedVersion = read('.tmp_update/telmiVersion/version.txt').trim()
    const versionText = installedVersion || label
    const match = versionText.match(/(?:^|[-_\s])v?(\d+)\.(\d+)\.(\d+)(?=$|[-+_\s])/i)
    const version = match ? {major: Number(match[1]), minor: Number(match[2]), fix: Number(match[3])} : {major: 0, minor: 0, fix: 0}
    if (!installed && version.major < 1) return null
    return {label: plus ? 'TELMI+' : 'TelmiOS', version, versionText: installedVersion || label || 'Version inconnue', isPlus: plus}
  }

export { parseInfFile, parseTelmiOSAutorun }
