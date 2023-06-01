import { TipcNodeServer } from "../src/TipcNodeServer"
import { sleep } from "./Helper.test";

type AnyInterface = Record<string, any>

function basicServer() {
    return TipcNodeServer.create({address:"localhost", port:0, loggerOptions: {logLevel: "OFF"}});
}

describe("Test TipcNodeServer.addListener()", () => {
    it("will call server-side event listener in same namespace", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        server.addListener("server-side-without-args", () => counter++)
        
        server.send("server-side-without-args")
        await sleep(5)
        expect(counter).toBe(1)
    })
    
    it("will not call server-side event listener in different namespace", async () => {
        const core = await basicServer().connect()
        const namespaceA = core.forContractAndNamespace<AnyInterface>("nsA")
        const namespaceB = core.forContractAndNamespace<AnyInterface>("nsB")
        let counter = 0;
        namespaceA.addListener("server-side-namespaces", () => counter++)
        
        namespaceB.send("server-side-namespaces")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will call server-side event listener in same namespace and forward arguments", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        server.addListener("server-side-with-args", (numA: number, numB: number) => counter+=(numA*numB))
        
        server.send("server-side-with-args", 5, 2)
        await sleep(5)
        expect(counter).toBe(10)
        
        server.send("server-side-with-args", 3, 3)
        await sleep(5)
        expect(counter).toBe(19)
    })

    it("will call several server-side event listeners in the same namespace that listen to the same key", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        const server2 = core.forContractAndNamespace<AnyInterface>("ns2")
        let counterA = 0, counterB = 0, counterC = 0;
        server.addListener("server-side-multiple-listeners", () => counterA++)
        server.addListener("server-side-multiple-listeners", () => counterB+=2)
        server2.addListener("server-side-multiple-listeners", () => counterC=10)

        server.send("server-side-multiple-listeners")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
        expect(counterC).toBe(0)
    })
})

describe("Test TipcNodeServer.addOnceListener()", () => {
    it("will only call a once-listener once", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        server.addOnceListener("once-listener", () => counter++)

        server.send("once-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        server.send("once-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will only call a once-listener once, but keep regular listeners", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counterA = 0, counterB = 0;
        server.addOnceListener("both-listener", () => counterA++)
        server.addListener("both-listener", () => counterB++)

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

describe("Test TipcNodeServer's unsubscribing from listeners and once-listeners", () => {
    it("will unsubscribe a regular listener", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        const handle = server.addListener("remove-listener", () => counter++)

        server.send("remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        handle.unsubscribe()
        server.send("remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will unsubscribe once-listener before it was called", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        const handle = server.addOnceListener("remove-once-listener", () => counter++)
        
        handle.unsubscribe()
        server.send("remove-once-listener")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will accept unsubscribing an already unsubscribed listener", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        const handle = server.addListener("remove-listener", () => counter++)
        handle.unsubscribe()
        handle.unsubscribe()
    })

    it("will accept unsubscribe to once-listener after it was called", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        let counter = 0;
        const handle = server.addOnceListener("remove-once-listener-post-call", () => counter++)
        
        server.send("remove-once-listener-post-call")
        await sleep(5)
        expect(counter).toBe(1)

        handle.unsubscribe()
    })
})

describe("Test TipcNodeServer.addHandler", () => {
    it("will reject adding a handler to a namespace+key already added", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        const cb = () => {}
        server.addHandler("reject-handler", cb)
        expect(() => server.addHandler("reject-handler", cb)).toThrow()
    })

    it("will reject adding a once-handler to a namespace+key already added", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        const cb = () => {}
        server.addHandler("reject-handler", cb)
        expect(() => server.addOnceHandler("reject-handler", cb)).toThrow()
    })

    it("will reject adding a handler to a namespace+key already added (once-handler)", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        const cb = () => {}
        server.addOnceHandler("reject-handler", cb)
        expect(() => server.addHandler("reject-handler", cb)).toThrow()
    })

    it("will reject adding a once-handler to a namespace+key already added (once-handler)", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        const cb = () => {}
        server.addOnceHandler("reject-handler", cb)
        expect(() => server.addHandler("reject-handler", cb)).toThrow()
    })
})

describe("Test TipcNodeServer.getAddressInfo", () => {
    it("will return 'undefined' if not connected to a websocket", async () => {
        const core = await basicServer().connect()
        await core.shutdown()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        expect(server.getAddressInfo()).toBeUndefined()
    })

    it("will return something if connected to a websocket", async () => {
        const core = await basicServer().connect()
        const server = core.forContractAndNamespace<AnyInterface>("ns")
        expect(server.getAddressInfo()).toBeTruthy()
    })
})

describe("Test TipcNodeServer.forNamespaceAndContract", () => {
    it("will warn if reusing namespace", async () => {
        let calledSignal = false;
        const testLogger = (a: any) => {if(a.includes("already in use")) calledSignal = true;}
        const voidLogger = (a: any) => {}
        
        const server = TipcNodeServer.create({address:"localhost", port:0, loggerOptions: {logLevel: "DEBUG", warn: testLogger, error: voidLogger, info: voidLogger, debug: voidLogger}});
        const core = await server.connect();
        core.forContractAndNamespace<AnyInterface>("test");
        core.forContractAndNamespace<AnyInterface>("test");
        expect(calledSignal).toBeTrue();

        await core.shutdown()
    })
})