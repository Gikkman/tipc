import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcNamespaceClientImpl } from "./TipcNamespaceClientImpl";
import { Callback, TipcUntypedClient, TipcSubscription, TipcNamespaceClient, TipcClient, TipcFactory, TipcAddressInfo } from "./TipcTypes";

export class TipcBrowserClient implements TipcUntypedClient {
    protected host: string;
    protected port: number;
    protected ws?: WebSocket;

    protected tipcListenerComponent = new TipcListenerComponent()

    private constructor(url: TipcAddressInfo) {
        this.host = url.address;
        this.port = url.port;
    }

    public static create(url: TipcAddressInfo): TipcFactory<TipcClient> {
        const instance = new TipcBrowserClient(url);
        return instance;
    }

    public getAddressInfo(): TipcAddressInfo {
        return {address: this.host, port: this.port}
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcNamespaceClient<T> {
        return new TipcNamespaceClientImpl<T>(this, namespace);
    }

    public async connect(): Promise<TipcClient> {
        const url = `ws://${this.host}:${this.port}`
        this.ws = await this.initWs(url);
        return this;
    }
    
    public async shutdown(): Promise<void> {
        return new Promise(res => {
            if(this.ws?.readyState === WebSocket.OPEN) {
                this.ws.onclose = () => res(undefined);
                this.ws.close(); 
            } else {
                res(undefined)
            }
        })
    }

    private initWs(url: string) {
        let pingTimeout: NodeJS.Timeout;
        const ws = new WebSocket(url);

        ws.onmessage = (ev) => {
            const msg =ev.data
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
        }
        ws.onclose = (e) => { 
            console.error(e)
            clearTimeout(pingTimeout);
        }
        
        return new Promise<WebSocket>((resolve) => {
            ws.onopen = () => {
                resolve(ws)
            }
        })
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, topic: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: true, callback})
    }

    addOnceListener(namespace: string, topic: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: false, callback})
    }

    send(namespace: string, topic: string, ...args: any) {
        const message = makeTipcSendObject(namespace, topic, ...args)
        setImmediate(() => {
            this.ws?.send(JSON.stringify(message))
            this.tipcListenerComponent.callListeners(namespace, topic, ...args)
        })
    }
    
    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, topic: string, ...args: any[]): Promise<any> {
        // Replies to an invocation comes on the same namespace with the messageId as topic
        // If the reply is an error, the error listener is "error-"+messageId
        const message = makeTipcInvokeObject(namespace, topic, ...args)
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
        this.ws?.send(JSON.stringify(message));
        return promise;
    }
}