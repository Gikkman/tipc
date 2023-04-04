import { TipcUntypedServer, Args, ExtractFunctions, Ret, TipcServer, Typings } from "./TipcTypes";

export class TipcNamespaceServerImpl<T> implements TipcServer<T> {
    private core: TipcUntypedServer;
    private namespace: string;

    constructor(server: TipcUntypedServer, namespace: string){
        this.core = server;
        this.namespace = namespace;
    }

    addListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any) {
        return this.core.addListener(this.namespace, key, callback)
    }
    addOnceListener<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, callback: (...params: V) => any) {
        return this.core.addOnceListener(this.namespace, key, callback)
    }
    send<
        K extends keyof T,
        V extends Typings<T,K>
    >(key: K, ...args: V): void {
        return this.core.broadcast(this.namespace, key, ...args)
    }

    addHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (key: K, callback: (...params: P) => R | Promise<R>) {
        return this.core.addHandler(this.namespace, key, callback)
    }
    addOnceHandler<
        K extends keyof ExtractFunctions<T>,
        R extends Ret<T,K>,
        P extends Args<T,K>,
    > (key: K, callback: (...params: P) => R | Promise<R>) {
        return this.core.addOnceHandler(this.namespace, key, callback)
    }

    getAddressInfo() {
        return this.core.getAddressInfo()
    }
}