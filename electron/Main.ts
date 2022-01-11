import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { tipcMain } from './bus/Bus';
import { A, B } from './shared/EventApi';
/************************************************************************
 *  Main behaviour
 ************************************************************************/
const bus = tipcMain<A>({debug: true});
const otherBus = tipcMain<B>({debug: true, namespace: "alternative-namespace"});
bus.on('a', (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
});
otherBus.on('b', (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
});
bus.on('c', (event) => {
    console.log(`Received ${event.data} from ${event.sender} on main`);
});
bus.once('d', () => {
    console.log(`Received -blank- on main`);
    bus.broadcast('c', {sender: 'main', data: 3});
});
bus.handle('F', (num, sender) => {
    console.log(`Handling ${num} and ${sender} on main`);
    return num + sender.length;
});
bus.handle('G', async (data, sender) => {
    console.log(`Handling ${data} and ${sender} on main`);
    return data + sender.length;
});
otherBus.handle('H', async (data) => {
    console.log(`Handling ${data} on main`);
    return new Promise<number>( (res) => setTimeout(() => res(data[0]*data[1]*data[2]), 1000) );
});
bus.handle('I', () => {
    console.log(`Handling -blank- on main`);
    return 'Hello World';
});

function createWindow() {
    const window = new BrowserWindow({
        width: 800, height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    window.loadFile(join(__dirname, './frontend/index.html'))
    .then(e => {
        bus.broadcast('a', {data: 1, sender: 'main'});
        setInterval(() => otherBus.broadcast('b', {data: 2, sender: 'main'}), 5000);
    });
    window.webContents.openDevTools();
}

app.on('ready', createWindow);

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));