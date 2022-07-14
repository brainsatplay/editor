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

// -------------- Remote App --------------
const appPath = 'https://raw.githubusercontent.com/brainsatplay/brainsatplay-starter-kit/main/package.json'
// const appPath = 'https://raw.githubusercontent.com/brainsatplay/brainsatplay-starter-kit/nightly/package.json'
// const appPath = `./app/index.js` // Automatically relative to window.location.href

// createPlugins()
// -------------- Setup Elememts --------------
// const displayName = document.querySelector('#name')

const nav = document.querySelector('visualscript-nav')
// nav.primary= {"menu": [{"content": "Products"}], "options": [{"content": "Test"}]}

// <visualscript-button id=select primary>Select Project</visualscript-control>

// let appElement = document.querySelector('visualscript-app')
let editor = document.querySelector('visualscript-editor')

// -------------- Setup Default App --------------
let app = new brainsatplay.editable.App(undefined, {
    debug: false
})
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
start(appPath)

// -------------- Setup Keyboard Shortcuts --------------
document.onkeydown = async (e) => {
    if (e.metaKey && e.code == 'KeyS') {
        e.preventDefault()
        app.save() // Global save.
    }
};

async function start(input){

    const ui = new visualscript.streams.data.TimeSeries()
    editor.setUI(ui)

    app.onstart = () => {

        editor.start()

        let sub = null
        let node = null
        app.active.graph.nodes.forEach(n => {
            if (!node && n.tag.includes('sine')) {
                node = n
                sub = n.subscribe((data) => {
                    ui.data = [data]
                    ui.draw()
                })
                return true
            }
        })

        app.onstop = () => {
            if (node) node.unsubscribe(sub)
        }
    }

   const ok = await app.start(input).catch(e => console.error('Invalid App', e))

    if (ok) editor.setGraph(app.active.graph)

}