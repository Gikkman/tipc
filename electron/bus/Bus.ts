import {BrowserWindow, ipcRenderer, ipcMain} from 'electron';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { NoFunctions, Predicate, SubscriptionHandle, WindowHandle } from './InternalTypings';
import { TipcMainImpl } from './TipcMainImpl';
import { TipcRenderImpl } from './TipcRenderImpl';

const localEmitter: EventEmitter = new EventEmitter();
const internalId = crypto.randomBytes(16).toString("hex");
const windowSet: Set<BrowserWindow> = new Set(); 
const processType = process.type;

export function addWindow(window: BrowserWindow): WindowHandle {
    windowSet.add(window);
    return {
        remove: () => windowSet.delete(window),
    };
}

export function tipc<T extends Predicate<T, NoFunctions<T>>>(namespace: string = "default-namespace", debug = false): Tipc<T> {
    if( processType === "browser" ) return new TipcMainImpl<T>({internalId, namespace, ipcMain, localEmitter, debug}, () => windowSet, );
    return new TipcRenderImpl<T>({internalId, namespace, ipcRenderer, debug});
}

export function tipcMain<T extends Predicate<T, Function>>() {
    if( processType !== "browser" ) throw new Error("Cannot create a tipc main handle. This can only be done in main processes. This process type is " + processType);
}

export function tipcRenderer<T extends Predicate<T, Function>>() {
    if( processType !== "renderer" ) throw new Error("Cannot create a tipc render handle. This can only be done in render processes. This process type is " + processType);
}

interface Tipc<T> {
    on<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V>,
    once<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V>,
    broadcast<K extends keyof T, V extends T[K]>(key: K, data: V): void,
}