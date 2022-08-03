
import { LitElement, html, css } from 'lit';

// Internal Dependencies
import { Plugin } from './Plugin';

// Visualscript Dependencies
import { Tab, Panel, Tree, CodeEditor, ObjectEditor, GraphEditor, Modal, global } from "../external/visualscript/dist/index.esm.js"

export type EditorProps = {
  app?: any, // brainsatplay.editable.App
  plugins?: any[]
  ui?: HTMLElement
}

export class Editor extends LitElement {

  static get styles() {
    return css`

    :host { 
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    :host > div > * {
      flex-grow: 1;
    }

    :host > div {
      overflow: scroll;
      display: flex;
      width: 100%;
      height: 100%;
    }

    #files {
      display: flex;
      height: 100%;
    }

    #files > visualscript-tree {
      width: 250px;
    }

    #palette {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 25px;
      height: 25px;
      z-index: 2;
      cursor: pointer;
    }

    `;
  }
    
    static get properties() {
      return {
        fileUpdate: {
          type: Number,
          reflect: true
        }
      };
    }

    app: any
    active: any

    modal = new Modal()
    ui = document.createElement('visualscript-tab') 
    files = new Panel()
    filesTab = new Tab({name: 'Files'})

    info = new Panel()
    history: {[x:string]: any} = {}
    fileUpdate: number = 0
    graph = new GraphEditor()
    properties = new ObjectEditor()
    tree = new Tree()

    constructor(props:EditorProps={}) {
      super();

      this.ui.setAttribute('name', 'UI')
      if (props.app) this.setApp(props.app)
      if (props.ui) this.setUI(props.ui)

      // Setup Files Tab
      const div = document.createElement('div')
      div.id = 'files'
      div.appendChild(this.tree)
      div.appendChild(this.files)
      this.filesTab.appendChild(div)
    }

    setApp = (app) => {
      this.app = app
    }

    setGraph = async (graph) => {

      // Setting Context Menu Response
      global.context.set('visualscript-graph-editor', {
        condition: (el) => {
          const root = this.graph.workspace.shadowRoot
          if (root){
            return el === this.graph.workspace // Is the workspace
            || root.contains(el) // Is the workspace grid
          } else return false
        },
        contents: () => {
          return [
            {
              text: 'Create new node',
              onclick: () => {
                  const tag = `Node${Math.floor(1000*Math.random())}`
                    this.graph.workspace.addNode({
                      info: {
                        tag,
                        nodes: new Map([['input', undefined]]),
                        graph: this.graph.workspace.graph,
                        operator: (input) => {
                          console.log(`[${tag}]`, input)
                          return input
                        }
                      },
                  })
                  this.graph.workspace.triggerUpdate()
            },
          },
             {
              text: 'Do another thing',
              onclick: () => {
                console.warn('MUST DO SOMETHING')
            }
          }
          ]
          
        }
      })

      await this.graph.set(graph) // Set tree on graph

      setTimeout(() => {
      // Set Responses After Setting Graph
      this.graph.onedgeadded = (edge) => {        
        // change active graph
        const info = this.getEdgeInfo(edge)
        info.output.addChildren([info.input])
        console.warn('TODO: Fix awaiting edges', edge, info.output)

        // add to file
        this.updateFile('.brainsatplay/index.graph.json', {
          edges: {
            [info.output]: {
              [info.input]: {}
            }
          }
        })
      }

      this.graph.onnodeadded = (node) => {

        // change active graph
        const active = this.app.active ?? this.app
        active.graph.add(node.info)

        // add to file
        // TODO
      }

      this.graph.onedgeremoved = (edge) => {
        // update active graph
        const info = this.getEdgeInfo(edge)
        info.output.removeTree(info.input)

        // update file
        // TODO
      }

      this.graph.onnoderemoved = (node) => {
        // update active graph
        this.app.graph.removeTree(node.name)

        // update file
        // TODO
      }
    }, 1000)

    }

    updateFile = (path, updateObj) => {
      if (this.app?.filesystem) {
        const file = this.app?.filesystem.open(path)
        const body = file.body

        const update = (base, updateObj) => {
          for (let key in updateObj) {
            if (updateObj[key] !== base[key]) base[key] = updateObj[key]
            if (typeof updateObj[key] === 'object') update(base[key], updateObj[key])
          }
        }

        update(body, updateObj)

      }
    }

    getEdgeInfo = (edge: any) => {
      const active = this.app.active ?? this.app
      const output = active.graph.nodes.get(edge.output.tag)
      const input = active.graph.nodes.get(edge.input.tag)
      return {
        output, 
        input
      }
    }


    setUI = (ui) => {
      this.ui.innerHTML = ''
      this.ui.appendChild(ui)
    }

    isPlugin = (f) => {
      return f.mimeType === 'application/javascript' && !f.path.includes('/.brainsatplay/')
    }

    start = async () => {

      // TODO: Reset File Viewer with Same Tabs Open
      // const toOpen: any[] = []
      // this.files.tabs.forEach(t => {
      //   const newTab = system.files.list.get(t.name)
      //   toOpen.push(newTab)
      // })
      this.files.reset() 

      const previousTabs = new Set(Object.keys(this.history))

      const allProperties = {}

      // TODO: Only Show ESM at Top Level. Show editable things
      // const isValidPlugin = this.isPlugin(f)

      const openTabs: {[x:string]: any} = {}

      // show/hide files tab
      if (this.app?.filesystem) {

      // Add Tab On Click
      this.tree.oncreate = async (type, item) => {

        if (type === 'file') {
          const path = item.key
          const rangeFile = this.app.filesystem.open(path, true)
          return rangeFile
        }
      }

      this.tree.onClick = async (key, obj) => {

        const isFile = !!obj.path
        const id = obj.path ?? key
        const existingTab = this.files.tabs.get(id)
        if (!existingTab){

        let tabInfo = this.history[id]
        // const plugin = this.app.plugins.plugins[f.path]
  
        previousTabs.delete(id)

        const tab = new Tab({
          close: true,
          name: id
        })

        if (tabInfo) tabInfo.tab = tab
        else {
          
          tabInfo = {tab} // Start tracking essential tab information

          // Create File Editors
          tabInfo.container = new Panel({minTabs: 2})
          const codeTab = new Tab({name: "File"});

          // Conditionally Show Information
          if (isFile) {
            const isPlugin = this.isPlugin(obj)
            if (isPlugin){
              const infoTab = new Tab({name: 'Info'})
              tabInfo.plugin = new Plugin()
              infoTab.appendChild(tabInfo.plugin)
              tabInfo.container.addTab(infoTab)
            }
          }

          // Show Property Editor for Objects (including esm modules)
          // if (typeof await f.body === 'object') {
          //   const objectTab = new Tab({name: "Properties"})
          //   tabInfo.object = new ObjectEditor()
          //   objectTab.appendChild(tabInfo.object)
          //   container.addTab(objectTab)
          // }

          // Always Show Code Editor
          if (isFile){
            tabInfo.code = new CodeEditor()
            codeTab.appendChild(tabInfo.code)
            tabInfo.container.addTab(codeTab)
          }
        }

        tab.appendChild(tabInfo.container)
        this.files.addTab(tab, true)
        this.history[id] = tabInfo
        
        // ---------- Update Editors ----------

        const canGet = {
          metadata: this.app.plugins.metadata,
          package: this.app.plugins.package,
          module: this.app.plugins.module
        }

        let metadata = (canGet.metadata) ? (await this.app.plugins.metadata(obj.path) ?? await obj.body) : undefined
        const module = (canGet.module) ? await this.app.plugins.module(obj.path) : obj.operator
        const pkg = (canGet.package) ? await this.app.plugins.package(obj.path) : undefined

        // Merge package with metadata
        if (pkg) metadata = Object.assign(JSON.parse(JSON.stringify(pkg)), metadata)

        // Plugin Info
        if (tabInfo.plugin) {
          tabInfo.plugin.set( module, metadata )
        }

        // Object Editor
        if (tabInfo.object){
          tabInfo.object.set(module)
          tabInfo.object.header = metadata.name ?? obj.name ?? obj.tag
        }

        // Code Editor
        if (tabInfo.code){
          const text = (isFile) ? await obj.text : obj.operator.toString()
          tabInfo.code.value = text

          let tmpVar = undefined
          const tempSave = (isFile) ? (text) => obj.text = text : (text) => tmpVar = text
          tabInfo.code.onInput = tempSave,
          tabInfo.code.onSave = async () => {

              if (isFile) await obj.save()
              else obj.operator = (0,eval)(tmpVar)

              await this.app.start()
          }
        }

        openTabs[id] = tabInfo.tab
      } else {
        existingTab.toggle.select()
      }
    } 
  }


    this.properties.set(allProperties)

    // Remove Tabs That No Longer Exist
    previousTabs.forEach(str => {
      const info = this.history[str]
      info.tab.remove() // Remove
      delete this.history[str]
    })


    let treeObject = this.app.filesystem?.files?.system
    this.tree.set(treeObject ?? {})

    this.fileUpdate = this.fileUpdate + 1

    }

    render() {


      // const addBox = new Icon({type: 'addBox'})
      // addBox.id = 'palette'

      const newProject = document.createElement('div')
      newProject.innerHTML = 'Create new project'
      const fileTab =  new Tab({name: 'File', type:'dropdown'})
      fileTab.insertAdjacentElement('beforeend', newProject)
      newProject.onclick = () => {
        this.modal.open = true
      }

      const tabs = [
        fileTab,
        new Tab({name: 'Edit', type:'dropdown'}),
        new Tab({name: 'View'}),
        new Tab({name: 'Window'}),
        new Tab({name: 'Help'}),
      ]

      const panel = new Panel({minTabs: 2})
      const graphTab = new Tab({name: 'Graph'})
      graphTab.appendChild(this.graph)
      panel.addTab(graphTab)
      if (this.app?.filesystem) panel.addTab(this.filesTab)

      // return html`
      //     ${this.modal}
      //     <visualscript-tab-bar>
      //       ${tabs.map(t => t.toggle)}
      //     </visualscript-tab-bar>


    //   <visualscript-tab name="Properties">
    //   ${this.properties}
    // </visualscript-tab>
      return html`
          <div>
            ${this.ui}
            ${panel}
          </div>
      `

    }
  }
  
  customElements.define('brainsatplay-editor', Editor);