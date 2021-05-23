/////////////////////////////////////////////////////////////////////////////
// Type for extracting properties from a dictionary which's value matches
// a certain type (in this case, functions / not functions)
/////////////////////////////////////////////////////////////////////////////
type KeysMatchingType<T, Match> = ({[K in keyof T]: T[K] extends Match ? K : never})[keyof T];
type KeysNotMatchingType<T, Match> = ({[K in keyof T]: T[K] extends Match ? never : K})[keyof T];

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
}

export type SubscriptionHandle = {
    unsubscribe: () => void,
}

export type WindowHandle = {
    remove: () => void
}

export type Dictionary = Record<keyof any, any>;