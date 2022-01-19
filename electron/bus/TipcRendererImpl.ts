import { Args, ClientInterProcessCommunicator, ExtractFunctions, Ret, SubscriptionHandle, TipcInternalOptions, TipcRenderer, Typings } from './InternalTypings';
import { TipcCoreImpl } from './TipcCoreImpl';

export class TipcRendererImpl<T> implements TipcRenderer<T>{
    private _tipcImpl: TipcCoreImpl<T>;
    private _ipcRenderer: ClientInterProcessCommunicator;

    constructor(settings: TipcInternalOptions & {ipc: ClientInterProcessCommunicator}) {
        this._tipcImpl = new TipcCoreImpl<T>(settings);
        this._ipcRenderer = settings.ipc;
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
        this._ipcRenderer.send(fullKey, fullEvent);
    }

    invoke<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    >(channel: K, ...params: P): Promise<R> {
        const key = this._tipcImpl.makeKey(channel);
        this._tipcImpl.debugLog('Invoking', key, params);
        return this._ipcRenderer.invoke(key, params);
    }
}