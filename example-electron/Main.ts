import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { setupWebsocketServer } from "../example-shared-resources/ServerSetup";

/************************************************************************
 *  Main behavior
 ************************************************************************/
setupWebsocketServer()
.then(() => {
    const createWindow = async () => {
        const window = new BrowserWindow({
            width: 800, height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });
        window.loadFile(join(__dirname, 'output' , 'index.html'))
        window.webContents.openDevTools();
    }
    app.on('ready', createWindow);
})

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));