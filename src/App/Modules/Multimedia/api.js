export const {ipcRenderer}=window.require('electron')
export async function media(name,...args){const result=await ipcRenderer.invoke('media-'+name,...args);if(!result.ok)throw new Error(result.error);return result.data}
