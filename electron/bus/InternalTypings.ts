import { EventEmitter } from 'events';
import { IpcMain, IpcRenderer } from 'electron';

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
export type Typings<T, K extends keyof T, F extends Funcify<T>= Funcify<T>> = Args<F, K>;

/////////////////////////////////////////////////////////////////////////////
// General types
/////////////////////////////////////////////////////////////////////////////

export type Consumer<T> = (event: Event, data: T) => any;

export type TipcEventData<T> = {
    senderId: string,
    topic: string,
    eventData: T,
};

export type SubscriptionHandle = {
    unsubscribe: () => void,
};

/////////////////////////////////////////////////////////////////////////////
// Interface types
/////////////////////////////////////////////////////////////////////////////
export interface Tipc<T> {
    on<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): SubscriptionHandle;
    once<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, callback: (...args: V) => any): SubscriptionHandle;
    broadcast<
        K extends keyof ExtractNotFunctions<T>,
        V extends Typings<T,K> = Typings<T, K>
    > (key: K, ...args: V): void;
}

export interface TipcMain<T> extends Tipc<T> {
    handle<
        K extends keyof ExtractFunctions<T>,
        R extends ReturnType<T[K]>
    > (channel: K, handler: (...args: Parameters<T[K]>) => R | Promise<R>): SubscriptionHandle;
}

export interface TipcRenderer<T> extends Tipc<T> {
    invoke<
        K extends keyof ExtractFunctions<T>,
        R extends ReturnType<T[K]>
    >(channel: K, ...args: Parameters<T[K]>): Promise<R>;
}

/////////////////////////////////////////////////////////////////////////////
// Argument types
/////////////////////////////////////////////////////////////////////////////
export type TipcOptions = {
    namespace?: string,
    debug?: boolean,
    localEmitter?: EventEmitter,
};

export type TipcInternalOptions = Required<TipcOptions> & {
    internalId: string,
    ipc: IpcRenderer | IpcMain
};