type NoFunctions<M> = { 
    [P in keyof M]: M[P] extends Function ? never : M[P]
};

type OnlyFunctions<M> = { 
    [P in keyof M]: M[P] extends (...args: infer A) => infer R ? (...args: A) => R : never
};

type Funcify<M> = {
    [P in keyof M]: M[P] extends Function ? M[P]: (arg: M[P]) => void
};
type Args<M, E extends keyof M> = M[E] extends (...args: infer A) => void ? A : never;
type Typings<M, K extends keyof M, F extends Funcify<M> = Funcify<M>> = Args<F, K>;

interface A {
  'a': 1
  'b': void
}

type Af = Funcify<A>;
type Aa = Typings<A, 'a'>

interface F {
  'f': (a: string, b: number) => {}
  'g': (c: 2, d: "d") => number
}

interface M {
    'a': number
    'f': () => {}
  }

type A1 = NoFunctions<A>;   // Empty object
type A2 = OnlyFunctions<A>; // Never
type F1 = NoFunctions<F>;   // Never
type F2 = OnlyFunctions<F>; // Empty object
type M1 = NoFunctions<M>;   // Never
type M2 = OnlyFunctions<M>; // Never

interface f1<T extends NoFunctions<T>>{
    f<K extends keyof T>(name: K, value: T[K] ): void,
}

interface f2<T extends OnlyFunctions<T>>{
    f<K extends keyof T, R extends ReturnType<T[K]>>(name: K, value: R ): void,
}

class c implements f2<F> {
    f<K extends keyof F, R extends ReturnType<F[K]>>(name: K, value: R): void {
        throw new Error("Method not implemented.");
    }
}
const cc = new c();
cc.f('f', {} )