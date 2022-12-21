import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import { Callback, WrappedCallback, Key, TipcMessageObject } from "./Types";

export class TipcNodeClient {
    protected ws?: WebSocket;

    protected sendListeners: Map<string, WrappedCallback[]> = new Map();
    protected invokeWaiters: Map<string, Callback> = new Map();

    constructor() {}

    public async startup(url: string) {
        this.ws = await this.initWs(url);
    }
    
    public async shutdown() {
        return new Promise(res => {
            if(this.ws?.readyState === WebSocket.OPEN) {
                this.ws?.once('close', () => res(undefined));
                this.ws?.close(); 
            } else {
                res(undefined)
            }
        })
    }

    private initWs(url: string) {
        let pingTimeout: NodeJS.Timeout;
        const ws = new WebSocket(url);
        
        function heartbeat() {
            clearTimeout(pingTimeout);
            pingTimeout = setTimeout(() => {
                console.log("Client: Terminating server connection due to timeout")
                ws.terminate();
            }, 45_000);
        }

        ws.on('open', heartbeat);
        ws.on('ping', heartbeat);
        ws.on("message", (data, isBinary) => {
            const msg = (isBinary ? data : data.toString()) as string;
            let obj: any;
            try {
                obj = JSON.parse(msg);
            } catch (e) {
                console.error("Server: Could not JSON parse message: " + msg)
                return;
            }
            if( this.validateMessageObject(obj) ) {
                this.callListeners(obj.namespace, obj.key, ...obj.data);
            }
        })
        ws.on('close', () => { console.log("Client: Closed"); clearTimeout(pingTimeout)})
        
        return new Promise<WebSocket>((resolve) => {
            ws.once('open', () => {
                console.log("Client: Open")
                resolve(ws)
            })
        })
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
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.callback !== callback);
        this.sendListeners.set(fullKey, filtered);
    }

    call(namespace: string, key: Key, ...args: any) {
        const message: TipcMessageObject = {
            namespace: namespace,
            key: key.toString(),
            method: "send",
            data: args,
        }
        setImmediate(() => {
            this.ws?.send(JSON.stringify(message))
            this.callListeners(namespace, key, ...args)
        })
    }

    private addListenerInternal(namespace: string, key: Key, callback: WrappedCallback) {
        const fullKey = this.makeKey(namespace, key);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        listeners.push(callback);
        this.sendListeners.set(fullKey, listeners);
    }
    
    /////////////////////////////////////////////////////////////
    // Invokation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, key: Key, ...args: any[]): Promise<any> {
        const messageId = randomUUID();
        const message: TipcMessageObject = {
            namespace: namespace,
            key: key.toString(),
            method: "invoke",
            data: args,
            messageId,
        }
        const promise = new Promise<any>(res => {
            this.addOnceListener(namespace, messageId, (data) => res(data))
        })
        this.ws?.send(JSON.stringify(message), (err) => {
            if(err) console.error(err)
            else console.log("Message sent OK")
        });
        return promise;
    }

    /////////////////////////////////////////////////////////////
    // Internals
    ////////////////////////////////////////////////////////////
    protected makeKey(namespace: string, key: Key) {
        return `${namespace}::${key.toString()}`;
    }

    private validateMessageObject(obj: any): obj is TipcMessageObject {
        const temp = obj as TipcMessageObject;
        return (!!temp.namespace) 
            && (!!temp.key) 
            && (temp.method==="send"||temp.method==="broadcast"||temp.method==="invoke");
    }

    private callListeners(namespace: string, key: Key, ...args: any) {
        const fullKey = this.makeKey(namespace, key)
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.multiUse);
        this.sendListeners.set(fullKey, filtered);
        listeners.forEach(c => c.callback(...args));
    }
}