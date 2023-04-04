import { WebSocketServer, WebSocket, AddressInfo } from "ws";
import { Callback, WrappedCallback, TipcMessageObject, Key, TipcSubscription, TipcInvokeObject, TipcUntypedServer, TipcServer, TipcServerCore } from "./TipcTypes";
import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { makeKey, makeTipcErrorObject, makeTipcSendObject, validateMessageObject } from "./TipcCommon";
import { TipcListenerComponent } from "./TipcListenerComponent";
import { TipcNamespaceServerImpl } from "./TipcNamespaceServerImpl";

/**
 * **Tipc Server Options**
 * 
 * When specifying {noWsServer: true}, no Websocket server will be created, and you can use the Tipc instance
 * as a pure pub/sub system.
 * 
 * When supplying a host and port, a new Websocket server instance will be create. This instance will
 * be managed by Tipc and properly shutdown once the `shutdown()` method is called. To use a random port, supply
 * port number `0`.
 * 
 * When supplying a HTTPServer, Tipc will create a Websocket server from that HTTPServer. The Websocket server
 * will be managed by Tipc, but if the HTTPServer is closed externally, the Websocket server will cease to
 * function.
 */
export type TipcServerOptions = {checkTimeouts?: boolean} & 
    ({noWsServer: true} | { address: string, port: number} | {server: HTTPServer | HTTPSServer})

export class TipcNodeServer implements TipcUntypedServer {
    private wss?: WebSocketServer;
    private options: TipcServerOptions

    protected tipcListenerComponent = new TipcListenerComponent()
    protected invokeListeners: Map<string, WrappedCallback> = new Map();

    protected constructor(options?: TipcServerOptions) {
        this.options = { checkTimeouts: false, ...(options ?? {noWsServer: true}) }
    }

    public static create(options?: TipcServerOptions): TipcServerCore {
        const server = new TipcNodeServer(options);
        return server;
    }

    public getAddressInfo() {
        const address = this.wss?.address();
        if(address) return address as AddressInfo
        return undefined
    }

    public forContractAndNamespace<T>(namespace: string & (T extends object ? string : never)): TipcServer<T> {
        return new TipcNamespaceServerImpl<T>(this, namespace);
    }

    public async connect(): Promise<TipcServerCore> {
        await this.initWss();
        return this;
    }

    public async shutdown(): Promise<void> {
        return new Promise((resolve, reject) => {
            if(!this.wss) {
                resolve(undefined);
            }
            else {
                this.wss.close();
                this.wss.clients.forEach(ws => {
                    ws.close();
                })

                let timer = 0;
                let checkClosed = () => {
                    let done = true;
                    this.wss?.clients.forEach(ws => {
                        done = done && (ws.readyState !== WebSocket.CLOSED);
                    })
                    if(done) {
                        resolve(undefined)
                    }
                    else if(timer > 5_000) {
                        this.wss?.clients.forEach(ws => {
                            if(ws.readyState !== WebSocket.CLOSED) ws.terminate()
                        })
                        resolve(undefined)
                    }
                    else {
                        setTimeout(() => {
                            timer += 50;
                            checkClosed()
                        }, 50);
                    }
                };
                checkClosed()
            }
        });
    }

    /////////////////////////////////////////////////////////////
    // Websocket stuff
    ////////////////////////////////////////////////////////////
    private initWss() {
        if("noWsServer" in this.options) {
            return new Promise<void>(r => r())
        }

        const clientAlive: Map<WebSocket, boolean> = new Map();
        const wss = new WebSocketServer(this.options);
        wss.on("connection", ws => {
            clientAlive.set(ws, true);
            ws.on("pong", () => clientAlive.set(ws, true))
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
                    this.handleWebsocketMessage(obj, ws);
                }
            })
            ws.on("close", () => {
                // console.log("Server: Client closed")
            })
            ws.onerror = (err) => {
                console.error("Server: Client error ["+err+"]")
            };
        })

        const checkTimeouts = this.options.checkTimeouts;
        const interval = setInterval( () => {
            if(!checkTimeouts) {
                return
            }
            wss.clients.forEach(ws => {
                if( clientAlive.get(ws) === false ) {
                    console.log(`Server: Terminating client ${ws.url} due to timeout`)
                    return ws.terminate();
                }
                clientAlive.set(ws, false);
                ws.ping();
            })
        }, 30_000)

        wss.on("close", () => {
            clearInterval(interval);
        })

        return new Promise<void>((resolve) => {
            wss.on("listening", () => {
                this.wss = wss;
                resolve();
            })
        })
    }

    private handleWebsocketMessage(obj: TipcMessageObject, ws: WebSocket) {
        if( obj.method === "invoke" ) {
            this.callHandler(ws, obj)
        }
        else if ( obj.method === "send" ) {
            this.tipcListenerComponent.callListeners(obj.namespace, obj.topic, ...obj.data)
        }
    }

    /////////////////////////////////////////////////////////////
    // Event listeners
    ////////////////////////////////////////////////////////////
    addListener(namespace: string, key: Key, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, key, {multiUse: true, callback})
    }

    addOnceListener(namespace: string, key: Key, callback: Callback) {
        return this.tipcListenerComponent.addListener(namespace, key, {multiUse: false, callback})
    }

    broadcast(namespace: string, key: string, ...args: any[]) {
        const message = makeTipcSendObject(namespace, key, ...args)
        const str = JSON.stringify(message)
        this.wss?.clients.forEach(ws => {
            ws.send(str)
        })
        this.tipcListenerComponent.callListeners(namespace, key, ...args)
    }
    
    /////////////////////////////////////////////////////////////
    // Invocation listeners
    ////////////////////////////////////////////////////////////
    addHandler(namespace: string, key: Key, callback: Callback) {
        return this.addHandlerInternal(namespace, key, {multiUse: true, callback})
    }
    
    addOnceHandler(namespace: string, key: Key, callback: Callback) {
        return this.addHandlerInternal(namespace, key, {multiUse: false, callback})
    }
    
    private callHandler(caller:  WebSocket, obj: TipcInvokeObject) {
        const fullKey = makeKey(obj.namespace, obj.topic);
        const handler = this.invokeListeners.get(fullKey);
        if(handler && !handler.multiUse) this.invokeListeners.delete(fullKey);
        setImmediate(async () => {
            // Replies to an invocation is sent to the same namespace with the messageId as key
            if(handler) {
                try {
                    const result = await handler.callback(...obj.data);
                    const reply = makeTipcSendObject(obj.namespace, obj.messageId, result)
                    caller.send(JSON.stringify(reply))
                } catch (e) {
                    const msg = `A server-side exception occurred. Please see the server logs for message Id ${obj.messageId}`;
                    const reply = makeTipcErrorObject(obj.namespace, obj.messageId, msg)
                    caller.send(JSON.stringify(reply))
                }
            }
            else {
                const msg = `No handler defined for namespace ${obj.namespace} and key ${obj.topic.toString()}`;
                const reply = makeTipcErrorObject(obj.namespace, obj.messageId, msg)
                caller.send(JSON.stringify(reply))
            }
        })
    }

    private addHandlerInternal(namespace: string, topic: Key, callback: WrappedCallback): TipcSubscription {
        const fullKey = makeKey(namespace, topic);
        if( this.invokeListeners.has(fullKey) ) {
            throw new Error(`Cannot register handler for key ${topic.toString()} in namespace ${namespace}. A handler is already registered with these properties`);
        }
        this.invokeListeners.set(fullKey, callback)
        return {unsubscribe: () => {
            if(this.invokeListeners.get(fullKey) === callback)
                this.invokeListeners.delete(fullKey)
        }}
    }
}