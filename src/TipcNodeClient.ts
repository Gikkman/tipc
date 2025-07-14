import * as crypto from "node:crypto";
import { WebSocket } from "ws";
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

export class TipcNodeClient implements TipcClient {
    protected readonly logger: TipcLogger;
    protected readonly url: URL;
    protected readonly tipcListenerComponent: TipcListenerComponent;
    private readonly usedNamespaces = new Set<string>();
    protected ws?: WebSocket;
    protected hasBeenConnected: boolean;
    private onDisconnectCallback?: Callback;

    private constructor(options: TipcClientOptions) {
        if("url" in options) {
            this.url = new URL(options.url);
        }
        else {
            this.url = new URL(`${options.protocol ?? "ws"}://${options.host}:${options.port}${options.path ?? ""}`);
        }
        this.hasBeenConnected = false;
        this.onDisconnectCallback = options.onDisconnect;
        this.logger = new TipcLogger({messagePrefix: "[Tipc Client]", ...options.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options: TipcClientOptions): TipcConnectionManager<TipcClient> {
        const instance = new TipcNodeClient(options);
        return instance;
    }

    public static wrap(ws: WebSocket, options: Pick<TipcClientOptions, "loggerOptions"|"onDisconnect">): TipcConnectionManager<TipcClient> {
        const instance = new TipcNodeClient({...options, url: ws.url});

        instance.ws = ws;
        if (ws.readyState === WebSocket.OPEN) {
            instance.hasBeenConnected = true;
            instance.attachWsListeners(ws);
        }

        return instance;
    }

    public getAddressInfo(): TipcAddressInfo {
        const portNumber = parseInt(this.url.port);
        return {address: this.url.hostname, port: portNumber};
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
        this.hasBeenConnected = false;
        this.ws = await this.initWs(this.url.href);
        return this;
    }

    public reconnect(): Promise<TipcClient> {
        return this.connect();
    }

    public async shutdown(): Promise<void> {
        return new Promise(res => {
            if(this.ws?.readyState === WebSocket.OPEN) {
                this.onDisconnectCallback = undefined;
                this.ws.once('close', () => res(undefined));
                this.ws.close();
            }
            else {
                res(undefined);
            }
        });
    }

    private initWs(url: string) {
        const ws = new WebSocket(url);

        this.attachWsListeners(ws);

        return new Promise<WebSocket>((resolve, reject) => {
            const onError = (err: Error) => {
                reject(err);
            };
            ws.on('error', onError);
            ws.on('open', () => {
                ws.off('error', onError);
                this.hasBeenConnected = true;
                this.logger.info("Websocket connection established: %s", url);
                resolve(ws);
            });
        });
    }

    private attachWsListeners(ws: WebSocket) {
        ws.on('error', (err) => {
            this.logger.error('Error: %s', err.message);
        });
        ws.on('message', (data, isBinary) => {
            const msg = (isBinary ? data : data.toString()) as string;
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
        ws.on('close', () => {
            this.logger.info("Websocket connection closed");
            this.ws = undefined;
            // The 'close' event is emitted even if the connect attempt fails, use 'hasBeenConnected'
            // to ensure we only call the "onDisconnect" callback if we've ever been connected
            if(this.hasBeenConnected && this.onDisconnectCallback) {
                this.onDisconnectCallback();
            }
        });
    }

    private __interruptWebsocket() {
        this.ws?.pause();
    }
    private __resumeWebsocket() {
        this.ws?.resume();
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
