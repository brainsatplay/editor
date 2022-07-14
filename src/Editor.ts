
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
      width: 100%;
      height: 100%;
    }

    :host * {
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
    modal = new Modal()
    ui = document.createElement('visualscript-tab') 
    files = new Panel()
    info = new Panel()
    fileHistory: {[x:string]: any} = {}
    fileUpdate: number = 0
    graph = new GraphEditor()
    properties = new ObjectEditor()
    tree = new Tree()

    constructor(props:EditorProps={}) {
      super();

      this.ui.setAttribute('name', 'UI')
      if (props.app) this.setApp(props.app)
      if (props.ui) this.setUI(props.ui)
    }

    setApp = (app) => {
      this.app = app
    }

    setGraph = (graph) => {

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
                console.warn('MUST CREATE NODE')
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

      this.graph.set(this.app.active) // Set tree on graph
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

      const previousTabs = new Set(Object.keys(this.fileHistory))

      const allProperties = {}

      // TODO: Only Show ESM at Top Level. Show editable things
      // const isValidPlugin = this.isPlugin(f)

      const openTabs: {[x:string]: any} = {}

      // Add Tab On Click
      this.tree.oncreate = async (type, item) => {

        if (type === 'file') {
          const path = item.key
          const rangeFile = this.app.filesystem.open(path, true)
          return rangeFile
        }
      }

      this.tree.onClick = async (key, f) => {

        const existingTab = this.files.tabs.get(f.path)
        if (!existingTab){

          let metadata = await this.app.plugins.metadata(f.path) ?? await f.body
          console.log(metadata, await f.body)

          const module = await this.app.plugins.module(f.path)
          const pkg = await this.app.plugins.package(f.path)

          // Merge package with metadata
          if (pkg) metadata = Object.assign(JSON.parse(JSON.stringify(pkg)), metadata)
          console.log(metadata, module, pkg)

        let tabInfo = this.fileHistory[f.path]
        // const plugin = this.app.plugins.plugins[f.path]
  
        previousTabs.delete(f.path)

        const tab = new Tab({
          close: true,
          name: f.path
        })

        if (tabInfo) tabInfo.tab = tab
        else {
          
          tabInfo = {tab} // Start tracking essential tab information

          // Create File Editors
          tabInfo.container = new Panel({minTabs: 2})
          const codeTab = new Tab({name: "File"});

          // Conditionally Show Information
          const isPlugin = this.isPlugin(f)
          if (isPlugin){
            const infoTab = new Tab({name: 'Info'})
            tabInfo.plugin = new Plugin()
            infoTab.appendChild(tabInfo.plugin)
            tabInfo.container.addTab(infoTab)
          }

          // Show Property Editor for Objects (including esm modules)
          // if (typeof await f.body === 'object') {
          //   const objectTab = new Tab({name: "Properties"})
          //   tabInfo.object = new ObjectEditor()
          //   objectTab.appendChild(tabInfo.object)
          //   container.addTab(objectTab)
          // }

          // Always Show Code Editor
          tabInfo.code = new CodeEditor()
          codeTab.appendChild(tabInfo.code)
          tabInfo.container.addTab(codeTab)
        }

        tab.appendChild(tabInfo.container)
        this.files.addTab(tab, true)
        this.fileHistory[f.path] = tabInfo
        
        // ---------- Update Editors ----------

        // Plugin Info
        if (tabInfo.plugin) tabInfo.plugin.set( module, metadata )

        // Object Editor
        if (tabInfo.object){
          tabInfo.object.set(module)
          tabInfo.object.header = metadata.name ?? f.name
        }

        // Code Editor
        const fileText = await f.text
        tabInfo.code.value = fileText

        tabInfo.code.onInput = (text) => f.text = text,
        tabInfo.code.onSave = async () => {
            await f.save()
            await this.app.start()
        }

        openTabs[f.path] = tabInfo.tab
      } else {
        existingTab.toggle.select()
      }
    } 

    this.properties.set(allProperties)

    // Remove Tabs That No Longer Exist
    previousTabs.forEach(str => {
      const info = this.fileHistory[str]
      info.tab.remove() // Remove
      delete this.fileHistory[str]
    })

    // Actually Display Tree
    this.tree.set(this.app.filesystem.files.system)
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
            <visualscript-panel>
            <visualscript-tab name="Graph">
            ${this.graph}
          </visualscript-tab>
                <visualscript-tab name="Files">
                <div id="files">
                  ${this.tree}
                  ${this.files}
                  </div>
                </visualscript-tab>
            </visualscript-panel>
          </div>
      `

    }
  }
  
  customElements.define('visualscript-editor', Editor);