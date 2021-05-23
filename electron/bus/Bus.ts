import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import {BrowserWindow, ipcRenderer, ipcMain} from 'electron';
import { SubscriptionHandle, WindowHandle, Typings, ExtractFunctions, ExtractNotFunctions } from './InternalTypings';
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

export function tipc<T>(options?: {namespace?: string, debug?: boolean}): Tipc<T> {
    const ns = options?.namespace ?? "default-namespace";
    const db = options?.debug ?? false;
    if( processType === "browser" ) return new TipcMainImpl<T>({internalId, namespace: ns, ipc: ipcMain, localEmitter, debug: db}, () => windowSet, );
    return new TipcRendererImpl<T>({internalId, namespace: ns, ipc: ipcRenderer, localEmitter, debug: db});
}

export function tipcMain<T>(): TipcMain<T> {
    if( processType !== "browser" ) throw new Error("Cannot create a tipc main handle. This can only be done in main processes. This process type is " + processType);
    return {} as TipcMain<T>;
}

export function tipcRenderer<T>(): TipcRenderer<T> {
    if( processType !== "renderer" ) throw new Error("Cannot create a tipc render handle. This can only be done in render processes. This process type is " + processType);
    return {} as TipcRenderer<T>;
}

interface Tipc<T> {
    on<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): SubscriptionHandle,
    once<
        K extends keyof ExtractNotFunctions<T>, 
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): SubscriptionHandle,
    broadcast<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, ...args: V): void,
}

interface TipcMain<T> {
    handle<
        K extends keyof ExtractFunctions<T>, 
        R extends ReturnType<T[K]>
    > (channel: K, handler: (...args: Parameters<T[K]>) => R | Promise<R>): SubscriptionHandle;
}

interface TipcRenderer<T> {
    invoke<
        K extends keyof ExtractFunctions<T>, 
        R extends ReturnType<T[K]>
    >(channel: K, ...args: Parameters<T[K]>): Promise<R>;
}