import { BrowserWindow, IpcMain } from 'electron';
import { Args as Param, ExtractFunctions, Ret, SubscriptionHandle, TipcInternalOptions, TipcMain, Typings } from './InternalTypings';
import { TipcCoreImpl } from './TipcCoreImpl';

export class TipcMainImpl<T> implements TipcMain<T> {
    private _tipcImpl: TipcCoreImpl<T>;
    private _ipcMain: IpcMain;
    private _windowSetGetter: () => BrowserWindow[];

    constructor(settings: TipcInternalOptions & {ipc: IpcMain} , windowSetGetter: () => BrowserWindow[],) {
        this._tipcImpl = new TipcCoreImpl<T>(settings);
        this._ipcMain = settings.ipc;
        this._windowSetGetter = windowSetGetter;
    }

    on<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any): SubscriptionHandle {
        return this._tipcImpl.on(key, callback);
    }

    once<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any): SubscriptionHandle {
        return this._tipcImpl.once(key, callback);
    }

    broadcast<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, ...params: V): void {
        const {fullKey, fullEvent} = this._tipcImpl.broadcast(key, ...params);
        this._windowSetGetter().forEach(win => win.webContents.send(fullKey, fullEvent));
    }

    handle<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Param<T,K>,
    > (channel: K, handler: (...params: P) => R | Promise<R>): SubscriptionHandle {
        const key = this._tipcImpl.makeKey(channel);
        const cb = (_:any, args: P): R | Promise<R> => {
            this._tipcImpl.debugLog('Handling event', key, args);
            const ret = handler(...args);
            return ret;
        };
        this._ipcMain.handle(key, cb);
        return {
            unsubscribe: () => {
                this._tipcImpl.debugLog('Unsubscribing handler', key);
                this._ipcMain.removeHandler(key);
            }
        };
    }

    handleOnce<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Param<T,K>,
    > (channel: K, handler: (...params: P) => R | Promise<R>): SubscriptionHandle {
        const key = this._tipcImpl.makeKey(channel);
        const cb = (_:any, args: P): R | Promise<R> => {
            this._tipcImpl.debugLog('Handling event', key, args);
            const ret = handler(...args);
            return ret;
        };
        this._ipcMain.handleOnce(key, cb);
        return {
            unsubscribe: () => {
                this._tipcImpl.debugLog('Unsubscribing handler', key);
                this._ipcMain.removeHandler(key);
            }
        };
    }
}
