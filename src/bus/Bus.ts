import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { BrowserWindow, ipcRenderer, ipcMain } from 'electron';
import { TipcInternalOptions, TipcMain, TipcOptions, TipcRenderer } from './InternalTypings';
import { TipcMainImpl } from './TipcMainImpl';
import { TipcRendererImpl } from './TipcRendererImpl';

/////////////////////////////////////////////////////////////////////////////
// Consants
/////////////////////////////////////////////////////////////////////////////
const localEmitter: EventEmitter = new EventEmitter();
const internalId = crypto.randomBytes(16).toString('hex');
const processType = process.type;

const defaultTipcOptions: Omit<TipcInternalOptions, 'ipc'> = {
    internalId,
    namespace: 'default',
    localEmitter,
    debug: false,
};

/////////////////////////////////////////////////////////////////////////////
// Exports
/////////////////////////////////////////////////////////////////////////////
export function tipcMain<T>(options?: TipcOptions): TipcMain<T> {
    if( processType !== 'browser' ) throw new Error('Cannot create a tipc main handle. This can only be done in main processes. This process type is ' + processType);
    return new TipcMainImpl<T>({ipc: ipcMain, ...defaultTipcOptions, ...options}, BrowserWindow.getAllWindows );
}

export function tipcRenderer<T>(options?: TipcOptions): TipcRenderer<T> {
    if( processType !== 'renderer' ) throw new Error('Cannot create a tipc render handle. This can only be done in render and worker processes. This process type is ' + processType);
    return new TipcRendererImpl<T>({ipc: ipcRenderer, ...defaultTipcOptions, ...options});
}