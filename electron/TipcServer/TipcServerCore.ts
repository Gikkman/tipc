import { TipcServerWebsocket } from "./TipcServerWebsocket";

type Callback = (...args: any[]) => any;
type WrappedCallback = {multiUse: boolean, callback: Callback}
type Key = string|symbol|number;

export class TipcServerCore {
    protected static instance: TipcServerCore;

    private wss: TipcServerWebsocket;

    protected broadcastListeners: Map<string, WrappedCallback[]> = new Map();
    protected invokeListeners: Map<string, WrappedCallback> = new Map();

    protected constructor() {
        this.wss = new TipcServerWebsocket();
    }

    protected clear() {
        this.broadcastListeners.clear();
        this.invokeListeners.clear();
    }

    public static getInstance() {
        if(!this.instance) this.instance = new TipcServerCore();
        return this.instance;
    }

    public getAddressInfo() {
        return TipcServerCore.getInstance().wss.getAddressInfo();
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, key: Key, callback: Callback) {
        this.addListenerInternal(namespace, key, {multiUse: true, callback})
    }

    addOnceListener(namespace: string, key: Key, callback: Callback) {
        this.addListenerInternal(namespace, key, {multiUse: false, callback})
    }

    removeListener(namespace: string, key: Key, callback: Callback) {
        const fullKey = this.makeKey(namespace, key);
        const listeners = this.broadcastListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.callback !== callback);
        this.broadcastListeners.set(fullKey, filtered);
    }

    protected callListeners(namespace: string, key: Key, ...args: any[]) {
        const fullKey = this.makeKey(namespace, key);
        return new Promise<void>( (res) => {
            setImmediate(() => {
                const listeners = this.broadcastListeners.get(fullKey) ?? [];
                const filtered = listeners.filter(c => c.multiUse);
                this.broadcastListeners.set(fullKey, filtered);
                listeners.forEach(c => c.callback(...args));
                res()
            })
        })
    }

    private addListenerInternal(namespace: string, key: Key, callback: WrappedCallback) {
        const fullKey = this.makeKey(namespace, key);
        const listeners = this.broadcastListeners.get(fullKey) ?? [];
        listeners.push(callback);
        this.broadcastListeners.set(fullKey, listeners);
    }
    
    /////////////////////////////////////////////////////////////
    // Invokation listeners
    ////////////////////////////////////////////////////////////
    addHandler(namespace: string, key: Key, callback: Callback) {
        this.addHandlerInternal(namespace, key, {multiUse: true, callback})
    }
    
    addOnceHandler(namespace: string, key: Key, callback: Callback) {
        this.addHandlerInternal(namespace, key, {multiUse: false, callback})
    }
    
    removeHandler(namespace: string, key: Key) {
        const fullKey = this.makeKey(namespace, key);
        this.invokeListeners.delete(fullKey);
    }
    
    protected callHandler(namespace: string, key: Key, ...args: any[]) {
        const fullKey = this.makeKey(namespace, key);
        const c = this.invokeListeners.get(fullKey);
        if(c && !c.multiUse) this.invokeListeners.delete(fullKey);
        return new Promise<any>((res,rej) => {
            setImmediate(() => {
                if(c) {
                    try {
                        res(c.callback(...args))
                    } catch (e) {
                        rej(e)
                    }
                }
                rej(new Error(`No handler defined for namespace ${namespace} and key ${key.toString()}`));
            })
        })
    }

    private addHandlerInternal(namespace: string, key: Key, callback: WrappedCallback) {
        const fullKey = this.makeKey(namespace, key);
        if( this.invokeListeners.has(fullKey) ) {
            throw new Error(`Cannot register handler for key ${key.toString()} in namespace ${namespace}. A handler is already registered with these properties`);
        }
        this.invokeListeners.set(fullKey, callback)
    }

    /////////////////////////////////////////////////////////////
    // Invokation listeners
    ////////////////////////////////////////////////////////////
    protected makeKey(namespace: string, key: Key) {
        return `${namespace}::${key.toString()}`;
    }
}