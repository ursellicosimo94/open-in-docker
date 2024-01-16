// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const exec = require('child_process')

// Status Bar Item
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,0)

// Shell valide
const shellOptions = [
    'bash',
    'zsh',
    'sh'
]

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    statusBarItem.command = "open-in-docker.openTerminal"
    statusBarItem.text =`$(terminal-view-icon) Container`
    statusBarItem.show()

    const addConfigCommand = vscode.commands.registerCommand('open-in-docker.addConfigCommand', async () => {
        await addConfig()
    })

    /**
     * Comando per la rimozione di una o più configurazioni
     */
	let removeConfigs = vscode.commands.registerCommand('open-in-docker.removeConfigs', async () => {
        let toRemove

        do{
            toRemove = await vscode.window.showQuickPick(getConfigList(),{
                placeHolder: "Select the configurations to remove",
                canPickMany: true
            });

            if(toRemove === undefined){
                return undefined
            }
        }while(!toRemove.length)

        const configs = getConfigs()

        // List of key to save
        const cfgKeys = getConfigList().filter((value)=>{
            return !toRemove.includes(value)
        })

        const newCfg = {}

        for(let i = 0; i < cfgKeys.length; i += 1){
            newCfg[cfgKeys[i]] = configs[cfgKeys[i]]
        }

        saveConfigs(newCfg)
    })

    /**
     * Comando per aprire il terminale docker di una configurazione
     */
	let openTerminal = vscode.commands.registerCommand('open-in-docker.openTerminal', async () => {
        let cnf = await getConfig()

        if(cnf === undefined){
            return
        }

		const terminal = vscode.window.createTerminal(
            cnf.terminalName,
        )

        terminal.show(false)

        terminal.sendText(`docker exec -it ${cnf.container} ${cnf.shell}`)
        terminal.sendText(`clear`)
	});

    /**
     * Recupera la lista dei container esistenti
     * @returns {Array} Lista dei container esistenti
     */
    let dockerContainers = () => {
        const output = exec.execSync('docker ps')
        
        if(!(output instanceof Buffer)){
            const errorMsg = 'Unable to get container list, please check docker status';
            vscode.window.showErrorMessage(errorMsg)
            throw new Error(errorMsg)
        }

        const rows = output.toString().split(/(?:\r\n|\r|\n)/g);
        
        const containers = [];
        for(let i = 1; i < rows.length; i += 1){
            const row = rows[i].split(/(?:\s|\t)/g);
            containers.push(row[row.length-1])
        }
        return containers
    }
    
    /**
     * Restituisce i dati di una configurazione o se non ce ne sono ne crea una nuova
     * 
     * @returns {Promise} Dati di una configurazione
     */
    let getConfig = async ()=>{
        // Opzioni di configurazione
        const configs = getConfigs()

        const cnfList = getConfigList()

        switch(cnfList.length){
            case 0:
                return await addConfig()
            case 1:
                return configs[cnfList[0]]
        }

        const configName = await vscode.window.showQuickPick(cnfList,{
            placeHolder: "Select the container in which you want to open the terminal",
        });

        return configs[configName]
    }

    /**
     * Raccoglie i dati per una nuova configurazione e li salva
     * 
     * @returns {Promise} Restituisce un'oggetto con i dati della nuova configurazione
     */
    const addConfig = async () => {
        let newConfigName
        let override
        const configsList = getConfigList()
        const configs = getConfigs()

        do{
            newConfigName = await vscode.window.showInputBox({
                placeHolder: "Configuration Name",
                prompt: "Insert the name for configuration ex. \"container back-end bash\""
            });
            
            if(newConfigName === undefined){
                return undefined
            }

            if(configsList.includes(newConfigName)){
                do{
                    override = await vscode.window.showQuickPick(['Yes','No'],{
                        placeHolder: "A connection with this name already exists, do you want to overwrite it?"
                    });

                    if(override === 'No'){
                        newConfigName = null
                    }
                }while(!['Yes','No'].includes(override))
            }
        }while(['',0,null,undefined].includes(newConfigName))

        const newConfigData = await getNewConfig()

        if(!newConfigData){
            return
        }

        configs[newConfigName] = newConfigData

        saveConfigs(configs)

        return newConfigData
    }

    /**
     * Save configs data
     * @param {Object} configsData Configs data 
     */
    const saveConfigs = (configsData) => {
        const configs = vscode.workspace.getConfiguration(
            'launch',
            vscode.workspace.workspaceFolders[0].uri
        )

        configs.update('openInDocker',configsData)
    }

    /**
     * Get configurations data
     * @returns {Object} openInDocker configuration 
     */
    const getConfigs = () => {
        const configs = vscode.workspace.getConfiguration(
            'launch',
            vscode.workspace.workspaceFolders[0].uri
        )

        if(configs.get('openInDocker') === undefined){
            configs.update('openInDocker',{})
            return {}
        }

        return configs.get('openInDocker')
    }

    /**
     * List of configurations names
     * @returns {Array} ["conf1", "conf2"]
     */
    const getConfigList = () => {
        return Object.keys(getConfigs())
    }

    /**
     * Get data for new connection
     * @returns {Promise} New connection data as object
     */
    const getNewConfig = async ()=>{
        const newData = {}

        do{
            newData.terminalName = await vscode.window.showInputBox({
                placeHolder: "Terminal name",
                prompt: "Insert the name for terminal ex. \"back-end container\""
            });
            
            if(newData.terminalName === undefined){
                return undefined
            }
        }while(['',0,null,undefined].includes(newData.terminalName))

        do{
            newData.shell = await vscode.window.showQuickPick(shellOptions,{
                placeHolder: "Select container default terminal",
            });

            if(newData.shell === undefined){
                return undefined
            }
        }while(!shellOptions.includes(newData.shell))

        const containers = dockerContainers()

        do{
            newData.container = await vscode.window.showQuickPick(containers,{
                placeHolder: "Select the container in which you want to open the terminal",
            });

            if(newData.container === undefined){
                return undefined
            }
        }while(!containers.includes(newData.container))

        return newData
    }

	context.subscriptions.push(openTerminal);
	context.subscriptions.push(addConfigCommand);
	context.subscriptions.push(removeConfigs);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
