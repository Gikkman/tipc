import { TipcNodeServer } from "../src/TipcNodeServer"
import { TipcNodeClient } from "../src/TipcNodeClient"
import { sleep } from "./Helper.test";
import { Callback, TipcClient, TipcNamespaceClient, TipcServer, TipcNamespaceServer } from "../src/TipcTypes";

type AnyInterface = Record<string,any>
type CallbackInterface = Record<string,Callback>

let m_server_core: TipcServer|undefined;
let m_client_core: TipcClient|undefined;
let m_server: TipcNamespaceServer<unknown>|undefined;
let m_clientA: TipcNamespaceClient<unknown>|undefined; 
let m_clientB: TipcNamespaceClient<unknown>|undefined;

const setupServerClient = async <T>(namespaceServer= "default", 
                                 namespaceClientA = "default", 
                                 namespaceClientB = "default"
    ): Promise<[TipcNamespaceServer<T>, TipcNamespaceClient<T>, TipcNamespaceClient<T>]> => {
    m_server_core = await TipcNodeServer.create({address:"localhost", port: 0, loggerOptions: {logLevel: "OFF"}}).connect()
    m_server = m_server_core.forContractAndNamespace<T | AnyInterface>(namespaceServer)

    const address = m_server_core.getAddressInfo();
    if(!address) { throw "Address undefined" }

    m_client_core = await TipcNodeClient.create({address: "localhost", port: address.port, loggerOptions: {logLevel: "OFF"}}).connect()
    m_clientA = m_client_core.forContractAndNamespace<T | AnyInterface>(namespaceClientA);
    m_clientB = m_client_core.forContractAndNamespace<T | AnyInterface>(namespaceClientB);
    return [m_server, m_clientA, m_clientB]
}

afterEach(async () => {
    await m_server_core?.shutdown();
    await m_client_core?.shutdown();
    m_server_core = undefined;
    m_client_core = undefined;
    m_server = undefined;
    m_clientA = undefined;
    m_clientB = undefined;
}, 10)

describe("Test TipcNodeClient.addListener()", () => {
    it("will call client-side event listener in same namespace", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        
        client.addListener("client-side-without-args", () => counter++)
        server.send("client-side-without-args")
        
        await sleep(5)
        expect(counter).toBe(1)
    })
    
    it("will not call client-side event listener in different namespace", async () => {
        const [server, client] = await setupServerClient<AnyInterface>("nsA", "nsB");
        let counter = 0;
        
        client.addListener("client-side-namespaces", () => counter++)
        server.send("client-side-namespaces")
        
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will call client-side event listener in same namespace and forward arguments", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        client.addListener("client-side-with-args", (numA: number, numB: number) => counter+=(numA*numB))
        
        server.send("client-side-with-args", 5, 2)
        await sleep(5)
        expect(counter).toBe(10)
        
        server.send("client-side-with-args", 3, 3)
        await sleep(5)
        expect(counter).toBe(19)
    })

    it("will call several client-side event listeners in the same namespace that listen to the same key", async () => {
        const [server, clientA, clientB] = await setupServerClient<AnyInterface>("ns", "ns", "ns2");
        let counterA = 0, counterB = 0, counterC = 0;
        clientA.addListener("client-side-multiple-listeners", () => counterA++)
        clientA.addListener("client-side-multiple-listeners", () => counterB+=2)
        clientB.addListener("client-side-multiple-listeners", () => counterC=10)

        server.send("client-side-multiple-listeners")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
        expect(counterC).toBe(0)
    })

    it("will call multiple client-side event listeners", async () => {
        const [server, clientA, clientB] = await setupServerClient<AnyInterface>();
        let counterA = 0, counterB = 0;
        clientA.addListener("multiple-clients", () => counterA+=1)
        clientB.addListener("multiple-clients", () => counterB+=2)

        server.send("multiple-clients")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)

        server.send("multiple-clients")
        await sleep(5)
        expect(counterA).toBe(2)
        expect(counterB).toBe(4)
    })
})

describe("Test TipcNodeClient.addOnceListener()", () => {
    it("will only call a once-listener once", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        client.addOnceListener("once-listener", () => counter++)

        server.send("once-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        server.send("once-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will only call a once-listener once, but keep regular listeners", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counterA = 0, counterB = 0;
        client.addOnceListener("both-listener", () => counterA++)
        client.addListener("both-listener", () => counterB++)

        server.send("both-listener")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(1)
        
        server.send("both-listener")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
    })
})

describe("Test TipcNodeClient's unsubscribing from listeners and once-listeners", () => {
    it("will unsubscribe a regular listener", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        const handle = client.addListener("remove-listener", () => counter++)

        server.send("remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        handle.unsubscribe()
        server.send("remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will unsubscribe once-listener before it was called", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        const handle = client.addOnceListener("remove-once-listener", () => counter++)
        
        handle.unsubscribe()
        server.send("remove-once-listener")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will accept unsubscribing an already unsubscribed listener", async () => {
        const [_, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        const handle = client.addListener("remove-listener", () => counter++)
        handle.unsubscribe()
        handle.unsubscribe()
    })

    it("will accept unsubscribe to once-listener after it was called", async () => {
        const [server, client] = await setupServerClient<AnyInterface>();
        let counter = 0;
        const handle = client.addOnceListener("remove-once-listener-post-call", () => counter++)
        
        server.send("remove-once-listener-post-call")
        await sleep(5)
        expect(counter).toBe(1)

        handle.unsubscribe()
    })
})

describe("Test TipcNodeClient.invoke", () => {
    it("will call invoke handler and return response", async () => {
        const [server, client] = await setupServerClient<CallbackInterface>();
        server.addHandler("invoke-handler", (num: number) => num + 1);
        
        const val1 = await client.invoke("invoke-handler", 1);
        expect(val1).toBe(2)
        
        const val2 = await client.invoke("invoke-handler", 5);
        expect(val2).toBe(6)
    })

    it("will call invoke handler and return object", async () => {
        const [server, client] = await setupServerClient<CallbackInterface>();
        server.addHandler("invoke-handler-obj", (n) => ({num: n}));
        
        const val1 = await client.invoke("invoke-handler-obj", 1);
        expect(val1.num).toBe(1)
        
        const val2 = await client.invoke("invoke-handler-obj", 5);
        expect(val2.num).toBe(5)
    })

    it("will call invoke handler and return array", async () => {
        const [server, client] = await setupServerClient<CallbackInterface>();
        server.addHandler("invoke-handler-arr", (n) => [n,n]);
        
        const val1 = await client.invoke("invoke-handler-arr", 1);
        expect(val1[0]).toBe(1)
        expect(val1[1]).toBe(1)
        
        const val2 = await client.invoke("invoke-handler-arr", 5);
        expect(val2[0]).toBe(5)
        expect(val2[1]).toBe(5)
    })
    
    it("will return error if no handler exists", async () => {
        const [_, client] = await setupServerClient<CallbackInterface>();
        try {
            await client.invoke("does-not-exist")
            fail("Above should reject")
        } catch (e) {
            expect(e).toBe("No handler defined for namespace default and key does-not-exist")
        }
    })

    it("will return error if server throws exception", async () => {
        const [server, client] = await setupServerClient<CallbackInterface>();
        server.addHandler("throw-exception", () => {
            throw "Exception occurred"
        })

        try {
            await client.invoke("throw-exception")
            fail("Above should reject")
        } catch (e) {
            expect(e).toContain("A server-side exception occurred")
        }
    })
})


describe("Test TipcNodeClient.forContractAndNamespace", () => {
    it("will warn if reusing namespace", async () => {
        let calledSignal = false;
        const testLogger = (a: any) => {if(a.includes("already in use")) calledSignal = true;}
        const voidLogger = (a: any) => {}

        const [server] = await setupServerClient<CallbackInterface>();
        const address = server.getAddressInfo();
        if(!address) throw "Server had no address";

        const client = TipcNodeClient.create({address: "localhost", port: address.port, loggerOptions: {logLevel: "DEBUG", warn: testLogger, error: voidLogger, info: voidLogger, debug: voidLogger}});
        const core = await client.connect();
        core.forContractAndNamespace<AnyInterface>("test");
        core.forContractAndNamespace<AnyInterface>("test");
        expect(calledSignal).toBeTrue();
        await core.shutdown();
    })
})