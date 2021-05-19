import { BrowserWindow, IpcMain } from 'electron';
import {EventEmitter} from 'events';
import { SubscriptionHandle, TipcEventData, Typings } from './InternalTypings';
import { TipcCoreImpl } from './TipcCoreImpl';

export class TipcMainImpl<T> {
    private _tipcImpl: TipcCoreImpl<T>;
    private _windowSetGetter: () => Set<BrowserWindow>;

    constructor(settings: {internalId: string, namespace: string, ipc: IpcMain, localEmitter: EventEmitter,  debug?: boolean}, windowSetGetter: () => Set<BrowserWindow>,) {
        this._tipcImpl = new TipcCoreImpl<T>(settings);
        this._windowSetGetter = windowSetGetter;
    }

    on<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.on(key, callback);
    }
    
    once<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.once(key, callback);
    }

    broadcast<K extends keyof T, V extends Typings<T,K> = Typings<T,K>>(key: K, ...args: V): void {
        const {fullKey, fullEvent} = this._tipcImpl.broadcast(key, ...args);
        this._windowSetGetter().forEach(win => win.webContents.send(fullKey, fullEvent));
    }
}
