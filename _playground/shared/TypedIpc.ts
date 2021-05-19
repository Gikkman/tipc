import { Event, IpcMainEvent, IpcMainInvokeEvent, IpcRendererEvent } from 'electron';

/* ****************************************************************
 *  Base types
 ******************************************************************/
declare const meta: unique symbol;

type Base<M> = { [P in Extract<keyof M, string | symbol>]: (...args: any[]) => void };
type Args<M, E extends keyof M> = M[E] extends (...args: infer A) => void ? A : never;
type Listener<M, E extends keyof M, T, Q> = (this: T, e: Q, ...args: Args<M, E>) => void;
type Evented<On, Emit = On> = { [meta]?: [On, Emit] };

type Funcify<M> = {
    [P in Extract<keyof M, string>]: M[P] extends Function ? M[P]: (arg: M[P]) => void
};

/* ************************************************************************************************
 *  On, Once and Send
 **************************************************************************************************
 *  Interfaces
 ******************************************************************/
interface OnMethods<Q extends Event, On> {
    on<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): this;
    on(event: never, listener: (...args: any[]) => void): this;

    once<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): this;
    once(event: never, listener: (...args: any[]) => void): this;

    removeListener<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): this;
    removeListener(event: never, listener: (...args: any[]) => void): this;

    removeAllListeners<E extends keyof On>(event: E): this;
    removeAllListeners(event: never): this;
}

interface SendMethods<Emit> {
    send<E extends keyof Emit>(event: E, ...args: Args<Emit, E>): void;
    send(event: never, ...args: any[]): void;

}

/* ****************************************************************
 *  Strict types
 ******************************************************************/
export type StrictMain<
    On extends Base<On>,
    Emit extends Base<Emit> | On = On,
    EventType extends Event = IpcMainEvent
> =
    & Evented<On, Emit>
    & OnMethods<EventType, On>;

export type StrictRenderer<
    On extends Base<On>,
    Emit extends Base<Emit> | On = On
> =
    & StrictMain<On, Emit, IpcRendererEvent>
    & SendMethods<Emit>;

/* ************************************************************************************************
 *  Handle, HandleOnce and Invoke
 **************************************************************************************************
 *  Interfaces
 ******************************************************************/
interface HandleMethods<Q extends Event, On> {
    handle<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): void;
    handle(event: never, listener: (...args: any[]) => void): void;

    handleOnce<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): void;
    handleOnce(event: never, listener: (...args: any[]) => void): void;

    removeHandler<E extends keyof On>(event: E, listener: Listener<On, E, this, Q>): void;
    removeHandler(event: never, listener: (...args: any[]) => void): void;
}

interface InvokeMethods<Emit> {
    invoke<E extends keyof Emit>(event: E, ...args: Args<Emit, E>): Promise<Emit>;
    invoke(event: never, ...args: any[]): Promise<Emit>;

}

/* ****************************************************************
 *  Strict types
 ******************************************************************/
export type StrictHandle<
    On extends Base<On>
> =
    & Evented<On>
    & HandleMethods<IpcMainInvokeEvent, On>;

export type StrictInvoke<
    Emit extends Base<Emit>,
> =
    & Evented<Emit>
    & InvokeMethods<Emit>;