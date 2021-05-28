import { IpcRenderer } from 'electron';
import { ExtractFunctions, SubscriptionHandle, TipcInternalOptions, TipcRenderer, Typings } from './InternalTypings';
import { TipcCoreImpl } from './TipcCoreImpl';

export class TipcRendererImpl<T> implements TipcRenderer<T>{
    private _tipcImpl: TipcCoreImpl<T>;
    private _ipcRenderer: IpcRenderer;

    constructor(settings: TipcInternalOptions & {ipc: IpcRenderer}) {
        this._tipcImpl = new TipcCoreImpl<T>(settings);
        this._ipcRenderer = settings.ipc;
    }

    on<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.on(key, callback);
    }

    once<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...args: V) => any): SubscriptionHandle {
        return this._tipcImpl.once(key, callback);
    }

    broadcast<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, ...args: V): void {
        const {fullKey, fullEvent} = this._tipcImpl.broadcast(key, ...args);
        this._ipcRenderer.send(fullKey, fullEvent);
    }

    invoke<
        K extends keyof ExtractFunctions<T>,
        R extends ReturnType<T[K]>,
        P extends Parameters<T[K]>,
    >(channel: K, ...args: P): Promise<R> {
        const key = this._tipcImpl.makeKey(channel);
        this._tipcImpl.debugLog('Invoking', key, args);
        return this._ipcRenderer.invoke(key, args);
    }
}