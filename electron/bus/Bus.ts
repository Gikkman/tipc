import {BrowserWindow, ipcRenderer, ipcMain} from 'electron';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { SubscriptionHandle, WindowHandle, OnlyFunctions, NoFunctions } from './InternalTypings';
import { TipcMainImpl } from './TipcMainImpl';
import { TipcRendererImpl } from './TipcRendererImpl';

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

export function tipc<T extends NoFunctions<T>>(namespace: string = "default-namespace", debug = false): Tipc<T> {
    if( processType === "browser" ) return new TipcMainImpl<T>({internalId, namespace, ipc: ipcMain, localEmitter, debug}, () => windowSet, );
    return new TipcRendererImpl<T>({internalId, namespace, ipc: ipcRenderer, localEmitter, debug});
}

export function tipcMain<T extends OnlyFunctions<T>>() {
    if( processType !== "browser" ) throw new Error("Cannot create a tipc main handle. This can only be done in main processes. This process type is " + processType);
}

export function tipcRenderer<T extends OnlyFunctions<T>>() {
    if( processType !== "renderer" ) throw new Error("Cannot create a tipc render handle. This can only be done in render processes. This process type is " + processType);
}

interface Tipc<T extends NoFunctions<T>> {
    on<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle,
    once<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle,
    broadcast<K extends keyof T, V extends T[K]>(key: K, data: V): void,
}

interface TipcMain<T extends OnlyFunctions<T>> {
    handle<K extends keyof T, V extends T[K], R extends ReturnType<T[K]>>(channel: K, handler: (data: V) => R | Promise<R>): SubscriptionHandle;
}

interface TipcRenderer<T extends OnlyFunctions<T>> {
    handle<K extends keyof T, V extends T[K], R extends ReturnType<T[K]>>(channel: K, data: V ): Promise<R>;
}