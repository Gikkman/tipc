import { BrowserWindow, IpcMain } from 'electron';
import {EventEmitter} from 'events';
import { SubscriptionHandle, TipcEventData } from './InternalTypings';

const windowSet: Set<BrowserWindow> = new Set(); 

export class TipcMainImpl<T> {
    private _internalId: string;
    private _namespace: string;
    private _ipcEmitter: IpcMain;
    private _localEmitter: EventEmitter;
    private _windowSetGetter: () => Set<BrowserWindow>;
    private _debug: boolean = false;

    constructor(settings: {internalId: string, namespace: string, ipcMain: IpcMain, localEmitter: EventEmitter,  debug?: boolean}, windowSetGetter: () => Set<BrowserWindow>,) {
        this._internalId = settings.internalId;
        this._namespace =  settings.namespace;
        this._ipcEmitter =  settings.ipcMain;
        this._localEmitter =  settings.localEmitter;
        this._windowSetGetter = windowSetGetter;

        this._debug =  settings.debug ?? false;
        if(this._debug) console.debug("Bus debug mode: " + this._debug, this._internalId, this._namespace);
    }

    on<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V> {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            if(this._debug) console.log("Received event (local):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            if(this._debug) console.log("Received event (ipc):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
            this._windowSetGetter().forEach(win => win.webContents.send(fullKey, wrapped) );
        }
        this._localEmitter.on(fullKey, localCB);
        this._ipcEmitter.on(fullKey, ipcCB);

        if(this._debug) console.log("Attaching callback:", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                if(this._debug) console.log("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._localEmitter.off(fullKey, localCB)
                this._ipcEmitter.off(fullKey, ipcCB)
            }
        }
    }
    
    once<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V> {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            if(this._debug) console.log("Received event (once, local):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            if(this._debug) console.log("Received event (once, ipc):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
            this._windowSetGetter().forEach(win => win.webContents.send(fullKey, wrapped) );
        }
        this._localEmitter.once(fullKey, localCB);
        this._ipcEmitter.once(fullKey, ipcCB);

        if(this._debug) console.log("Attaching callback:", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                if(this._debug) console.log("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._localEmitter.off(fullKey, localCB)
                this._ipcEmitter.off(fullKey, ipcCB)
            }
        }
    }

    broadcast<K extends keyof T, V extends T[K]>(key: K, data: V): void {
        const fullKey = this.makeKey(key);
        const fullEvent: TipcEventData<V> = {senderId: this._internalId, topic: fullKey, eventData: data};
        if(this._debug) console.log("Broadcasting event:", fullEvent.topic, fullEvent.senderId, fullEvent.eventData);
        
        this._localEmitter.emit(fullKey, fullEvent);
        this._windowSetGetter().forEach(win => win.webContents.send(fullKey, fullEvent));
    }

    private makeKey(key: string|symbol|number) {
        return `${this._namespace}\\\\${key.toString()}`;
    }
}
