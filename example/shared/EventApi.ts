export interface A{
    'a': {data: 1, sender: string};
    'c': {data: number, sender: string};
    'd': void;
    'F': (data: 1, sender: string) => number;
    'G': (data: 2, sender: string) => number;
    'I': () => string;
}

export interface B{
    'b': {data: 2, sender: string};
    'H': (data: [number, number, number]) => number;
}

export interface C{
    'a': 'b'
}