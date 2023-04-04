/////////////////////////////////////////////////////////////////////////////
// Type for extracting properties from a dictionary which's value matches
// a certain type (in this case, functions / not functions)

import { AddressInfo } from "net";

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
export interface TipcCore<T> {
    addListener<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): TipcSubscription;
    addOnceListener<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): TipcSubscription;
    send<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, ...args: V): void;
}

export interface TipcServer<T> extends TipcCore<T> {
    addHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>
    > (channel: K, handler: (...args: Args<T,K>) => R | Promise<R>): TipcSubscription;
    addOnceHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>
    > (channel: K, handler: (...args: Args<T,K>) => R | Promise<R>): TipcSubscription;
    getAddressInfo(): AddressInfo|undefined
}

export interface TipcClient<T> extends TipcCore<T> {
    invoke<
    K extends keyof ExtractFunctions<T>,
    R extends Ret<T,K>
    >(channel: K, ...args: Args<T,K>): Promise<R>;
}

export interface TipcServerCore {
    getAddressInfo(): AddressInfo|undefined
    shutdown(): Promise<unknown>,
    connect(): Promise<TipcServerCore>,
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcServer<T>
}
export interface TipcClientCore {
    shutdown(): Promise<unknown>,
    connect(): Promise<TipcClientCore>,
    forContractAndNamespace<T = "Please provide a mapping type">(namespace: string & (T extends object ? string : never)): TipcClient<T>
}

/////////////////////////////////////////////////////////////////////////////
// Support types
/////////////////////////////////////////////////////////////////////////////
export type TipcSubscription = {
    /**
     * Removes a tipc subscription
     */
    unsubscribe: () => void,
};

export type Callback = (...args: any[]) => any;
export type WrappedCallback = {multiUse: boolean, callback: Callback}
export type Key = string|number|symbol;

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
    broadcast(namespace: string, topic: Key, ...args: any[]): void,
    
    addListener(namespace: string, topic: Key, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, topic: Key, callback: Callback): TipcSubscription,
    
    addHandler(namespace: string, topic: Key, callback: Callback): TipcSubscription,
    addOnceHandler(namespace: string, topic: Key, callback: Callback): TipcSubscription,

    getAddressInfo(): AddressInfo|undefined
}
export type TipcUntypedClient = {
    send(namespace: string, topic: Key, ...args: any[]): void,
    invoke(namespace: string, topic: Key, ...args: any[]): Promise<any>,
    
    addListener(namespace: string, topic: Key, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, topic: Key, callback: Callback): TipcSubscription,
}