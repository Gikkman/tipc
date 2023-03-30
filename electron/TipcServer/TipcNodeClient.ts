import { AddressInfo, WebSocket } from "ws";
import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { Callback, TipcSubscription } from "./Types";

export class TipcNodeClient {
    protected host: string;
    protected port: number;
    protected ws?: WebSocket;

    protected tipcListenerComponent = new TipcListenerComponent()

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
            if( validateMessageObject(obj) ) {
                if(obj.method === "error") 
                    this.tipcListenerComponent.callListeners(obj.namespace, "error-"+obj.key, ...obj.data);
                else
                    this.tipcListenerComponent.callListeners(obj.namespace, obj.key, ...obj.data);
            }
        })
        ws.on('close', () => { 
            clearTimeout(pingTimeout);
        })
        
        return new Promise<WebSocket>((resolve) => {
            ws.once('open', () => {
                resolve(ws)
            })
        })
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, key: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, key, {multiUse: true, callback})
    }

    addOnceListener(namespace: string, key: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, key, {multiUse: false, callback})
    }

    removeListener(namespace: string, key: string, callback: Callback) {
        this.tipcListenerComponent.removeListener(namespace, key, callback)
    }

    call(namespace: string, key: string, ...args: any) {
        const message = makeTipcSendObject(namespace, key, ...args)
        setImmediate(() => {
            this.ws?.send(JSON.stringify(message))
            this.tipcListenerComponent.callListeners(namespace, key, ...args)
        })
    }
    
    /////////////////////////////////////////////////////////////
    // Invokation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, key: string, ...args: any[]): Promise<any> {
        // Replies to an invokation comes on the same namespace with the messageId as key
        // If the reply is an error, the error listener is "error-"+messageId
        const message = makeTipcInvokeObject(namespace, key, ...args)
        const promise = new Promise<any>((resolve, reject) => {
            let resSub: TipcSubscription, rejSub: TipcSubscription;
            resSub = this.addOnceListener(namespace, message.messageId, (data: any[]) => {
                resolve(data)
                rejSub?.unsubscribe()
            })
            rejSub = this.addOnceListener(namespace, "error-"+message.messageId, (data: any[]) => {
                reject(data)
                resSub?.unsubscribe()
            })
        })
        this.ws?.send(JSON.stringify(message), (err) => {
            if(err) console.error(err)
        });
        return promise;
    }
}