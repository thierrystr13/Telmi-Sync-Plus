import TopBar from '../../Layout/TopBar/TopBar.js'
import AppContainer from '../../Layout/Container/AppContainer.js'
import MusicImport from './MusicImport.js'
import StoryLibrary from './StoryLibrary.js'
export function YouTubeMusicHome(){return <><TopBar currentModule="YouTubeMusic"/><AppContainer><MusicImport/></AppContainer></>}
export function StoryLibraryHome(){return <><TopBar currentModule="StoryLibrary"/><AppContainer><StoryLibrary/></AppContainer></>}
