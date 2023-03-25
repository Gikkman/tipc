import { TipcNodeServer } from "../electron/TipcServer/TipcNodeServer"
import { TipcNodeClient } from "../electron/TipcServer/TipcNodeClient"
import { sleep } from "./Helper.test";

let m_server: TipcNodeServer|undefined;
let m_clientA: TipcNodeClient|undefined; 
let m_clientB: TipcNodeClient|undefined;

const setupServerClient = async (): Promise<[TipcNodeServer, TipcNodeClient, TipcNodeClient]> => {
    m_server = await TipcNodeServer.create({host:"localhost", port: 0});
    
    const address = m_server.getAddressInfo();
    if(address == undefined) { throw "Address undefined" }
    
    m_clientA = await TipcNodeClient.create(address);
    m_clientB = await TipcNodeClient.create(address);
    
    return [m_server, m_clientA, m_clientB]
}

afterEach(async () => {
    await m_server?.shutdown();
    await m_clientA?.shutdown();
    await m_clientB?.shutdown();
    m_server = undefined;
    m_clientA = undefined;
    m_clientB = undefined;
}, 10)

describe("Test TipcNodeClient.addListener()", () => {
    it("will call client-side event listener in same namespace", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        
        client.addListener("ns", "client-side-without-args", () => counter++)
        server.broadcast("ns", "client-side-without-args")
        
        await sleep(5)
        expect(counter).toBe(1)
    })
    
    it("will not call client-side event listener in different namespace", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        
        client.addListener("nsA", "client-side-namespaces", () => counter++)
        server.broadcast("nsB", "client-side-namespaces")
        
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will call client-side event listener in same namespace and forward arguments", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        client.addListener("ns", "client-side-with-args", (numA: number, numB: number) => counter+=(numA*numB))
        
        server.broadcast("ns", "client-side-with-args", 5, 2)
        await sleep(5)
        expect(counter).toBe(10)
        
        server.broadcast("ns", "client-side-with-args", 3, 3)
        await sleep(5)
        expect(counter).toBe(19)
    })

    it("will call several client-side event listeners in the same namespace that listen to the same key", async () => {
        const [server, client] = await setupServerClient();
        let counterA = 0, counterB = 0, counterC = 0;
        client.addListener("ns", "client-side-multiple-listeners", () => counterA++)
        client.addListener("ns", "client-side-multiple-listeners", () => counterB+=2)
        client.addListener("ns2", "client-side-multiple-listeners", () => counterC=10)

        server.broadcast("ns", "client-side-multiple-listeners")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
        expect(counterC).toBe(0)
    })

    it("will call multiple client-side event listeners", async () => {
        const [server, clientA, clientB] = await setupServerClient();
        let counterA = 0, counterB = 0;
        clientA.addListener("ns", "multiple-clients", () => counterA+=1)
        clientB.addListener("ns", "multiple-clients", () => counterB+=2)

        server.broadcast("ns", "multiple-clients")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)

        server.broadcast("ns", "multiple-clients")
        await sleep(5)
        expect(counterA).toBe(2)
        expect(counterB).toBe(4)
    })
})

describe("Test TipcNodeClient.addOnceListener()", () => {
    it("will only call a once-listener once", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        client.addOnceListener("ns", "once-listener", () => counter++)

        server.broadcast("ns", "once-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        server.broadcast("ns", "once-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will only call a once-listener once, but keep regular listeners", async () => {
        const [server, client] = await setupServerClient();
        let counterA = 0, counterB = 0;
        client.addOnceListener("ns", "both-listener", () => counterA++)
        client.addListener("ns", "both-listener", () => counterB++)

        server.broadcast("ns", "both-listener")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(1)
        
        server.broadcast("ns", "both-listener")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
    })
})

describe("Test TipcNodeClient's unsubscribing from listeners and once-listeners", () => {
    it("will unsubscribe a regular listener", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        const handle = client.addListener("ns", "remove-listener", () => counter++)

        server.broadcast("ns", "remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        handle.unsubscribe()
        server.broadcast("ns", "remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will unsubscribe once-listener before it was called", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        const handle = client.addOnceListener("ns", "remove-once-listener", () => counter++)
        
        handle.unsubscribe()
        server.broadcast("ns", "remove-once-listener")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will accept unsubscribing an already unsubscribed listener", async () => {
        const [_, client] = await setupServerClient();
        let counter = 0;
        const handle = client.addListener("ns", "remove-listener", () => counter++)
        handle.unsubscribe()
        handle.unsubscribe()
    })

    it("will accept unsubscribe to once-listener after it was called", async () => {
        const [server, client] = await setupServerClient();
        let counter = 0;
        const handle = client.addOnceListener("ns", "remove-once-listener-post-call", () => counter++)
        
        server.broadcast("ns", "remove-once-listener-post-call")
        await sleep(5)
        expect(counter).toBe(1)

        handle.unsubscribe()
    })
})

describe("Test TipcNodeClient.invoke", () => {
    it("will call invoke handler and return response", async () => {
        const [server, client] = await setupServerClient();
        server.addHandler("ns", "invoke-handler", (num) => num + 1);
        
        const val1 = await client.invoke("ns", "invoke-handler", 1);
        expect(val1).toBe(2)
        
        const val2 = await client.invoke("ns", "invoke-handler", 5);
        expect(val2).toBe(6)
    })

    it("will call invoke handler and return object", async () => {
        const [server, client] = await setupServerClient();
        server.addHandler("ns", "invoke-handler-obj", (n) => ({num: n}));
        
        const val1 = await client.invoke("ns", "invoke-handler-obj", 1);
        expect(val1.num).toBe(1)
        
        const val2 = await client.invoke("ns", "invoke-handler-obj", 5);
        expect(val2.num).toBe(5)
    })

    it("will call invoke handler and return array", async () => {
        const [server, client] = await setupServerClient();
        server.addHandler("ns", "invoke-handler-arr", (n) => [n,n]);
        
        const val1 = await client.invoke("ns", "invoke-handler-arr", 1);
        expect(val1[0]).toBe(1)
        expect(val1[1]).toBe(1)
        
        const val2 = await client.invoke("ns", "invoke-handler-arr", 5);
        expect(val2[0]).toBe(5)
        expect(val2[1]).toBe(5)
    })
    
    it("will return error if no handler exists", async () => {
        const [_, client] = await setupServerClient();
        try {
            await client.invoke("ns", "does-not-exist")
            fail("Above should reject")
        } catch (e) {
            expect(e).toBe("No handler defined for namespace ns and key does-not-exist")
        }
        expect(client['sendListeners'].size).toBe(0)
    })

    it("will return error if server throws exception", async () => {
        const [server, client] = await setupServerClient();
        server.addHandler("ns", "throw-exception", () => {
            throw "Exception occurred"
        })

        try {
            await client.invoke("ns", "throw-exception")
            fail("Above should reject")
        } catch (e) {
            expect(e).toContain("A server-side exception occurred")
        }
        expect(client['sendListeners'].size).toBe(0)
    })
})