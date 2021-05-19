import { IpcMain, IpcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { SubscriptionHandle, TipcEventData } from './InternalTypings';

export class TipcCoreImpl<T> {
    private _internalId: string;
    private _namespace: string;
    private _ipcEmitter: IpcMain | IpcRenderer;
    private _localEmitter: EventEmitter;
    private _debug: boolean = false;

    constructor(settings: {internalId: string, namespace: string, ipc: IpcMain | IpcRenderer, localEmitter: EventEmitter,  debug?: boolean}) {
        this._internalId = settings.internalId;
        this._namespace =  settings.namespace;
        this._ipcEmitter =  settings.ipc;
        this._localEmitter =  settings.localEmitter;

        this._debug =  settings.debug ?? false;
        if(this._debug) console.debug("Bus debug mode: " + this._debug, this._internalId, this._namespace);
    }

    on<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            this.debugLog("Received event (local):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            this.debugLog("Received event (ipc):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        this._localEmitter.on(fullKey, localCB);
        this._ipcEmitter.on(fullKey, ipcCB);
        this.debugLog("Attaching callback:", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                this.debugLog("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._localEmitter.off(fullKey, localCB)
                this._ipcEmitter.off(fullKey, ipcCB)
            }
        }
    }
    
    once<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            this.debugLog("Received event (local, once):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            this.debugLog("Received event (ipc, once):", wrapped.topic, wrapped.senderId, wrapped.eventData);
            callback(wrapped.eventData);
        }
        this._localEmitter.once(fullKey, localCB);
        this._ipcEmitter.once(fullKey, ipcCB);
        this.debugLog("Attaching callback:", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                this.debugLog("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._localEmitter.off(fullKey, localCB)
                this._ipcEmitter.off(fullKey, ipcCB)
            }
        }
    }

    broadcast<K extends keyof T, V extends T[K]>(key: K, data: V): {fullKey: string, fullEvent: TipcEventData<V>} {
        const fullKey = this.makeKey(key);
        const fullEvent: TipcEventData<V> = {senderId: this._internalId, topic: fullKey, eventData: data};
        this.debugLog("Broadcasting event:", fullEvent.topic, fullEvent.senderId, fullEvent.eventData);
        
        this._localEmitter.emit(fullKey, fullEvent);

        return {fullKey, fullEvent};
    }

    private makeKey(key: string|symbol|number) {
        return `${this._namespace}\\\\${key.toString()}`;
    }

    private debugLog(msg: string, ...data: any[]) {
        if(!this._debug) return;
        console.log(msg, ...data);
    }
}
