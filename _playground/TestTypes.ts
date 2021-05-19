type SimpleExample = 1 | 2 | 'a';
type ConditionalExample<T> = T extends number ? T : never;
type T = ConditionalExample<SimpleExample>  // '1' | '2'

/////////////////////////////////////////////////////////////////////////////
// Filter out keys from TRecord which's value matches type of TMatch
type FilterAwayKeys<  
  TRecord,
  TMatch,
  K extends keyof TRecord = keyof TRecord
> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;

interface Ay {
    'a': number,
    'b': 2,
    3: '3'
}
type AMatch = FilterAwayKeys<Ay, number>;  // 'a' | 'b'

/////////////////////////////////////////////////////////////////////////////
// Exclude<T, R> is a built-in typescript type operator, which excludes from
// type T all elements that are in R
interface F {
    'a': () => void,
    'b': (a: string) => number,
    'c': string,
}
type FMatch = FilterAwayKeys<F, Function>; // 'a' | 'b'
type FInverse = Exclude<keyof F, FMatch> // 'c'

/////////////////////////////////////////////////////////////////////////////
// Shorthand for making FInverse by creating FMatch and then exluding from it
type NotMatchingKeys<  
  TRecord,
  TMatch,
  Matches = FilterAwayKeys<TRecord, TMatch>
> = Exclude<keyof TRecord, Matches>
type AlsoFInverse = NotMatchingKeys<F, Function> // 'c'

/////////////////////////////////////////////////////////////////////////////
// Extracts all keys if all TRecord's values match TMatch
type AllOrNever<
  TRecord,
  TMatch,
  K extends keyof TRecord = keyof TRecord
> = TRecord[K] extends TMatch ? K : never;

type F_IsNever = AllOrNever<F, Function>;
type A_IsAll = AllOrNever<Ay, string|number>;

/////////////////////////////////////////////////////////////////////////////
// Pick<T, K> is a built-in typescript type operator which extracts from T
// all types identified by key-subset K.
//
// The below implementation Picker is the same as Pick (shown as example).
// The operator 'in' lets us iterate over K
type Picker<T, K extends keyof T> = {
    [P in K]: T[P];
}

type F_a = Pick<F,'a'>;

/////////////////////////////////////////////////////////////////////////////
// We can combine Pick and AllOrNever to create a type which extracts the 
// entire type, or nothing, from another type
type FullInterfaceOrNothing<
  TRecord,
  TMatch,
  Matches extends keyof TRecord = AllOrNever<TRecord, TMatch>
> = Pick<TRecord, Matches>

type F_isNone = FullInterfaceOrNothing<F, Function>;
type A_isFull = FullInterfaceOrNothing<Ay, string|number>;

/////////////////////////////////////////////////////////////////////////////
// We can now make a type which reduces a type to never if it's values doesn't
// match the predicate type TMatch
type EmptyObject = { [K in any] : never }
type FullInterfaceOrNever<
  TRecord,
  TMatch
> = FullInterfaceOrNothing<TRecord, TMatch> extends EmptyObject ? never : TRecord;

type F_isNever = FullInterfaceOrNever<F, Function>;
type A_isItself = FullInterfaceOrNever<Ay, string|number>;

/////////////////////////////////////////////////////////////////////////////
// Using this knowledge, we can create a predicate type which will return a
// generic object or never, depending on whether TRecord matches TMatch or not
type Predicate<
    TRecord,
    TMatch
> = FullInterfaceOrNothing<TRecord, TMatch> extends EmptyObject ? never : {};

/////////////////////////////////////////////////////////////////////////////
// And we can use this predicate to limit what types can be used as generics
// in TheClass
class TheClass<I extends Predicate<I, string|number>> {
    theFunction<K extends keyof I, V extends I[K]>(val: K): V {
        // This return is just for example to make it compile
        return '' as any; 
    }
}

const A_asClass = new TheClass<Ay>();
const theA = A_asClass.theFunction('a');
const theB = A_asClass.theFunction('b');
const the3 = A_asClass.theFunction(3);
// const theC = A_asClass.theFunction('c'); // Error. 'c' is not a key in A

// const F_asClass = new TheClass<F>(); // Error. Interface F does not meet the predicate of TheClass