/* 
Most types here are intended to modify or extract type data from an interface
*/
interface Mixed {
  'a': number,
  'b': string,
  'f': (a: number) => string,
  'g': (a: string) => number,
  'v': void
}

interface Func {
  'f': (a: number) => void,
  'g': (a: string) => number,
}

interface Prim {
  'a': number,
  'b': string,
  'v': void
}

///////////////////////////////////////////////////////////////////////////////////////////////
// Interface predicates
// When you want only put restrictions on what interfaces can be passed 
///////////////////////////////////////////////////////////////////////////////////////////////

// A type which sets all function valus of an interface to never
type NoFunctions<T> = { 
  [K in keyof T]: T[K] extends Function ? never : T[K]
};
type noFunc = NoFunctions<Mixed>;

// A type which sets all non-function valus of an interface to never
type OnlyFunctions<T> = { 
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R : never
};
type onlyFunc = OnlyFunctions<Mixed>;

interface RequireFunctionInterface<T extends OnlyFunctions<T>> {
  someFunction<K extends keyof T>(key: K, ...value: Parameters<T[K]>): void;
}
type requireFunctionInterfaceImpl1 = RequireFunctionInterface<Func>;  
type requireFunctionInterfaceImpl2 = RequireFunctionInterface<Mixed>;  // <--- Error, parts of interface doesn't map to functions

interface RequirePrimitiveInterface<T extends NoFunctions<T>> {
  someFunction<K extends keyof T>(key: K, value?: T[K]): void;
}
type requirePrimitiveInterfaceImpl1 = RequirePrimitiveInterface<Prim>;  
type requirePrimitiveInterfaceImpl2 = RequirePrimitiveInterface<Mixed>;  // <--- Error, parts of interface doesn't map to functions

///////////////////////////////////////////////////////////////////////////////////////////////
// Interface extraction
// When you want only certain parts of an interface
///////////////////////////////////////////////////////////////////////////////////////////////

// A type which extracts from an interface all keys matching a certain type
type KeysMatchingType<T, Match> = ({[K in keyof T]: T[K] extends Match ? K : never})[keyof T];
type keys = KeysMatchingType<Mixed, number|string>;

// We can use the built-in type Pick<T,U> to extract the full entries that matches certain types
type EntiresMatchingType<T, Match> = Pick<T, KeysMatchingType<T, Match>>;
type entires = EntiresMatchingType<Mixed, number|string>;

// The above can also be done with Key Remapping in Mapped Types (TS 4.1+)
type RemappingKeysMatchingType<T, Match> = { [P in keyof T as T[P] extends Match ? P : never]: T[P] };
type remappingKeys = RemappingKeysMatchingType<Mixed, Function>;

// We can apply some of this knowledge in an example, to make an interface which has a function
// that'll extract whatever functions are availible in its property set, and only accept those
interface ExtractFunctionsInterface<T> {
  someFunctions<
    V extends ReturnType<T[K]>, 
    K extends KeysMatchingType<T, Function>
  >(key: K, val: V): void;
}

const ExtractedMixedImpl: ExtractFunctionsInterface<Mixed> = {
  someFunctions<
    V extends ReturnType<Mixed[K]>, 
    K extends KeysMatchingType<Mixed, Function>
  >(key: K, val: V) { }
};
ExtractedMixedImpl.someFunctions("g", 3); // <-- Check what values this method accepts

const ExtractedPrimImpl: ExtractFunctionsInterface<Prim> = {
  someFunctions<
    V extends ReturnType<Prim[K]>, 
    K extends KeysMatchingType<Prim, Function>
  >(key: K, val:V) { }
};
ExtractedPrimImpl.someFunctions() // <-- This method can't be called since Prim has no function properties

///////////////////////////////////////////////////////////////////////////////////////////////
// Interface manipulation
// When you want manipulate parts of an interface
///////////////////////////////////////////////////////////////////////////////////////////////

// A type which extracts the types from a functions arguments
type Args<T, K extends keyof T> = T[K] extends (...args: infer A) => any ? A : never;
type arg = Args<Mixed, 'f'>;
  
// A type which turns non-function valus of an interface to functions
type Funcify<T> = {
  [K in keyof T]: T[K] extends Function ? T[K]: (arg: T[K]) => void
};
type funcified = Funcify<Mixed>;