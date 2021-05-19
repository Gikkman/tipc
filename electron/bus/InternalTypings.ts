type Funcify<M> = {
    [P in keyof M]: M[P] extends Function ? M[P]: (arg: M[P]) => void
};

/////////////////////////////////////////////////////////////////////////////
// Type definitions to make a type that allows us to create a type predicate
// for the exported methods
/////////////////////////////////////////////////////////////////////////////
export type NoFunctions<M> = { 
    [P in Extract<keyof M, string | symbol>]: M[P] extends Function ? never : M[P]
};

export type OnlyFunctions<M> = { 
    [P in Extract<keyof M, string | symbol>]: M[P] extends (...args: infer A) => infer R ? (...args: A) => R : never
};

export type Args<M, E extends keyof M> = M[E] extends (...args: infer A) => any ? A : never;
export type Typings<M, K extends keyof M, F extends Funcify<M>= Funcify<M>> = Args<F, K>;
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