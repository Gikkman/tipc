import {Server as HTTPServer} from 'http'
import {Server as HTTPSServer} from 'http'

/////////////////////////////////////////////////////////////////////////////
// Type for extracting properties from a dictionary which's value matches
// a certain type (in this case, functions / not functions)
/////////////////////////////////////////////////////////////////////////////
type KeysMatchingType<T, Match, Keys extends keyof T = Extract<keyof T, string>> = ({[K in Keys]: T[K] extends Match ? K : never})[Keys];
type KeysNotMatchingType<T, Match, Keys extends keyof T = Extract<keyof T, string>> = ({[K in Keys]: T[K] extends Match ? never : K})[Keys];

export type ExtractFunctions<T> = Pick<T, KeysMatchingType<T, Function>>;
export type ExtractNotFunctions<T> = Pick<T, KeysNotMatchingType<T, Function>>;

/////////////////////////////////////////////////////////////////////////////
// Type for extracting knowledge of type mapping
/////////////////////////////////////////////////////////////////////////////
type Funcify<T> = {
    [P in keyof T]: T[P] extends Function ? T[P]: (arg: T[P]) => void
};
export type Args<T, K extends keyof T> = T[K] extends (...args: infer A) => any ? A : never;
export type Ret<T, K extends keyof T> = T[K] extends (...args: any) => infer U ? U : never;
export type Typings<T, K extends keyof T, F extends Funcify<T>= Funcify<T>> = Args<F, K>;

/////////////////////////////////////////////////////////////////////////////
// Interface types
/////////////////////////////////////////////////////////////////////////////
export type TipcAddressInfo = {
    address: string, port: number
}

export interface TipcCore<T> {
    addListener<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (topic: K, callback: (...args: V) => any): TipcSubscription;
    addOnceListener<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (topic: K, callback: (...args: V) => any): TipcSubscription;
    send<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (topic: K, ...args: V): void;
}

export interface TipcNamespaceServer<T> extends TipcCore<T> {
    addHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>
    > (topic: K, handler: (...args: Args<T,K>) => R | Promise<R>): TipcSubscription;
    addOnceHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>
    > (topic: K, handler: (...args: Args<T,K>) => R | Promise<R>): TipcSubscription;
    getAddressInfo(): TipcAddressInfo|undefined
}

export interface TipcNamespaceClient<T> extends TipcCore<T> {
    invoke<
    K extends keyof ExtractFunctions<T>,
    R extends Ret<T,K>
    >(topic: K, ...args: Args<T,K>): Promise<R>;
}

/**
 * Represents the step between setting all config for a Tipc instance, but before it's been connected.
 */
export interface TipcFactory<T> {
    connect(): Promise<T>,
}
/**
 * Represents a opened TipcServer. To be able to add/call listeners, you need to create a namespaced instance, using the 
 * `forContractAndNamespace` method.
 */
export interface TipcServer {
    getAddressInfo(): TipcAddressInfo|undefined
    shutdown(): Promise<unknown>,
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcNamespaceServer<T>
}
/**
 * Represents an established TipcClient connection. To be able to add/call listeners, you need to create a namespaced instance, using the 
 * `forContractAndNamespace` method.
 */
export interface TipcClient {
    getAddressInfo(): TipcAddressInfo|undefined
    shutdown(): Promise<unknown>,
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcNamespaceClient<T>
}

/////////////////////////////////////////////////////////////////////////////
// Support types
/////////////////////////////////////////////////////////////////////////////
/**
 * An object representing a topic subscription of some sort. The `unsubscribe` method
 * can be used to remove the created subscription.
 */
export type TipcSubscription = {
    /**
     * Removes a tipc subscription
     */
    unsubscribe: () => void,
};

export type Callback = (...args: any[]) => any;
export type WrappedCallback = {multiUse: boolean, callback: Callback}
export type Topic = string|number|symbol;

type TipcMessageBase = {
    namespace: string,
    topic: string,
    data: any[]
};
export type TipcInvokeObject = {
    method: "invoke",
    messageId: string,
} & TipcMessageBase;
export type TipcSendObject = {
    method: "send",
} & TipcMessageBase;
export type TipcErrorObject = {
    method: "error",
} & TipcMessageBase;
export type TipcMessageObject = TipcSendObject | TipcInvokeObject | TipcErrorObject;

export type TipcUntypedServer = {
    broadcast(namespace: string, topic: Topic, ...args: any[]): void,
    
    addListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    
    addHandler(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    addOnceHandler(namespace: string, topic: Topic, callback: Callback): TipcSubscription,

    getAddressInfo(): TipcAddressInfo|undefined
}
export type TipcUntypedClient = {
    send(namespace: string, topic: Topic, ...args: any[]): void,
    invoke(namespace: string, topic: Topic, ...args: any[]): Promise<any>,
    
    addListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
}

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
export type TipcServerOptions = {checkTimeouts?: boolean, noWsServer: true} 
                              | {checkTimeouts?: boolean, address: string, port: number} 
                              | {checkTimeouts?: boolean, server: HTTPServer | HTTPSServer}