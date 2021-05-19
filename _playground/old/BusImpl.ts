interface api {
    'a': (q: number, v: string) => string,
    'b': (s: string) => number,
    'c': () => void,
};

interface api2 {
    'a': string,
    'b': number,
    'c':void,
};

type KeyTypeInterface<I> = { [P in Extract<keyof I, string | symbol>]: (...args: any[]) => any };
type a1 = KeyTypeInterface<api>;
type a2 = KeyTypeInterface<api2>;


declare const meta: unique symbol;
type Args<M, E extends keyof M> = M[E] extends (...args: infer A) => void ? A : never;
type Evented<On, Emit = On> = { [meta]?: [On, Emit] }
type OnlyFunctions<M> = { [P in Extract<keyof M, string | symbol>]: (...args: any[]) => any };

interface Sender<API extends OnlyFunctions<API>> {
    send<E extends keyof API, R extends API[E]>(event: E, ...args: Args<API, E>): ReturnType<R>;
}

class SenderImpl implements Sender<api> {
    send<E extends keyof api, R extends api[E]>(event: E, ...args: Args<api, E>): ReturnType<R> {
        return "fun" as any;
    }
}

const s = new SenderImpl();
const a = s.send("a", 1, "hej");
const b = s.send("b", "hej");
const c = s.send("c");