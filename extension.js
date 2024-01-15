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

        const data = {...config.get('openInDocker')}

        do{
            data.terminalName = await vscode.window.showInputBox({
                placeHolder: "Terminal name",
                prompt: "Insert the name for terminal ex. \"back-end container\""
            });
            
            if(data.terminalName === undefined){
                return undefined
            }
        }while(['',0,null,undefined].includes(data.terminalName));

        do{
            data.shell = await vscode.window.showQuickPick(shellOptions,{
                placeHolder: "Select container default terminal",
            });

            if(data.shell === undefined){
                return undefined
            }
        }while(!shellOptions.includes(data.shell));

        const containers = dockerContainers();

        do{
            data.container = await vscode.window.showQuickPick(containers,{
                placeHolder: "Select the container in which you want to open the terminal",
            });

            if(data.container === undefined){
                return undefined
            }
        }while(!containers.includes(data.container));

        config.update('openInDocker',data,null)

        return data
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

        if(config.get('openInDocker') !== undefined){
            return config.get('openInDocker')
        }

        return setConfig()
    }

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
