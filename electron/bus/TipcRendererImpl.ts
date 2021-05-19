import { IpcRenderer } from 'electron';
import {EventEmitter} from 'events';
import { SubscriptionHandle, Typings } from './InternalTypings';
import { TipcCoreImpl } from './TipcCoreImpl';

export class TipcRendererImpl<T> {
    private _tipcImpl: TipcCoreImpl<T>;
    private _ipcRenderer: IpcRenderer;

    constructor(settings: {internalId: string, namespace: string, ipc: IpcRenderer, localEmitter: EventEmitter,  debug?: boolean}) {
        this._tipcImpl = new TipcCoreImpl<T>(settings);
        this._ipcRenderer = settings.ipc;
    }

    on<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.on(key, callback);
    }
    
    once<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.once(key, callback);
    }

    broadcast<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, ...args: V): void {
        const {fullKey, fullEvent} = this._tipcImpl.broadcast(key, ...args);
        this._ipcRenderer.send(fullKey, fullEvent);
    }
}