import {ipcMain, ipcRenderer, Event, IpcMain, IpcRenderer, BrowserWindow} from 'electron';
import {EventEmitter} from 'events';

const windowSet: Set<BrowserWindow> = new Set(); 
const isRenderer = process.type === 'renderer';
const eventEmitter: EventEmitter = new EventEmitter();

type Consumer = (event: Event, data: any) => void;

type SubscriptionHandle = {
    unsubscribe: () => void,
    replace: (newConsumer: Consumer) => void,
}
type WindowHandle = {
    remove: () => void
}

declare const meta: unique symbol;
type Base<M> = { [P in Extract<keyof M, string | symbol>]: (...args: any[]) => void };
