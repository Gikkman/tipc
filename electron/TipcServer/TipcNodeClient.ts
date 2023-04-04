import { AddressInfo, WebSocket } from "ws";
import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcNamespaceClientImpl } from "./TipcNamespaceClientImpl";
import { Callback, TipcUntypedClient, TipcSubscription, TipcClient, TipcClientCore } from "./TipcTypes";

export class TipcNodeClient implements TipcUntypedClient {
    protected host: string;
    protected port: number;
    protected ws?: WebSocket;

    protected tipcListenerComponent = new TipcListenerComponent()

    private constructor(url: AddressInfo|{address:string, port:number}) {
        this.host = url.address;
        this.port = url.port;
    }

    public static create(url: {address:string, port:number}): TipcClientCore {
        const instance = new TipcNodeClient(url);
        return instance;
    }

    public getAddressInfo(): AddressInfo {
        return {address: this.host, port: this.port, family: ''}
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcClient<T> {
        return new TipcNamespaceClientImpl<T>(this, namespace);
    }

    public async connect(): Promise<TipcClientCore> {
        const url = `ws://${this.host}:${this.port}`
        this.ws = await this.initWs(url);
        return this;
    }
    
    public async shutdown(): Promise<void> {
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
                    this.tipcListenerComponent.callListeners(obj.namespace, "error-"+obj.topic, ...obj.data);
                else
                    this.tipcListenerComponent.callListeners(obj.namespace, obj.topic, ...obj.data);
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

    send(namespace: string, key: string, ...args: any) {
        const message = makeTipcSendObject(namespace, key, ...args)
        setImmediate(() => {
            this.ws?.send(JSON.stringify(message))
            this.tipcListenerComponent.callListeners(namespace, key, ...args)
        })
    }
    
    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, key: string, ...args: any[]): Promise<any> {
        // Replies to an invocation comes on the same namespace with the messageId as key
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