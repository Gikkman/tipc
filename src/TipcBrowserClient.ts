import { makeTipcInvokeObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcLogger } from "./TipcLogger";
import { TipcNamespaceClientImpl } from "./TipcNamespaceClientImpl";
import { Callback,
    TipcSubscription,
    TipcNamespaceClient,
    TipcClient,
    TipcConnectionManager,
    TipcAddressInfo,
    TipcClientOptions } from "./TipcTypes";

export class TipcBrowserClient implements TipcClient {
    protected readonly logger: TipcLogger;
    protected readonly host: string;
    protected readonly port: number;
    protected readonly path: string;
    protected readonly protocol: string;
    protected readonly tipcListenerComponent: TipcListenerComponent;
    private readonly usedNamespaces = new Set<string>();
    protected ws?: WebSocket;
    private onDisconnectCallback?: Callback;

    private constructor(options: TipcClientOptions) {
        this.host = options.host;
        this.port = options.port;
        this.path = options.path ?? "";
        this.protocol = options.protocol ?? "ws";
        this.onDisconnectCallback = options.onDisconnect;
        this.logger = new TipcLogger({messagePrefix: "[Tipc Client]", ...options.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options: TipcClientOptions): TipcConnectionManager<TipcClient> {
        const instance = new TipcBrowserClient(options);
        return instance;
    }

    public getAddressInfo(): TipcAddressInfo {
        return {address: this.host, port: this.port};
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
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
        if(this.isConnected()) {
            return this;
        }
        const url = `${this.protocol}://${this.host}:${this.port}${this.path}`;
        this.ws = await this.initWs(url);
        return this;
    }

    public reconnect(): Promise<TipcClient> {
        return this.connect();
    }

    public async shutdown(): Promise<void> {
        return new Promise(res => {
            if(this.ws?.readyState === WebSocket.OPEN) {
                this.onDisconnectCallback = undefined;
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
        let hasBeenConnected = false;

        ws.addEventListener('error', (ev) => {
            this.logger.error('Error: %s', ev);
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
                    this.tipcListenerComponent.callListeners(obj.namespace, "error-"+obj.topic, obj.data);
                }
                else {
                    this.tipcListenerComponent.callListeners(obj.namespace, obj.topic, obj.data);
                }
            }
        });
        ws.addEventListener('close', () => {
            this.logger.info("Websocket connection closed");
            this.ws = undefined;
            // The 'close' event is emitted even if the connect attempt fails, use 'hasBeenOpen'
            // to ensure we only call the "onDisconnect" callback if we've ever been connected
            if(hasBeenConnected && this.onDisconnectCallback) {
                this.onDisconnectCallback();
            }
        });

        return new Promise<WebSocket>((resolve, reject) => {
            const onError = (ev: Event) => {
                reject(ev);
            };
            ws.addEventListener('error', onError);
            ws.addEventListener('open', () => {
                ws.removeEventListener('error', onError);
                hasBeenConnected = true;
                this.logger.info("Websocket connection established: %s", url);
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
        const message = makeTipcSendObject(namespace, topic, args);
        setTimeout(() => {
            this.ws?.send(JSON.stringify(message));
            this.tipcListenerComponent.callListeners(namespace, topic, args);
        });
    }

    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    invoke(namespace: string, topic: string, ...args: any[]): Promise<any> {
        // Replies to an invocation comes on the same namespace with the messageId as topic
        // If the reply is an error, the error listener is "error-"+messageId
        const message = makeTipcInvokeObject(namespace, topic, crypto.randomUUID(), args);
        const promise = new Promise<any>((resolve, reject) => {
            let rejSub: TipcSubscription | undefined = undefined;
            const resSub = this.addOnceListener(namespace, message.messageId, (data: any[]) => {
                resolve(data);
                rejSub?.unsubscribe();
            });
            rejSub = this.addOnceListener(namespace, "error-"+message.messageId, (data: any[]) => {
                reject(data);
                resSub?.unsubscribe();
            });
        });
        this.ws?.send(JSON.stringify(message));
        return promise;
    }
}
