import { TipcUntypedServer, Args, ExtractFunctions, Ret, TipcServer, Typings } from "./Types";

export class TipcNamespaceServer<T> implements TipcServer<T> {
    private server: TipcUntypedServer;
    private namespace: string;

    constructor(server: TipcUntypedServer, namespace: string){
        this.server = server;
        this.namespace = namespace;
    }

    addListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any) {
        return this.server.addListener(this.namespace, key, callback)
    }
    addOnceListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any) {
        return this.server.addOnceListener(this.namespace, key, callback)
    }
    send<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, ...args: V): void {
        return this.server.broadcast(this.namespace, key, ...args)
    }

    addHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (key: K, callback: (...params: P) => R | Promise<R>) {
        return this.server.addHandler(this.namespace, key, callback)
    }
    addOnceHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (key: K, callback: (...params: P) => R | Promise<R>) {
        return this.server.addOnceHandler(this.namespace, key, callback)
    }
}