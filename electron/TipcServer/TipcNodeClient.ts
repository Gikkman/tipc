import { randomUUID } from "crypto";
import { AddressInfo, WebSocket } from "ws";
import { Callback, WrappedCallback, Key, TipcMessageObject, TipcSubscription, TipcErrorObject } from "./Types";

export class TipcNodeClient {
    protected host: string;
    protected port: number;
    protected ws?: WebSocket;

    protected sendListeners: Map<string, WrappedCallback[]> = new Map();
    protected invokeWaiters: Map<string, Callback> = new Map();

    constructor(url: AddressInfo|{address:string, port:number}) {
        this.host = url.address;
        this.port = url.port;
    }

    public static async create(url: {address:string, port:number}) {
        const instance = new TipcNodeClient(url);
        await instance.startup();
        return instance;
    }

    public async startup() {
        const url = `ws://${this.host}:${this.port}`
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
                // console.log("Client: Terminating server connection due to timeout")
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
                if(obj.method === "error") 
                    this.callListeners(obj.namespace, "error-"+obj.key, ...obj.data);
                else
                    this.callListeners(obj.namespace, obj.key, ...obj.data);
            }
        })
        ws.on('close', () => { 
            // console.log("Client: Closed"); 
            clearTimeout(pingTimeout);
        })
        
        return new Promise<WebSocket>((resolve) => {
            ws.once('open', () => {
                // console.log("Client: Open")
                resolve(ws)
            })
        })
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, key: Key, callback: Callback) {
        return this.addListenerInternal(namespace, key, {multiUse: true, callback})
    }

    addOnceListener(namespace: string, key: Key, callback: Callback) {
        return this.addListenerInternal(namespace, key, {multiUse: false, callback})
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

    private addListenerInternal(namespace: string, key: Key, callback: WrappedCallback): TipcSubscription {
        const fullKey = this.makeKey(namespace, key);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        listeners.push(callback);
        this.sendListeners.set(fullKey, listeners);
        return {unsubscribe: () => {
            const filtered = (this.sendListeners.get(fullKey) ?? []).filter(cb => cb !== callback)
            if(filtered.length===0){
                this.sendListeners.delete(fullKey)
            } else {
                this.sendListeners.set(fullKey, filtered)
            }
        }}
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
        const promise = new Promise<any>((resolve, reject) => {
            let res: TipcSubscription, rej: TipcSubscription;
            res = this.addOnceListener(namespace, messageId, (data: any[]) => {
                resolve(data)
                rej?.unsubscribe()
            })
            rej = this.addOnceListener(namespace, "error-"+messageId, (data: any[]) => {
                reject(data)
                res?.unsubscribe()
            })
        })
        this.ws?.send(JSON.stringify(message), (err) => {
            if(err) console.error(err)
            // else console.log("Message sent OK")
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
        const primary = (!!temp.namespace) 
                        && (!!temp.key) 
                        && (temp.method==="send"
                            ||temp.method==="invoke"
                            ||temp.method==="error");
        // TipcInvokeObject has an additional property, messageId
        if(primary && temp.method==="invoke") {
            return (!!temp.messageId)
        } else {
            return primary
        }
    }

    private callListeners(namespace: string, key: Key, ...args: any) {
        const fullKey = this.makeKey(namespace, key)
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.multiUse);
        if(filtered.length===0) {
            this.sendListeners.delete(fullKey)
        }
        else {
            this.sendListeners.set(fullKey, filtered);
        }
        listeners.forEach(c => c.callback(...args));
    }
}