const {ipcRenderer} = window.require('electron')
export async function call(name, ...args) {
  const result = await ipcRenderer.invoke('videos-' + name, ...args)
  if (!result.ok) throw new Error(result.error)
  return result.data
}
export {ipcRenderer}
export const bytes = value => value ? `${(value / 1048576).toFixed(1)} Mio` : '—'
export const duration = value => value ? `${Math.floor(value / 60)} min ${Math.floor(value % 60)} s` : '—'
