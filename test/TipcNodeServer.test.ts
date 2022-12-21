import { TipcNodeServer } from "../electron/TipcServer/TipcNodeServer"
import { sleep } from "./Helper.test";

describe("Test TipcNodeServer.addListener()", () => {
    it("will call server-side event listener in same namespace", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        server.addListener("ns", "server-side-without-args", () => counter++)
        
        server.broadcast("ns", "server-side-without-args")
        await sleep(5)
        expect(counter).toBe(1)
    })
    
    it("will not call server-side event listener in different namespace", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        server.addListener("nsA", "server-side-namespaces", () => counter++)
        
        server.broadcast("nsB", "server-side-namespaces")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will call server-side event listener in same namespace and forward arguments", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        server.addListener("ns", "server-side-with-args", (numA: number, numB: number) => counter+=(numA*numB))
        
        server.broadcast("ns", "server-side-with-args", 5, 2)
        await sleep(5)
        expect(counter).toBe(10)
        
        server.broadcast("ns", "server-side-with-args", 3, 3)
        await sleep(5)
        expect(counter).toBe(19)
    })

    it("will call several server-side event listeners in the same namespace that listen to the same key", async () => {
        const server = await TipcNodeServer.create();
        let counterA = 0, counterB = 0, counterC = 0;
        server.addListener("ns", "server-side-multiple-listeners", () => counterA++)
        server.addListener("ns", "server-side-multiple-listeners", () => counterB+=2)
        server.addListener("ns2", "server-side-multiple-listeners", () => counterC=10)

        server.broadcast("ns", "server-side-multiple-listeners")
        await sleep(5)
        expect(counterA).toBe(1)
        expect(counterB).toBe(2)
        expect(counterC).toBe(0)
    })
})

describe("Test TipcNodeServer.addOnceListener()", () => {
    it("will only call a once-listener once", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        server.addOnceListener("ns", "once-listener", () => counter++)

        server.broadcast("ns", "once-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        server.broadcast("ns", "once-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will only call a once-listener once, but keep regular listeners", async () => {
        const server = await TipcNodeServer.create();
        let counterA = 0, counterB = 0;
        server.addOnceListener("ns", "both-listener", () => counterA++)
        server.addListener("ns", "both-listener", () => counterB++)

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

describe("Test TipcNodeServer's unsubscribing from listeners and once-listeners", () => {
    it("will unsubscribe a regular listener", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        const handle = server.addListener("ns", "remove-listener", () => counter++)

        server.broadcast("ns", "remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
        
        handle.unsubscribe()
        server.broadcast("ns", "remove-listener")
        await sleep(5)
        expect(counter).toBe(1)
    })

    it("will unsubscribe once-listener before it was called", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        const handle = server.addOnceListener("ns", "remove-once-listener", () => counter++)
        
        handle.unsubscribe()
        server.broadcast("ns", "remove-once-listener")
        await sleep(5)
        expect(counter).toBe(0)
    })

    it("will accept unsubscribing an already unsubscribed listener", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        const handle = server.addListener("ns", "remove-listener", () => counter++)
        handle.unsubscribe()
        handle.unsubscribe()
    })

    it("will accept unsubscribe to once-listener after it was called", async () => {
        const server = await TipcNodeServer.create();
        let counter = 0;
        const handle = server.addOnceListener("ns", "remove-once-listener-post-call", () => counter++)
        
        server.broadcast("ns", "remove-once-listener-post-call")
        await sleep(5)
        expect(counter).toBe(1)

        handle.unsubscribe()
    })
})

describe("Test TipcNodeServer.addHandler", () => {
    it("will reject adding a handler to a namespace+key already added", async () => {
        const server = await TipcNodeServer.create();
        const cb = () => {}
        server.addHandler("ns", "reject-handler", cb)
        expect(() => server.addHandler("ns", "reject-handler", cb)).toThrow()
    })

    it("will reject adding a once-handler to a namespace+key already added", async () => {
        const server = await TipcNodeServer.create();
        const cb = () => {}
        server.addHandler("ns", "reject-handler", cb)
        expect(() => server.addOnceHandler("ns", "reject-handler", cb)).toThrow()
    })

    it("will reject adding a handler to a namespace+key already added (once-handler)", async () => {
        const server = await TipcNodeServer.create();
        const cb = () => {}
        server.addOnceHandler("ns", "reject-handler", cb)
        expect(() => server.addHandler("ns", "reject-handler", cb)).toThrow()
    })

    it("will reject adding a once-handler to a namespace+key already added (once-handler)", async () => {
        const server = await TipcNodeServer.create();
        const cb = () => {}
        server.addOnceHandler("ns", "reject-handler", cb)
        expect(() => server.addHandler("ns", "reject-handler", cb)).toThrow()
    })
})

describe("Test TipcNodeServer.getAddressInfo", () => {
    it("will return 'undefined' if not connected to a websocket", async () => {
        const server = await TipcNodeServer.create();
        expect(server.getAddressInfo()).toBeUndefined()
    })

    it("will return something if connected to a websocket", async () => {
        const server = await TipcNodeServer.create({host:'localhost', port: 0});
        expect(server.getAddressInfo()).toBeTruthy()
    })
})