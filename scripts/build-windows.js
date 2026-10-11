import fs from 'node:fs/promises'
import builder from 'electron-builder'
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'))
const config = {...pkg.build, extraResources: pkg.build.extraResources.map(resource => ({
  ...resource, filter: [...resource.filter, '!**/darwin/**/*', '!**/linux/**/*']
}))}
await builder.build({targets: builder.Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64), config, publish: 'never'})
