import { nextTick } from "node:process";
import { createServer, Server } from "node:http";
import { WebSocketServer, WebSocket, AddressInfo } from "ws";
import { makeKey, makeTipcErrorObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcNamespaceServerImpl } from "./TipcNamespaceServerImpl";
import { TipcLogger } from "./TipcLogger";
import { Callback,
    WrappedCallback,
    TipcMessageObject,
    Topic,
    TipcSubscription,
    TipcInvokeObject,
    TipcNamespaceServer,
    TipcServer,
    TipcConnectionManager } from "./TipcTypes";
import { TipcServerOptions } from "./TipcTypesNodeOnly";
import { TipcNodeClient } from "./TipcNodeClient";

export type { TipcServerOptions } from "./TipcTypesNodeOnly";

export class TipcNodeServer implements TipcServer {
    private wss?: WebSocketServer;
    private server?: Server;
    private options: TipcServerOptions;
    private logger: TipcLogger;
    private usedNamespaces = new Set<string>();

    protected tipcListenerComponent: TipcListenerComponent;
    protected invokeListeners: Map<string, WrappedCallback> = new Map();

    protected constructor(options?: TipcServerOptions) {
        this.options = { clientTimeoutMs: 60*1000, ...(options ?? {noWsServer: true}) };
        this.logger = new TipcLogger({messagePrefix: "[Tipc Server]", ...options?.loggerOptions});
        this.tipcListenerComponent = new TipcListenerComponent(this.logger);
    }

    public static create(options?: TipcServerOptions): TipcConnectionManager<TipcServer> {
        const server = new TipcNodeServer(options);
        return server;
    }

    public getAddressInfo() {
        const address = this.server?.address();
        if(address) {
            return address as AddressInfo;
        }
        return undefined;
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcNamespaceServer<T> {
        if(this.usedNamespaces.has(namespace)) {
            let msg = `Namespace ${namespace} is already in use for this Tipc instance. `;
            msg += "If you wish to use the same namespace in several places, you should use the same instance. ";
            msg += "Different instances might use different contract types, which could use overlapping topics.";
            this.logger.warn(msg);
        }
        this.usedNamespaces.add(namespace);
        return new TipcNamespaceServerImpl<T>(this, namespace);
    }

    public isOpen(): boolean {
        return !!this.getAddressInfo();
    }

    public async connect(): Promise<TipcServer> {
        await this.initWss();
        return this;
    }

    /**
     * Closes the TipcServer, including both the HTTP server and Websocket server it relies on.
     *
     * If you have supplied an external HTTP server to the TipcServer, this method will attempt to close that server too.
     * In those cases, it is best to call this method from the `close` event handler of the server:
     * ```
     * server.on('close', () => tipcServer.shutdown())
     * ```
     * @param gracefulShutdownTimeMs Time to allow client connections to close gracefully, before they are force closed
     * @returns
     */
    public async shutdown(gracefulShutdownTimeMs = 5000): Promise<void> {
        this.logger.info("Shutting down TipcNodeServer");
        return new Promise((resolve) => {
            if(!this.server || !this.wss) {
                resolve(undefined);
            }
            else {
                this.server.close();
                this.wss.close();
                this.wss.clients.forEach(ws => {
                    ws.close();
                });

                let timer = 0;
                const checkClosed = () => {
                    let done = true;
                    this.wss?.clients.forEach(ws => {
                        done = done && (ws.readyState !== WebSocket.CLOSED);
                    });
                    if(done) {
                        this.logger.debug("All client connections appear closed");
                        resolve(undefined);
                    }
                    else if(timer > gracefulShutdownTimeMs) {
                        this.logger.warn("Graceful shutdown delay exceeded. Terminating remaining client connects");
                        this.wss?.clients.forEach(ws => {
                            if(ws.readyState !== WebSocket.CLOSED) {
                                ws.terminate();
                            }
                        });
                        resolve(undefined);
                    }
                    else {
                        this.logger.debug("Some client connections still open. Waiting 100ms");
                        setTimeout(() => {
                            timer += 100;
                            checkClosed();
                        }, 100);
                    }
                };
                nextTick(() => checkClosed());
            }
        });
    }

    /////////////////////////////////////////////////////////////
    // Websocket stuff
    ////////////////////////////////////////////////////////////
    private async initWss() {
        if("noWsServer" in this.options) {
            return new Promise<void>(r => r());
        }
        const clientAlive: Map<WebSocket, boolean> = new Map();

        const wss = new WebSocketServer({...this.options, port: undefined, host: undefined, server: undefined, noServer: true});
        const server = this.setupServer();

        server.on('upgrade', (request, socket, head) => {
            this.logger.debug("New client upgrade request detected");
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });

        wss.on("connection", (ws, req) => {
            clientAlive.set(ws, true);
            ws.on("pong", () => clientAlive.set(ws, true));
            ws.on("message", (data, isBinary) => {
                clientAlive.set(ws, true);
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
                    this.handleWebsocketMessage(obj, ws);
                }
            });
            ws.on("close", () => {
                this.logger.debug("Client disconnected");
                clientAlive.delete(ws);
            });
            ws.on('error', (err) => {
                this.logger.debug("Client error [%s]", err.message);
            });

            const callback = this.options.onClientConnect;
            if(callback) {
                // req.url is always set here, since the request originates from the Server instance
                const url = req.url?.startsWith("/") ? new URL(req.url, `http://${req.headers.host}`) : new URL(req.url ?? "");
                const client = TipcNodeClient.from(ws);
                nextTick(() => {
                    try {
                        callback(client, url, req);
                    }
                    catch (ex) {
                        this.logger.error("Error in onClientConnect callback: %s", ex);
                    }
                });
            }
            const oldCb = this.options.onNewConnection;
            if(oldCb) {
                nextTick(() => {
                    try {
                        oldCb(ws, req);
                    }
                    catch (ex) {
                        this.logger.error("Error in onNewConnection callback: %s", ex);
                    }
                });
            }
        });

        /**
         * This timeout function will periodically mark all clients to "not alive", then send a ping
         * request to the client. A response to the ping (a pong), or any message from the client, will
         * mark the client as alive again.
         * IF the client is still marked as "not alive" the next time the function is called, the
         * websocket will be terminated and cleaned up
         */
        const clientTimeoutMs = this.options.clientTimeoutMs;
        let interval: NodeJS.Timer;
        if(clientTimeoutMs && clientTimeoutMs > 1) {
            interval = setInterval( () => {
                this.logger.debug("Checking %s clients for timeout", wss.clients.size);
                wss.clients.forEach(ws => {
                    if( clientAlive.get(ws) === false ) {
                        this.logger.info(`Terminating client due to timeout`);
                        return ws.terminate();
                    }
                    clientAlive.set(ws, false);
                    ws.ping();
                });
            }, clientTimeoutMs);
        }

        wss.on("close", () => {
            this.logger.info("Websocket Server closed");
            clearInterval(interval);
        });

        wss.on('error', e => {
            this.logger.error("Server error: %s", e.message);
        });

        return new Promise<void>((resolve) => {
            if(server.listening) {
                this.wss = wss;
                this.server = server;
                resolve();
            }
            else {
                server.on("listening", () => {
                    this.logger.info("Websocket Server opened");
                    this.wss = wss;
                    this.server = server;
                    resolve();
                });
            }
        });
    }

    private handleWebsocketMessage(obj: TipcMessageObject, ws: WebSocket) {
        if( obj.method === "invoke" ) {
            this.callHandler(ws, obj);
        }
        else if ( obj.method === "send" ) {
            this.tipcListenerComponent.callListeners(obj.namespace, obj.topic, obj.data);
        }
    }

    private setupServer(): Server {
        if('server' in this.options) {
            return this.options.server;
        }
        if('port' in this.options && 'host' in this.options) {
            const server = createServer();
            server.listen(this.options.port, this.options.host);
            return server;
        }
        throw new Error("Invalid server options. The options must have either 'server' or 'port'+'host' defined");
    }

    private setupCloseFunction(options: TipcServerOptions, server: Server, wss: WebSocketServer): Function {
        if('server' in options) {
            return () => wss.close();
        }
        return () => server.close();
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, topic: Topic, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: true, callback});
    }

    addOnceListener(namespace: string, topic: Topic, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, topic, {multiUse: false, callback});
    }

    broadcast(namespace: string, topic: string, ...args: any[]) {
        const message = makeTipcSendObject(namespace, topic, args);
        const str = JSON.stringify(message);
        this.wss?.clients.forEach(ws => {
            ws.send(str);
        });
        this.tipcListenerComponent.callListeners(namespace, topic, args);
    }

    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    addHandler(namespace: string, topic: Topic, callback: Callback) {
        return this.addHandlerInternal(namespace, topic, {multiUse: true, callback});
    }

    addOnceHandler(namespace: string, topic: Topic, callback: Callback) {
        return this.addHandlerInternal(namespace, topic, {multiUse: false, callback});
    }

    private callHandler(caller:  WebSocket, obj: TipcInvokeObject) {
        const fullKey = makeKey(obj.namespace, obj.topic);
        const handler = this.invokeListeners.get(fullKey);
        if(handler && !handler.multiUse) {
            this.invokeListeners.delete(fullKey);
        }
        setTimeout(async () => {
            // Replies to an invocation is sent to the same namespace with the messageId as key
            if(handler) {
                try {
                    const result = await handler.callback(...obj.data);
                    const reply = makeTipcSendObject(obj.namespace, obj.messageId, [result]);
                    caller.send(JSON.stringify(reply));
                }
                catch (e) {
                    const msg = `A server-side exception occurred. Please see the server logs for message Id ${obj.messageId}`;
                    const reply = makeTipcErrorObject(obj.namespace, obj.messageId, msg);
                    caller.send(JSON.stringify(reply));
                    this.logger.error("Invoking a message handler threw an exception. Message Id %s\n%s", obj.messageId, e);
                }
            }
            else {
                const msg = `No handler defined for namespace ${obj.namespace} and key ${obj.topic}`;
                const reply = makeTipcErrorObject(obj.namespace, obj.messageId, msg);
                caller.send(JSON.stringify(reply));
                this.logger.error("Invoke request came in, but no handler was defined. Namespace %s and key %s", obj.namespace, obj.topic);
            }
        });
    }

    private addHandlerInternal(namespace: string, topic: Topic, callback: WrappedCallback): TipcSubscription {
        const fullKey = makeKey(namespace, topic);
        if( this.invokeListeners.has(fullKey) ) {
            let msg = `Cannot register handler for key ${topic.toString()} in namespace ${namespace}. `;
            msg += "A handler is already registered with these properties";
            throw new Error(msg);
        }
        this.invokeListeners.set(fullKey, callback);
        return {unsubscribe: () => {
            if(this.invokeListeners.get(fullKey) === callback) {
                this.invokeListeners.delete(fullKey);
            }
        }};
    }
}
