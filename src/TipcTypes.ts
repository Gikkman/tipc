import { TipcLoggerOptions } from './TipcLogger';

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
export type Typings<T, K extends keyof T, F extends Funcify<T> = Funcify<T>> = Args<F, K>;
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

    isConnected(): boolean;
}

/**
 * Represents the step between setting all config for a Tipc instance, but before it's been connected.
 */
export interface TipcConnectionManager<T> {
    connect(): Promise<T>,
}
/**
 * Represents a opened TipcServer. To be able to add/call listeners, you need to create a namespaced instance, using the
 * `forContractAndNamespace` method.
 */
export interface TipcServer {
    getAddressInfo(): TipcAddressInfo|undefined
    shutdown(): Promise<unknown>,
    isOpen(): boolean,
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcNamespaceServer<T>
}
/**
 * A TipcClient connection. To be able to add/call listeners, you need to create a namespaced instance, using the
 * `forContractAndNamespace` method.
 */
export interface TipcClient {
    /** Get the URL that the underlying Websocket references */
    getUrl(): string,
    /** Closes the underlying Websocket (without calling onDisconnect callbacks) */
    shutdown(): Promise<unknown>,
    isConnected(): boolean,
    /** Creates a namespaced TipcClient, on which you can attach topic listeners */
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcNamespaceClient<T>,
    /** If the underlying Websocket is disconnected, create a new Websocket and go through the connect process */
    reconnect(): Promise<TipcClient>,
    /** @deprecate Use getUrl instead */
    getAddressInfo(): TipcAddressInfo|undefined
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
    data: unknown[]
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

export type TipcConnectionDetails = {
    url: string
} | {
    host: string,
    port: number,
    path?: string,
    protocol?: string,
}

export type TipcClientOptions = {
    onDisconnect?: () => void,
    loggerOptions?: TipcLoggerOptions
}
