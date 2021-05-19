/////////////////////////////////////////////////////////////////////////////
// Type definitions to make a type that allows us to create a type predicate
// for the exported methods
/////////////////////////////////////////////////////////////////////////////
type EmptyObject = { [K in any] : never }

type AllOrNever<
  TRecord,
  TMatch,
  K extends keyof TRecord = keyof TRecord
> = TRecord[K] extends TMatch ? K : never;

type FullInterfaceOrNothing<
  TRecord,
  TMatch,
  Matches extends keyof TRecord = AllOrNever<TRecord, TMatch>
> = Pick<TRecord, Matches>

export type NoFunctions<T> = T extends {
    [K in keyof T]: T[K] extends Function ? never : T[K]
} ? {} : never;

export type Predicate<
    TRecord,
    TMatch
> = FullInterfaceOrNothing<TRecord, TMatch> extends EmptyObject ? never : {};

/////////////////////////////////////////////////////////////////////////////
// General types
/////////////////////////////////////////////////////////////////////////////

export type Consumer<T> = (event: Event, data: T) => any;

export type TipcEventData<T> = {
    senderId: string,
    topic: string,
    eventData: T,
}

export type SubscriptionHandle<T> = {
    unsubscribe: () => void,
}

export type WindowHandle = {
    remove: () => void
}