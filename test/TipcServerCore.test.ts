import {TipcServerCore} from '../electron/TipcServer/TipcServerCore'

class TipcServerCoreTest extends TipcServerCore { 
    constructor(){ super(); } 
    getListeners(namespace: string, key: string) { return this.broadcastListeners.get(this.makeKey(namespace, key)) }
    getHandlers(namespace: string, key: string) { return this.invokeListeners.get(this.makeKey(namespace, key)) }
    call(namespace: string, key: string, ...args: any[]) {
        return super.callListeners(namespace, key, ...args);
    }
    invoke(namespace: string, key: string, ...args: any[]) {
        return super.callHandler(namespace, key, ...args);
    }
};

describe("Test TipcServerCore.addListener() and TipcServerCore.addOnceListener()", () => {
    it("will call single listener when added", async () => {
        const core = new TipcServerCoreTest();
        const transmit = {counter: 0};
        core.addListener("ns", "key", () => {transmit.counter++});
        
        expect(transmit.counter).toBe(0);
        await core.call("ns", "key")
        expect(transmit.counter).toBe(1);
    })
    
    it("will call multiple listeners when added", async () => {
        const core = new TipcServerCoreTest();
        const transmit1 = {counter: 0};
        const transmit2 = {counter: 0};
        core.addListener("ns", "key", () => {transmit1.counter++});
        core.addListener("ns", "key", () => {transmit2.counter++});
        
        await core.call("ns", "key")
        expect(transmit1.counter).toBe(1);
        expect(transmit2.counter).toBe(1);
    })

    it("will not call listeners on different key in same namespace",async () => {
        const core = new TipcServerCoreTest();
        const transmitTouched = {counter: 0};
        const transmitUntouched = {counter: 0};
        core.addListener("ns", "keyA", () => {transmitTouched.counter++});
        core.addListener("ns", "keyB", () => {transmitUntouched.counter++});
        
        await core.call("ns", "keyA")
        expect(transmitTouched.counter).toBe(1);
        expect(transmitUntouched.counter).toBe(0);
    })

    it("will not call listeners on same key in different namespace",async () => {
        const core = new TipcServerCoreTest();
        const transmitTouched = {counter: 0};
        const transmitUntouched = {counter: 0};
        core.addListener("nsA", "key", () => {transmitTouched.counter++});
        core.addListener("nsB", "key", () => {transmitUntouched.counter++});
        
        await core.call("nsA", "key")
        expect(transmitTouched.counter).toBe(1);
        expect(transmitUntouched.counter).toBe(0);
    })

    it("will not call 'once' listeners more than once", async () => {
        const core = new TipcServerCoreTest();
        const transmitMulti = {counter: 0};
        const transmitOnce = {counter: 0};
        core.addListener("ns", "key", () => {transmitMulti.counter++});
        core.addOnceListener("ns", "key", () => {transmitOnce.counter++});
        
        await core.call("ns", "key")
        await core.call("ns", "key")
        expect(transmitMulti.counter).toBe(2);
        expect(transmitOnce.counter).toBe(1);
    })
    
    it("will remove added listeners as requested", () => {
        const core = new TipcServerCoreTest();
        const transmit = {counter: 0};
        const callback1 = () => transmit.counter++;
        const callback2 = () => transmit.counter++;
        const callback3 = () => transmit.counter++;

        core.addListener("ns", "key", callback1);
        core.addListener("ns", "key", callback2);
        core.addOnceListener("ns", "key", callback3);
        expect(core.getListeners("ns", "key")?.length).toBe(3)
        core.removeListener("ns", "key", callback1);
        expect(core.getListeners("ns", "key")?.length).toBe(2);
        core.removeListener("ns", "key", callback2);
        expect(core.getListeners("ns", "key")?.length).toBe(1);
        core.removeListener("ns", "key", callback3);
        expect(core.getListeners("ns", "key")?.length).toBe(0);
    });
});

describe("Test TipcServerCore.addHandler() and TipcServerCore.addOnceHandler()", () => {
    it("will call handler", async () => {
        const core = new TipcServerCoreTest();
        const callback = (a:number) => a*2;

        core.addHandler("ns", "key", callback);
        expect(await core.invoke("ns", "key", 2)).toBe(4);
        expect(await core.invoke("ns", "key", 5)).toBe(10);
        expect(await core.invoke("ns", "key", -1)).toBe(-2);
    })

    it("will call once handler just once",async () => {
        const core = new TipcServerCoreTest();
        const callback = (a:number) => a*2;

        core.addOnceHandler("ns", "key", callback);
        expect(core.getHandlers("ns", "key")).toBeTruthy();
        expect(await core.invoke("ns", "key", 2)).toBe(4);
        expect(core.getHandlers("ns", "key")).toBeFalsy();
    });

    it("will remove handler if requested", () => {
        const core = new TipcServerCoreTest();
        const callback = (a:number) => a*2;

        core.addHandler("ns", "key", callback);
        expect(core.getHandlers("ns", "key")).toBeTruthy();
        core.removeHandler("ns", "key");
        expect(core.getHandlers("ns", "key")).toBeFalsy();
    })

    it("will throw an exception if adding a handler to an already defined handler", () => {
        const core = new TipcServerCoreTest();
        const callback = (a:number) => a*2;

        core.addHandler("ns", "key", callback);
        expect(() => core.addHandler("ns", "key", callback)).withContext("Re-adding handler should throw").toThrowError()
    })

    it("will throw an exception if no handler is defined", async () => {
        const core = new TipcServerCoreTest();
        try {
            await core.invoke("ns", "key")
            fail("Calling invoke should trow if no handler is defined")
        } catch(e) {
            expect(e).toBeTruthy()
        }
    })
})
