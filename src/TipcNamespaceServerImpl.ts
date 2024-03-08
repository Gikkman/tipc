import { Args, ExtractFunctions, Ret, TipcNamespaceServer, Typings, Callback, TipcAddressInfo, TipcSubscription, Topic } from "./TipcTypes";

export class TipcNamespaceServerImpl<T> implements TipcNamespaceServer<T> {
    private core: TipcUntypedServer;
    private namespace: string;

    constructor(server: TipcUntypedServer, namespace: string){
        this.core = server;
        this.namespace = namespace;
    }

    addListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.core.addListener(this.namespace, topic, callback);
    }
    addOnceListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.core.addOnceListener(this.namespace, topic, callback);
    }
    send<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, ...args: V): void {
        return this.core.broadcast(this.namespace, topic, ...args);
    }

    addHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (topic: K, callback: (...params: P) => R | Promise<R>) {
        return this.core.addHandler(this.namespace, topic, callback);
    }
    addOnceHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (topic: K, callback: (...params: P) => R | Promise<R>) {
        return this.core.addOnceHandler(this.namespace, topic, callback);
    }

    getAddressInfo() {
        return this.core.getAddressInfo();
    }
}

export type TipcUntypedServer = {
    broadcast(namespace: string, topic: Topic, ...args: any[]): void,

    addListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    addOnceListener(namespace: string, topic: Topic, callback: Callback): TipcSubscription,

    addHandler(namespace: string, topic: Topic, callback: Callback): TipcSubscription,
    addOnceHandler(namespace: string, topic: Topic, callback: Callback): TipcSubscription,

    getAddressInfo(): TipcAddressInfo|undefined
}
