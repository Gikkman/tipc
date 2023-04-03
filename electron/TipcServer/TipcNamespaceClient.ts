import { TipcUntypedClient, Args, ExtractFunctions, Ret, TipcClient, Typings } from "./Types";

export class TipcNamespaceClient<T> implements TipcClient<T> {
    private client: TipcUntypedClient;
    private namespace: string;

    constructor(client: TipcUntypedClient, namespace: string) {
        this.client = client;
        this.namespace = namespace;
    }

    addListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.client.addListener(this.namespace, topic, callback)
    }
    addOnceListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, callback: (...params: V) => any) {
        return this.client.addOnceListener(this.namespace, topic, callback)
    }
    send<
        K extends keyof T,
        V extends Typings<T,K>
    >(topic: K, ...args: V): void {
        this.client.send(this.namespace, topic, ...args)
    }

    invoke<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    >(topic: K, ...args: P): Promise<R> {
        return this.client.invoke(this.namespace, topic, ...args)
    }
}