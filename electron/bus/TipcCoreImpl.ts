import { IpcMain, IpcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { SubscriptionHandle, Tipc, TipcEventData, TipcInternalOptions, Typings } from './InternalTypings';

export class TipcCoreImpl<T> implements Tipc<T>{
    private _internalId: string;
    private _namespace: string;
    private _ipcEmitter: IpcMain | IpcRenderer;
    private _localEmitter: EventEmitter;
    private _debug: boolean;

    constructor(settings: TipcInternalOptions) {
        this._internalId = settings.internalId;
        this._namespace =  settings.namespace;
        this._ipcEmitter =  settings.ipc;
        this._localEmitter =  settings.localEmitter;
        this._debug = settings.debug;
        if(this._debug) console.debug('Bus debug mode: ' + this._debug);
        if(this._debug) console.debug('Namespace: ' + this._namespace);
    }

    on<K extends keyof T, V extends Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            this.debugLog('Received event (local):', wrapped.senderId, wrapped.topic, wrapped.eventData);
            callback(...wrapped.eventData);
        };
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            this.debugLog('Received event (ipc):', wrapped.senderId, wrapped.topic, wrapped.eventData);
            callback(...wrapped.eventData);
        };
        this._localEmitter.on(fullKey, localCB);
        this._ipcEmitter.on(fullKey, ipcCB);
        this.debugLog('Attaching callback:', fullKey, this._namespace);
        return {
            unsubscribe: () => {
                this.debugLog('Unsubscribing callback:', fullKey, this._namespace);
                this._localEmitter.off(fullKey, localCB);
                this._ipcEmitter.off(fullKey, ipcCB);
            }
        };
    }

    once<K extends keyof T, V extends Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        const fullKey = this.makeKey(key);
        const localCB = (wrapped: TipcEventData<V>) => {
            this.debugLog('Received event (local, once):', wrapped.senderId, wrapped.topic, wrapped.eventData);
            callback(...wrapped.eventData);
        };
        const ipcCB = (_:any, wrapped: TipcEventData<V>) => {
            this.debugLog('Received event (ipc, once):', wrapped.senderId, wrapped.topic, wrapped.eventData);
            callback(...wrapped.eventData);
        };
        this._localEmitter.once(fullKey, localCB);
        this._ipcEmitter.once(fullKey, ipcCB);
        this.debugLog('Attaching callback:', fullKey, this._namespace);
        return {
            unsubscribe: () => {
                this.debugLog('Unsubscribing callback:', fullKey, this._namespace);
                this._localEmitter.off(fullKey, localCB);
                this._ipcEmitter.off(fullKey, ipcCB);
            }
        };
    }

    broadcast<K extends keyof T, V extends Typings<T,K>>(key: K, ...args: V): {fullKey: string, fullEvent: TipcEventData<V>} {
        const fullKey = this.makeKey(key);
        const fullEvent: TipcEventData<V> = {senderId: this._internalId, topic: fullKey, eventData: args};
        this.debugLog('Broadcasting event:', fullEvent.topic, fullEvent.eventData);

        this._localEmitter.emit(fullKey, fullEvent);

        return {fullKey, fullEvent};
    }

    makeKey(key: string|symbol|number) {
        return `${this._namespace}\\\\${key.toString()}`;
    }

    debugLog(...data: (string|object)[]) {
        if(!this._debug) return;
        const spread = [];
        for(let i = 0; i < data.length; i++) {
            const elem = data[i];
            if(Array.isArray(elem)) {
                spread.push(...elem);
            }
            else {
                spread.push(elem);
            }
        }
        console.log(this._internalId, ...spread);
    }

}
