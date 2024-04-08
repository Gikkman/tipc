import { createServer } from "http";
import { TipcLoggerOptions } from "../src/TipcLogger";
import { TipcNodeClient } from "../src/TipcNodeClient";
import { TipcNodeServer } from "../src/TipcNodeServer";
import { TipcClient, TipcServer } from "../src/TipcTypes";
import { setupServerClient, sleep } from "./Helper.test";

type AnyInterface = Record<string, any>

function basicServer() {
    return TipcNodeServer.create({host:"localhost", port:0, loggerOptions: {logLevel: "OFF"}});
}

describe("Test TipcNodeServer.shutdown", () => {
    it("closes when using internal http server", async () => {
        const core = await basicServer().connect();
        expect(core.isOpen()).toBeTrue();
        await core.shutdown();
        expect(core.isOpen()).toBeFalse();
    });
    it("closes when using external server", async () => {
        const server = createServer();
        server.listen(0);
        await sleep(5);
        const core = await TipcNodeServer.create({server, loggerOptions: {logLevel: "OFF"}}).connect();
        expect(core.isOpen()).toBeTrue();

        server.close();
        await sleep(5);
        expect(core.isOpen()).toBeFalse();
        await core.shutdown(); // Cleanup the WSS instance
    });
});

describe("Test TipcNodeServer.addListener()", () => {
    it("will call server-side event listener in same namespace", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        server.addListener("server-side-without-args", () => counter++);

        server.send("server-side-without-args");
        await sleep(5);
        expect(counter).toBe(1);
    });

    it("will not call server-side event listener in different namespace", async () => {
        const core = await basicServer().connect();
        const namespaceA = core.forContractAndNamespace<AnyInterface>("nsA");
        const namespaceB = core.forContractAndNamespace<AnyInterface>("nsB");
        let counter = 0;
        namespaceA.addListener("server-side-namespaces", () => counter++);

        namespaceB.send("server-side-namespaces");
        await sleep(5);
        expect(counter).toBe(0);
    });

    it("will call server-side event listener in same namespace and forward arguments", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        server.addListener("server-side-with-args", (numA: number, numB: number) => counter+=(numA*numB));

        server.send("server-side-with-args", 5, 2);
        await sleep(5);
        expect(counter).toBe(10);

        server.send("server-side-with-args", 3, 3);
        await sleep(5);
        expect(counter).toBe(19);
    });

    it("will call several server-side event listeners in the same namespace that listen to the same key", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        const server2 = core.forContractAndNamespace<AnyInterface>("ns2");
        let counterA = 0, counterB = 0, counterC = 0;
        server.addListener("server-side-multiple-listeners", () => counterA++);
        server.addListener("server-side-multiple-listeners", () => counterB+=2);
        server2.addListener("server-side-multiple-listeners", () => counterC=10);

        server.send("server-side-multiple-listeners");
        await sleep(5);
        expect(counterA).toBe(1);
        expect(counterB).toBe(2);
        expect(counterC).toBe(0);
    });
});

describe("Test TipcNodeServer.addOnceListener()", () => {
    it("will only call a once-listener once", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        server.addOnceListener("once-listener", () => counter++);

        server.send("once-listener");
        await sleep(5);
        expect(counter).toBe(1);

        server.send("once-listener");
        await sleep(5);
        expect(counter).toBe(1);
    });

    it("will only call a once-listener once, but keep regular listeners", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counterA = 0, counterB = 0;
        server.addOnceListener("both-listener", () => counterA++);
        server.addListener("both-listener", () => counterB++);

        server.send("both-listener");
        await sleep(5);
        expect(counterA).toBe(1);
        expect(counterB).toBe(1);

        server.send("both-listener");
        await sleep(5);
        expect(counterA).toBe(1);
        expect(counterB).toBe(2);
    });
});

describe("Test TipcNodeServer's unsubscribing from listeners and once-listeners", () => {
    it("will unsubscribe a regular listener", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        const handle = server.addListener("remove-listener", () => counter++);

        server.send("remove-listener");
        await sleep(5);
        expect(counter).toBe(1);

        handle.unsubscribe();
        server.send("remove-listener");
        await sleep(5);
        expect(counter).toBe(1);
    });

    it("will unsubscribe once-listener before it was called", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        const handle = server.addOnceListener("remove-once-listener", () => counter++);

        handle.unsubscribe();
        server.send("remove-once-listener");
        await sleep(5);
        expect(counter).toBe(0);
    });

    it("will accept unsubscribing an already unsubscribed listener", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        const handle = server.addListener("remove-listener", () => counter++);
        handle.unsubscribe();
        handle.unsubscribe();
    });

    it("will accept unsubscribe to once-listener after it was called", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        let counter = 0;
        const handle = server.addOnceListener("remove-once-listener-post-call", () => counter++);

        server.send("remove-once-listener-post-call");
        await sleep(5);
        expect(counter).toBe(1);

        handle.unsubscribe();
    });
});

describe("Test TipcNodeServer.addHandler", () => {
    it("will reject adding a handler to a namespace+key already added", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        const cb = () => {};
        server.addHandler("reject-handler", cb);
        expect(() => server.addHandler("reject-handler", cb)).toThrow();
    });

    it("will reject adding a once-handler to a namespace+key already added", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        const cb = () => {};
        server.addHandler("reject-handler", cb);
        expect(() => server.addOnceHandler("reject-handler", cb)).toThrow();
    });

    it("will reject adding a handler to a namespace+key already added (once-handler)", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        const cb = () => {};
        server.addOnceHandler("reject-handler", cb);
        expect(() => server.addHandler("reject-handler", cb)).toThrow();
    });

    it("will reject adding a once-handler to a namespace+key already added (once-handler)", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        const cb = () => {};
        server.addOnceHandler("reject-handler", cb);
        expect(() => server.addHandler("reject-handler", cb)).toThrow();
    });
});

describe("Test TipcNodeServer.getAddressInfo", () => {
    it("will return 'undefined' if not connected to a websocket", async () => {
        const core = await basicServer().connect();
        await core.shutdown();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        expect(server.getAddressInfo()).toBeUndefined();
    });

    it("will return something if connected to a websocket", async () => {
        const core = await basicServer().connect();
        const server = core.forContractAndNamespace<AnyInterface>("ns");
        expect(server.getAddressInfo()).toBeTruthy();
    });
});

describe("Test TipcNodeServer.forNamespaceAndContract", () => {
    it("will warn if reusing namespace", async () => {
        let calledSignal = false;
        const cb = (a: any) => {
            if(a.includes("already in use")) {
                calledSignal = true;
            }
        };
        const noop = () => {};
        const loggerOptions: TipcLoggerOptions = {logLevel: "DEBUG", warn: cb, error: noop, info: noop, debug: noop};

        const server = TipcNodeServer.create({host:"localhost", port:0, loggerOptions});
        const core = await server.connect();
        core.forContractAndNamespace<AnyInterface>("test");
        core.forContractAndNamespace<AnyInterface>("test");
        expect(calledSignal).toBeTrue();

        await core.shutdown();
    });
});

describe("Test TipcNodeServer clientTimeoutMs", () => {
    it("will timeout clients", async () => {
        const server = await TipcNodeServer.create({host:"localhost", port:0, loggerOptions: {logLevel: "OFF"}, clientTimeoutMs: 20}).connect();
        const client = await TipcNodeClient.create({host:"localhost", port: server.getAddressInfo()?.port as number}).connect();
        await sleep(70);
        expect(client.isConnected()).toBeTrue();
        expect((server as any).wss.clients.size).toBe(1);

        // Block all communication on the client websocket, so the server times out the client
        (client as any).__interruptWebsocket();
        await sleep(70);
        expect((server as any).wss.clients.size).toBe(0);
        expect(client.isConnected()).toBeTrue();

        // Client should realize it's been disconnected shortly after we re-enable it
        (client as any).__resumeWebsocket();
        await sleep(10);
        expect(client.isConnected()).toBeFalse();

        await client.shutdown();
        await server.shutdown();
    });
});

describe("Test TipcNodeServer constructor params", () => {
    it("will accept client connecting on correct path", async () => {
        const [_, client] = await setupServerClient("ns", "ns", "ns", {path: "/here"}, {path: "/here"});
        await sleep(10);
        expect(client.isConnected()).toBeTrue();
    });

    it("will not accept client connecting on wrong path", async () => {
        let server: TipcServer|undefined = undefined;
        let client: TipcClient|undefined = undefined;
        try {
            server = await TipcNodeServer.create({host:"localhost", port:0, path:"/here", loggerOptions: {logLevel: "OFF"}}).connect();
            const port = server.getAddressInfo()?.port ?? -1;
            client = await TipcNodeClient.create({host:"localhost", port, path:"/there", loggerOptions: {logLevel: "OFF"}}).connect();
            fail("Connecting client should have thrown an exception");
        }
        catch (ex) {
            expect(ex).toBeTruthy();
        }
        finally {
            await server?.shutdown();
            await client?.shutdown();
        }
    });

    it("is calls onNewConnection callback", async () => {
        let server: TipcServer|undefined = undefined;
        let client1: TipcClient|undefined = undefined;
        let client2: TipcClient|undefined = undefined;
        let calledCount = 0;
        const callback = () => calledCount++;
        try {
            server = await TipcNodeServer.create({host:"localhost", port:0, onNewConnection: callback, loggerOptions: {logLevel: "OFF"}}).connect();
            const port = server.getAddressInfo()?.port ?? -1;

            client1 = await TipcNodeClient.create({host:"localhost", port, loggerOptions: {logLevel: "OFF"}}).connect();
            await sleep(5);
            expect(calledCount).toBe(1);

            client2 = await TipcNodeClient.create({host:"localhost", port, loggerOptions: {logLevel: "OFF"}}).connect();
            await sleep(5);
            expect(calledCount).toBe(2);
        }
        catch (ex) {
            fail(ex);
        }
        finally {
            await server?.shutdown();
            await client1?.shutdown();
            await client2?.shutdown();
        }
    });

    it("is possible to terminate a websocket in onClientConnect callback", async () => {
        const connectCallback = (ws: TipcNodeClient) => ws.shutdown();
        const [_, client] = await setupServerClient("ns", "ns", "ns", {onClientConnect: connectCallback}, {});
        await sleep(10);
        expect(client.isConnected()).toBeFalse();
    });

    it("is possible to check query params in onClientConnect callback", async () => {
        let server: TipcServer|undefined = undefined;
        let clientA: TipcClient|undefined = undefined;
        let clientB: TipcClient|undefined = undefined;
        const connectCallback = (ws: TipcNodeClient, url: URL) => {
            if(url.searchParams.get("foo") !== "bar") {
                ws.shutdown();
            }
        };
        try {
            server = await TipcNodeServer.create({host:"localhost", port:0, path: "/hello",
                onClientConnect: connectCallback, loggerOptions: {logLevel: "OFF"}}).connect();
            const port = server.getAddressInfo()?.port ?? -1;

            clientA = await TipcNodeClient.create({url:`ws://localhost:${port}/hello?foo=baz`, loggerOptions: {logLevel: "OFF"}}).connect();
            clientB = await TipcNodeClient.create({url:`ws://localhost:${port}/hello?foo=bar&baz=foz`, loggerOptions: {logLevel: "OFF"}}).connect();
            await sleep(5);
            expect(clientA.isConnected()).toBeFalse();
            expect(clientB.isConnected()).toBeTrue();
        }
        catch (ex) {
            fail(ex);
        }
        finally {
            await server?.shutdown();
            await clientA?.shutdown();
            await clientB?.shutdown();
        }
    });
});
