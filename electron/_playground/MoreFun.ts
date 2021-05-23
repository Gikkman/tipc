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
  

// A type which extracts from an interface all keys matching a certain type
type KeysMatchingType<T, Match> = ({[K in keyof T]: T[K] extends Match ? K : never})[keyof T];
type KeysNotMatchingType<T, Match> = ({[K in keyof T]: T[K] extends Match ? never : K})[keyof T];

type ExtractFunctions<T> = Pick<T, KeysMatchingType<T, Function>>;
type ExtractNotFunctions<T> = Pick<T, KeysMatchingType<T, Function>>;

type MixedFunctions = ExtractFunctions<Mixed>;
type MixedNotFunctions = ExtractNotFunctions<Mixed>;