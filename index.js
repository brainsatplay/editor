// Import Dependencies
import './src/index.js'
import * as visualscript from './external/visualscript/dist/index.esm.js'
// import * as freerange from './external/freerange/index.esm.js'
import * as brainsatplay from './external/brainsatplay/index.esm.js';

// const createPlugins = async (src) => {
//     const plugins = new Plugins(src)
//     await plugins.init()
//     console.log(`----------------------- Plugins -----------------------`)
//     for await (let str of plugins.list){
//         console.log(await plugins.metadata(str))
//     }

//     return plugins
// }

// -------------- Setup Default App --------------
// const appInfo = 'https://raw.githubusercontent.com/brainsatplay/brainsatplay-starter-kit/main'
// const appInfo = 'https://raw.githubusercontent.com/brainsatplay/brainsatplay-starter-kit/nightly'
// const appInfo = `./app/index.js` // Automatically relative to window.location.href
// import appInfo from '../brainsatplay-starter-kit/index.js' // not actually editable when loaded this way
// import appInfo from '../htil/content/signals/index.js' // not actually editable when loaded this way
import appInfo from '../htil/content/phaser/index.js' // not actually editable when loaded this way

// -------------- Setup Default App --------------
let app = new brainsatplay.editable.App(undefined, {
    debug: false
})

// createPlugins()
// -------------- Setup Elememts --------------
// const displayName = document.querySelector('#name')

const nav = document.querySelector('visualscript-nav')
// nav.primary= {"menu": [{"content": "Products"}], "options": [{"content": "Test"}]}

// <visualscript-button id=select primary>Select Project</visualscript-control>

// let appElement = document.querySelector('visualscript-app')
let editor = document.querySelector('brainsatplay-editor')
editor.setApp(app)

// -------------- Show History --------------
// freerange.getCache().then(arr => {
    const options = [
        {
            "content": "Select Project",
            "id": "select",
            "type": "button",
            onClick: async () => {
                start()
            }
        }
    ]

    // SHOW HISTORY
    // arr.forEach(v => options.push({
    //    content: v.name ?? v,
    //    type: "button",
    //    onClick: async () => {
    //     const system = await createSystem(v)
    //     startApp(system)
    // }
    // }))

    nav.primary = {options}
// })

// -------------- Create System --------------
start(appInfo)

// -------------- Setup Keyboard Shortcuts --------------
document.onkeydown = async (e) => {
    if (e.metaKey && e.code == 'KeyS') {
        e.preventDefault()
        app.save() // Global save.
    }
};

async function start(input){

    app.setParent(editor.ui)

    app.onstart = () => {
        editor.start()
    }

    console.log('Starting')
   const ok = await app.start(input).catch(e => console.error('Invalid App', e))
   console.log('ok', ok)

    if (ok) editor.setGraph(app.active?.graph ?? app.graph)

    console.log('App', app)


}