import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {parseTelmiOSAutorun} from '../public/MainEvents/Helpers/InfFiles.js'
import {readTelmiOSParameters} from '../public/MainEvents/Helpers/TelmiOS.js'
import {shareDiscovery, mountedWindowsVolumes} from '../public/MainEvents/Helpers/DriveList.js'

async function card(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telmi-detection-'))
  t.after(() => fs.rm(root, {recursive:true, force:true}))
  for (const [name, data] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, name)), {recursive:true})
    await fs.writeFile(path.join(root, name), data)
  }
  return root
}
test('official autorun and valid parameters remain compatible', async t => {
  const root = await card(t, {'autorun.inf':'[autorun]\r\nlabel = TelmiOS-v1.10.4', 'Saves/.parameters':'{"audioVolumeMax":0.5,"custom":true}'})
  const os = parseTelmiOSAutorun(root)
  assert.equal(os.label, 'TelmiOS'); assert.equal(os.isPlus, false)
  assert.deepEqual(os.version, {major:1,minor:10,fix:4})
  const data = readTelmiOSParameters({drive:root,telmiOS:os})
  assert.equal(data.telmiOS.parameters.audioVolumeMax, 0.5)
  assert.equal(data.telmiOS.parameters.custom, true)
})
test('DEV11 runtime version wins over stale autorun and preserves files', async t => {
  const version = 'v1.10.4-TELMIPLUS-DEV11-RETROGAMING-VISUEL'
  const root = await card(t, {'autorun.inf':'label = TelmiOS-v1.10.4', '.tmp_update/runtime.sh':'runtime', '.tmp_update/bin/storyTeller':'binary', '.tmp_update/telmiVersion/version.txt':version, 'TELMI_PLUS/retro/launch.sh':'launcher'})
  const os = parseTelmiOSAutorun(root)
  assert.equal(os.isPlus, true); assert.equal(os.versionText, version)
  readTelmiOSParameters({drive:root,telmiOS:os})
  await assert.rejects(fs.access(path.join(root,'Saves/.parameters')))
  assert.equal(await fs.readFile(path.join(root,'autorun.inf'),'utf8'), 'label = TelmiOS-v1.10.4')
})
test('installed TELMI+ recognized without autorun; empty folder is rejected', async t => {
  const root = await card(t, {'.tmp_update/runtime.sh':'runtime', '.tmp_update/bin/storyTeller':'binary', 'TELMI_PLUS/marker':'plus'})
  assert.equal(parseTelmiOSAutorun(root).isPlus, true)
  await fs.rm(path.join(root,'.tmp_update/bin/storyTeller'))
  assert.equal(parseTelmiOSAutorun(root), null)
})
test('BOM, custom DEV label and damaged parameters do not hide a card', async t => {
  const root = await card(t, {'autorun.inf':'\uFEFF[autorun]\nLABEL=TELMI+-v1.10.4-DEV11', 'Saves/.parameters':'broken'})
  const os = parseTelmiOSAutorun(root)
  assert.equal(os.isPlus, true); assert.equal(os.version.fix, 4)
  const data = readTelmiOSParameters({drive:root,telmiOS:os})
  assert.equal(data.telmiOS.parameters.screenBrightnessStartup, 0.3)
  assert.equal(await fs.readFile(path.join(root,'Saves/.parameters'),'utf8'), 'broken')
})
test('unavailable drive and unrelated cards rejected', async t => {
  const root = await card(t, {'autorun.inf':'label=Onion-v4.3.1', 'TELMI_PLUS/marker':'empty marker'})
  assert.equal(parseTelmiOSAutorun(root), null)
  assert.equal(parseTelmiOSAutorun(path.join(root, 'unmounted')), null)
})
test('concurrent OS/video polling uses one discovery and retries after failure', async () => {
  let calls = 0, release
  const shared = shareDiscovery(() => {calls++; return new Promise(resolve => {release = resolve})})
  const first = shared(), second = shared()
  await Promise.resolve()
  assert.equal(calls, 1); release(['E:'])
  assert.deepEqual(await first, ['E:']); assert.deepEqual(await second, ['E:'])
  assert.deepEqual(await shared(), ['E:']); assert.equal(calls, 1)
  let failures = 0
  const retry = shareDiscovery(() => {if (!failures++) throw new Error('unavailable'); return []})
  await assert.rejects(retry(), /unavailable/); assert.deepEqual(await retry(), [])
})
test('native mounted volumes work without PowerShell and unreadable readers are skipped', async () => {
  const drives = await mountedWindowsVolumes(async root => {
    if (root.startsWith('Z:')) return new Promise(() => {})
    if (!['C:', 'E:'].includes(root.slice(0, 2))) throw new Error('Not mounted')
    return {bsize:32768,blocks:100}
  }, 20)
  assert.deepEqual(drives.map(d => d.device), ['C:\\', 'E:\\'])
  assert.equal(drives[1].size, 3276800)
  assert.equal(drives[1].isRemovable, false) // No formatting on inferred metadata.
  assert.equal(drives[1].partitionTableType, null)
})
