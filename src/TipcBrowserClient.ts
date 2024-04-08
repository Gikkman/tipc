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
    TipcConnectionDetails,
    TipcClientOptions } from "./TipcTypes";

export class TipcBrowserClient implements TipcClient {
    protected readonly logger: TipcLogger;
    protected readonly tipcListenerComponent: TipcListenerComponent;
    protected readonly url: string;
    private readonly usedNamespaces = new Set<string>();
    protected ws?: WebSocket;
    private onDisconnectCallback?: Callback;

    private constructor(options: TipcConnectionDetails&TipcClientOptions) {
        if("url" in options) {
            this.url = options.url;
        }
        else {
            this.url = `${options.protocol??"ws"}://${options.host}:${options.port}${options.path??""}`;
        }
        this.onDisconnectCallback = options.onDisconnect;
        this.logger = new TipcLogger({messagePrefix: "[Tipc Client]", ...options.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options: TipcConnectionDetails&TipcClientOptions): TipcConnectionManager<TipcClient> {
        const instance = new TipcBrowserClient(options);
        return instance;
    }

    public static from(websocket: WebSocket, options?: TipcClientOptions) {
        const instance = new TipcBrowserClient({url: websocket.url, ...options});
        instance.ws = websocket;
        instance.initWs(websocket);
        return instance;
    }

    public getAddressInfo(): TipcAddressInfo | undefined {
        const url = this.getUrl();
        if(!url) {
            return;
        }
        try {
            const parsed = new URL(url);
            return {address: parsed.hostname, port: parseInt(parsed.port)};
        }
        catch {
            return undefined;
        }
    }

    public getUrl(): string {
        return this.url;
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
        this.ws = await this.initWs(this.url);
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

    private initWs(urlOrWebsocket: string|WebSocket) {
        const ws = typeof urlOrWebsocket === "string"
            ? new WebSocket(urlOrWebsocket)
            : urlOrWebsocket;
        let hasBeenConnected = ws.readyState === WebSocket.OPEN;

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
            if(ws.readyState === WebSocket.OPEN) {
                resolve(ws);
            }
            else {
                const onError = (ev: Event) => {
                    reject(ev);
                };
                ws.addEventListener('error', onError);
                ws.addEventListener('open', () => {
                    ws.removeEventListener('error', onError);
                    hasBeenConnected = true;
                    this.logger.info("Websocket connection established: %s", urlOrWebsocket);
                    resolve(ws);
                });
            }
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
