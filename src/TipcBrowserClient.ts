import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcLogger } from "./TipcLogger";
import { TipcNamespaceClientImpl } from "./TipcNamespaceClientImpl";
import { Callback,
    TipcUntypedClient,
    TipcSubscription,
    TipcNamespaceClient,
    TipcClient,
    TipcFactory,
    TipcAddressInfo,
    TipcClientOptions } from "./TipcTypes";

export class TipcBrowserClient implements TipcUntypedClient {
    protected host: string;
    protected port: number;
    protected logger: TipcLogger;
    protected ws?: WebSocket;
    private usedNamespaces = new Set<string>();

    protected tipcListenerComponent: TipcListenerComponent;

    private constructor(options: TipcClientOptions) {
        this.host = options.address;
        this.port = options.port;
        this.logger = new TipcLogger({messagePrefix: "[Tipc Client]", ...options.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options: TipcClientOptions): TipcFactory<TipcClient> {
        const instance = new TipcBrowserClient(options);
        return instance;
    }

    public getAddressInfo(): TipcAddressInfo {
        return {address: this.host, port: this.port};
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcNamespaceClient<T> {
        if(this.usedNamespaces.has(namespace)) {
            let msg = `Namespace ${namespace} is already in use for this Tipc instance. `;
            msg += "If you wish to use the same namespace in several places, you should use the same instance. ";
            msg += "Different instances might use different contract types, which could use overlapping topics.";
            this.logger.warn(msg);
        }
        this.usedNamespaces.add(namespace);
        return new TipcNamespaceClientImpl<T>(this, namespace);
    }

    public async connect(): Promise<TipcClient> {
        const url = `ws://${this.host}:${this.port}`;
        this.ws = await this.initWs(url);
        return this;
    }

    public async shutdown(): Promise<void> {
        return new Promise(res => {
            if(this.ws?.readyState === WebSocket.OPEN) {
                this.ws.onclose = () => res(undefined);
                this.ws.close();
            }
            else {
                res(undefined);
            }
        });
    }

    private initWs(url: string) {
        const ws = new WebSocket(url);
        ws.addEventListener('error', (ev) => {
            this.logger.error('Error: %s',ev);
        });
        ws.addEventListener('message', (ev) => {
            const msg =ev.data;
            let obj: any;
            try {
                obj = JSON.parse(msg);
            }
            catch (e) {
                this.logger.warn("Could not JSON parse message: %s", msg);
                return;
            }
            if( validateMessageObject(obj) ) {
                if(obj.method === "error") {
                    this.tipcListenerComponent.callListeners(obj.namespace, "error-"+obj.topic, ...obj.data);
                }
                else {
                    this.tipcListenerComponent.callListeners(obj.namespace, obj.topic, ...obj.data);
                }
            }
        });
        ws.addEventListener('close', () => {
            this.logger.info("Websocket connection closed");
        });

        return new Promise<WebSocket>((resolve) => {
            this.logger.info("Websocket connection established");
            ws.addEventListener('open', () => {
                resolve(ws);
            });
        });
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, topic: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: true, callback});
    }

    addOnceListener(namespace: string, topic: string, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: false, callback});
    }

    send(namespace: string, topic: string, ...args: any) {
        const message = makeTipcSendObject(namespace, topic, ...args);
        setTimeout(() => {
            this.ws?.send(JSON.stringify(message));
            this.tipcListenerComponent.callListeners(namespace, topic, ...args);
        });
    }

    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, topic: string, ...args: any[]): Promise<any> {
        // Replies to an invocation comes on the same namespace with the messageId as topic
        // If the reply is an error, the error listener is "error-"+messageId
        const message = makeTipcInvokeObject(namespace, topic, crypto.randomUUID(), ...args);
        const promise = new Promise<any>((resolve, reject) => {
            let rejSub: TipcSubscription | undefined = undefined;
            const resSub = this.addOnceListener(namespace, message.messageId, (data: any[]) => {
                resolve(data);
                rejSub?.unsubscribe();
            });
            rejSub = this.addOnceListener(namespace, "error-"+message.messageId, (data: any[]) => {
                reject(data);
                resSub.unsubscribe();
            });
        });
        this.ws?.send(JSON.stringify(message));
        return promise;
    }
}
