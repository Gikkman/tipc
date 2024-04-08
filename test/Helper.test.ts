import { TipcNodeClient } from "../src/TipcNodeClient";
import { TipcNodeServer } from "../src/TipcNodeServer";
import { Callback, TipcClient, TipcClientOptions, TipcConnectionDetails, TipcNamespaceClient, TipcNamespaceServer, TipcServer } from "../src/TipcTypes";
import { TipcServerOptions } from "../src/TipcTypesNodeOnly";

export async function sleep(ms: number) {
    return new Promise<void>(r => {
        setTimeout(() => {
            r();
        }, ms);
    });
}



export type AnyInterface = Record<string,any>
export type CallbackInterface = Record<string,Callback>

let m_server_core: TipcServer|undefined;
let m_client_core: TipcClient|undefined;
let m_server: TipcNamespaceServer<unknown>|undefined;
let m_clientA: TipcNamespaceClient<unknown>|undefined;
let m_clientB: TipcNamespaceClient<unknown>|undefined;

export function getTestServerCore() {
    return m_server_core;
}

export const setupServerClient = async <T>(namespaceServer= "default",
    namespaceClientA = "default",
    namespaceClientB = "default",
    extraServerOptions: Partial<TipcServerOptions> = {},
    extraClientOptions: Partial<TipcClientOptions&TipcConnectionDetails> = {},
): Promise<[TipcNamespaceServer<T>, TipcNamespaceClient<T>, TipcNamespaceClient<T>]> => {
    m_server_core = await TipcNodeServer.create({
        host:"localhost", port: 0, loggerOptions: {logLevel: "OFF"}, ...extraServerOptions,
    }).connect();
    m_server = m_server_core.forContractAndNamespace<T | AnyInterface>(namespaceServer);

    const address = m_server_core.getAddressInfo();
    if(!address) {
        throw "Address undefined";
    }

    m_client_core = await TipcNodeClient.create({
        host: "localhost", port: address.port, loggerOptions: {logLevel: "OFF"}, ...extraClientOptions,
    }).connect();
    m_clientA = m_client_core.forContractAndNamespace<T | AnyInterface>(namespaceClientA);
    m_clientB = m_client_core.forContractAndNamespace<T | AnyInterface>(namespaceClientB);
    return [m_server, m_clientA, m_clientB];
};

afterEach(async () => {
    await m_server_core?.shutdown();
    await m_client_core?.shutdown();
    m_server_core = undefined;
    m_client_core = undefined;
    m_server = undefined;
    m_clientA = undefined;
    m_clientB = undefined;
}, 10);
