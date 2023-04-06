import { TipcUntypedClient, Args, ExtractFunctions, Ret, TipcNamespaceClient, Typings } from "./TipcTypes";

export class TipcNamespaceClientImpl<T> implements TipcNamespaceClient<T> {
    private core: TipcUntypedClient;
    private namespace: string;

    constructor(client: TipcUntypedClient, namespace: string) {
        this.core = client;
        this.namespace = namespace;
    }

    addListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.core.addListener(this.namespace, topic, callback)
    }
    addOnceListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.core.addOnceListener(this.namespace, topic, callback)
    }
    send<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, ...args: V): void {
        this.core.send(this.namespace, topic, ...args)
    }

    invoke<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    >(topic: K, ...args: P): Promise<R> {
        return this.core.invoke(this.namespace, topic, ...args)
    }
}