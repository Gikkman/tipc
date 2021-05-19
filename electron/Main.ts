import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { addWindow, tipc } from './bus/Bus';
import { A } from './shared/EventApiA';
/************************************************************************
 *  Main behaviour
 ************************************************************************/

const bus = tipc<A>("default", true);
bus.on("a", (data) => {
    console.log(data + " on 'a' in main");
})
bus.on("b", (data) => {
    console.log(data + " on 'b' in main");
})
bus.on("c", (data) => {
    console.log(data + " on 'c' in main");
})


function createWindow() {
    let window = new BrowserWindow({
        width: 800, height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    window.loadFile(join(__dirname, './frontend/index.html'))
    .then(e => {
        bus.broadcast("a", 1);
        setInterval(() => bus.broadcast('b', 2), 2300)
    })
    window.webContents.openDevTools();
    addWindow(window);
}

app.on('ready', createWindow);

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));