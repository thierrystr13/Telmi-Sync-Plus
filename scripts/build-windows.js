import fs from 'node:fs/promises'
import builder from 'electron-builder'
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'))
const config = {...pkg.build, extends: null, extraResources: pkg.build.extraResources.map(resource => ({
  ...resource, filter: [...resource.filter, '!**/darwin/**/*', '!**/linux/**/*']
}))}
if (process.argv.includes('--fixture')) {
  config.extraMetadata = {version: '0.20.0'}
  config.directories = {...config.directories, output: '.tools/upgrade-fixture'}
}
// A separate config path avoids concatenating package.json resource arrays
// with inline overrides (which can copy the same executable concurrently).
await fs.mkdir('.tools', {recursive: true})
const configPath = '.tools/windows-builder.json'
await fs.writeFile(configPath, JSON.stringify(config, null, 2))
await builder.build({targets: builder.Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64), config: configPath, publish: 'never'})
