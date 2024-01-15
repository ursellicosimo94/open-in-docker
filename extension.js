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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('open-in-docker.openTerminal', async () => {
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

    let setConfig = async ()=>{
        // Opzioni di configurazione
        const config = vscode.workspace.getConfiguration(
            'launch',
            vscode.workspace.workspaceFolders[0].uri
        )

        let multiple
        const newConn = 'Configure another container'
        const resetConn = 'Reset all configurations'
        const options = [newConn, resetConn]

        if(config.get('openInDocker') !== undefined){
            do{
                multiple = await vscode.window.showQuickPick(options,{
                    placeHolder: "One or more connections are already present!",
                });
    
                if(multiple === undefined){
                    return undefined
                }
            }while(!options.includes(multiple));
        }

        let data
        let newData = {}

        if( multiple === newConn ){
            data = {...config.get('openInDocker')}
            newData = data
        }else{
            data = [config.get('openInDocker')]
            data.push(newData)
        }
        
        do{
            newData.terminalName = await vscode.window.showInputBox({
                placeHolder: "Terminal name",
                prompt: "Insert the name for terminal ex. \"back-end container\""
            });
            
            if(newData.terminalName === undefined){
                return undefined
            }
        }while(['',0,null,undefined].includes(newData.terminalName));

        do{
            newData.shell = await vscode.window.showQuickPick(shellOptions,{
                placeHolder: "Select container default terminal",
            });

            if(newData.shell === undefined){
                return undefined
            }
        }while(!shellOptions.includes(newData.shell));

        const containers = dockerContainers();

        do{
            newData.container = await vscode.window.showQuickPick(containers,{
                placeHolder: "Select the container in which you want to open the terminal",
            });

            if(newData.container === undefined){
                return undefined
            }
        }while(!containers.includes(newData.container));

        config.update('openInDocker',newData,null)

        return newData
    }

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

    let getConfig = async ()=>{
        // Opzioni di configurazione
        const config = vscode.workspace.getConfiguration(
            'launch',
            vscode.workspace.workspaceFolders[0].uri
        )

        if(config.get('openInDocker') === undefined){
            return setConfig()
        }

        //TODO:: bisogna chiedere quale connessione vuole se ce ne sono più di una
        return config.get('openInDocker')
    }

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
