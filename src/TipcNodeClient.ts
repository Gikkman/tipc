import { WebSocket } from "ws";
import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcNamespaceClientImpl } from "./TipcNamespaceClientImpl";
import { Callback, TipcUntypedClient, TipcSubscription, TipcNamespaceClient, TipcClient, TipcFactory, TipcAddressInfo, TipcClientOptions } from "./TipcTypes";
import { randomUUID } from "crypto";
import { TipcLogger } from "./TipcLogger";

export class TipcNodeClient implements TipcUntypedClient {
    protected logger: TipcLogger;
    protected host: string;
    protected port: number;
    protected ws?: WebSocket;
    private usedNamespaces = new Set<string>();

    protected tipcListenerComponent: TipcListenerComponent;

    private constructor(options: TipcClientOptions) {
        this.port = options.port;
        this.host = options.address;
        this.logger = new TipcLogger({messagePrefix:"[Tipc Client]" ,...options.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options: TipcClientOptions): TipcFactory<TipcClient> {
        const instance = new TipcNodeClient(options);
        return instance;
    }

    public getAddressInfo(): TipcAddressInfo {
        return {address: this.host, port: this.port}
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcNamespaceClient<T> {
        if(this.usedNamespaces.has(namespace)) {
            this.logger.warn(`Namespace ${namespace} is already in use for this Tipc instance. If you wish to use the same namespace in several places, you should typically use the same instance. Different instances might use different contract types, which could use overlapping topics.`)
        }
        this.usedNamespaces.add(namespace);
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
                this.ws.once('close', () => res(undefined));
                this.ws.close(); 
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
                this.logger.warn("Could not JSON parse message: %s", msg)
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
            this.logger.info("Websocket connection closed")
            clearTimeout(pingTimeout);
        })
        
        return new Promise<WebSocket>((resolve) => {
            this.logger.info("Websocket connection established")
            ws.once('open', () => {
                resolve(ws)
            })
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
        setTimeout(() => {
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
        const message = makeTipcInvokeObject(namespace, topic, randomUUID(), ...args)
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