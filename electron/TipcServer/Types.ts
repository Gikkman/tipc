export type Callback = (...args: any[]) => any;
export type WrappedCallback = {multiUse: boolean, callback: Callback}
export type Key = string;

export type TipcSubscription = {
    unsubscribe: () => void,
};


type TipcMessageBase = {
    namespace: string,
    key: string,
    data: any[]
};
export type TipcInvokeObject = {
    method: "invoke",
    messageId: string,
} & TipcMessageBase;
export type TipcSendObject = {
    method: "send",
} & TipcMessageBase;
export type TipcErrorObject = {
    method: "error",
} & TipcMessageBase;
export type TipcMessageObject = TipcSendObject | TipcInvokeObject | TipcErrorObject;

export type TipcServer = {
    broadcast(namespace: string, key: string, ...args: any[]): void,
    
    addListener(namespace: string, key: string, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, key: string, callback: Callback): TipcSubscription,
    
    addHandler(namespace: string, key: string, callback: Callback): TipcSubscription,
    addOnceHandler(namespace: string, key: string, callback: Callback): TipcSubscription,
}
export type TipcClient = {
    send(namespace: string, key: string, ...args: any[]): void,
    broadcast(namespace: string, key: string, ...args: any[]): void,
    invoke(namespace: string, key: string, ...args: any[]): Promise<any>,
    
    addListener(namespace: string, key: string, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, key: string, callback: Callback): TipcSubscription,
}