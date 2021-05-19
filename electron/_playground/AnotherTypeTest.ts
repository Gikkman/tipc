import { Predicate, NoFunctions } from "../bus/InternalTypings";

type keysOfAny = keyof any;

type someUnion = 'a' | 2 | symbol;
type keysOfUnion = keyof someUnion;

type stringExtractor<T> = T extends string ? T : never;
type justA = stringExtractor<someUnion>;

interface I {
    a: 1,
    b: 2,
    3: 3,
    A: 4,
}
type fi = NoFunctions<I>
type ii = Predicate<I, NoFunctions<I>>