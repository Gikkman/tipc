import { IpcRenderer } from 'electron';
import { SubscriptionHandle, TipcEventData } from './InternalTypings';

export class TipcRenderImpl<T> {
    private _internalId: string;
    private _namespace: string;
    private _emitter: IpcRenderer;
    private _debug: boolean = false;

    constructor(settings: {internalId: string, namespace: string, ipcRenderer: IpcRenderer, debug?: boolean}) {
        this._internalId = settings.internalId;
        this._namespace = settings.namespace;
        this._emitter = settings.ipcRenderer;
        this._debug = settings.debug ?? false;
        if(this._debug) console.debug("Bus debug mode: " + this._debug, this._internalId, this._namespace);
    }

    on<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V> {
        const fullKey = this.makeKey(key);
        const fullCallback =this._onHandler(callback);
        this._emitter.on(fullKey, fullCallback)
        if(this._debug) console.log("Attaching callback:", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                if(this._debug) console.log("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._emitter.off(fullKey, fullCallback)
            }
        }
    }
    
    once<K extends keyof T, V extends T[K]>(key: K, callback: (data: V) => any): SubscriptionHandle<V> {
        const fullKey = this.makeKey(key);
        const fullCallback =this._onHandler(callback);
        this._emitter.once(fullKey, fullCallback);
        if(this._debug) console.log("Attaching callback (once):", fullKey, this._internalId, this._namespace)
        return {
            unsubscribe: () => {
                if(this._debug) console.log("Unsubscribing callback:", fullKey, this._internalId, this._namespace)
                this._emitter.off(fullKey, fullCallback)
            }
        }
    }

    broadcast<K extends keyof T, V extends T[K]>(key: K, data: V): void {
        const fullKey = this.makeKey(key);
        const fullEvent: TipcEventData<V> = {senderId: this._internalId, topic: fullKey, eventData: data};
        if(this._debug) console.log("Broadcasting event:", fullEvent.topic, fullEvent.senderId, fullEvent.eventData);
        this._emitter.send(fullKey, fullEvent);
    }

    private _onHandler<V>(callback: (data: V) => any) {
        return (_: any, wrapped: TipcEventData<V>) => {
            if(this._debug) console.log("Received event:", wrapped.topic, wrapped.senderId, wrapped.eventData);
            try { callback(wrapped.eventData); }
            catch (e) {
                console.log("Exception in callback when processing event:", wrapped.topic, wrapped.senderId, wrapped.eventData);
            }
        }
    }

    private makeKey(key: string|symbol|number) {
        return `${this._namespace}\\\\${key.toString()}`;
    }
}
