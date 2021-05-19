import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { addWindow, tipc, tipcMain } from './bus/Bus';
import { A } from './shared/EventApiA';
import { F } from './shared/EventApiF';
/************************************************************************
 *  Main behaviour
 ************************************************************************/
const bus = tipc<A>("default", true);
bus.on("a", (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
})
bus.on("b", (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
})
bus.on("c", (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
})
bus.once("d", () => {
    console.log(`Received -blank- on main`);
    bus.broadcast('c', {sender: 'main', data: 3});
})
/* const handler = tipcMain<F>();
handler.handle("a", (data, sender) => 1);
handler.handle("b", (data, sender) => 2);
handler.handle("c", (data) => 3);
handler.handle("d", async () => "hello"); */

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
        bus.broadcast("a", {data: 1, sender: 'main'});
        setInterval(() => bus.broadcast('b', {data: 2, sender: 'main'}), 5000)
    })
    window.webContents.openDevTools();
    addWindow(window);
}

app.on('ready', createWindow);

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));