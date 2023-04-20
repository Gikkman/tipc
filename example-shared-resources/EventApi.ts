export interface Operations {
    'sendVoid': void,
    'sendArray': [number, number, number],
    'sendObject': {keyA: number, keyB: string},
    'sendString': string,
    'shuffle': (...arg: number[]) => number[]
    'combine': (prefix: string, suffix: string, body: string) => {result: string}
}

export interface OtherOperations {
    'sendNumber': number,
    'double': (arg: number) => number,
}