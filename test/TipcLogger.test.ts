import { TipcLogger } from '../src/TipcLogger';

describe("Test TipcLogger", () => {
    it("calls debug,info,warn,error if level is debug", async () => {
        let counter = 0;
        const cb = () => counter++;
        const instance = new TipcLogger({logLevel: "DEBUG", error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(counter).toBe(1);

        instance.warn("test");
        expect(counter).toBe(2);

        instance.info("test");
        expect(counter).toBe(3);

        instance.debug("test");
        expect(counter).toBe(4);
    });

    it("calls info,warn,error if level is info", async () => {
        let counter = 0;
        const cb = () => counter++;
        const instance = new TipcLogger({logLevel: "INFO", error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(counter).toBe(1);

        instance.warn("test");
        expect(counter).toBe(2);

        instance.info("test");
        expect(counter).toBe(3);

        instance.debug("test");
        expect(counter).toBe(3);
    });

    it("calls warn,error if level is warn", async () => {
        let counter = 0;
        const cb = () => counter++;
        const instance = new TipcLogger({logLevel: "WARN", error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(counter).toBe(1);

        instance.warn("test");
        expect(counter).toBe(2);

        instance.info("test");
        expect(counter).toBe(2);

        instance.debug("test");
        expect(counter).toBe(2);
    });

    it("calls error if level is error", async () => {
        let counter = 0;
        const cb = () => counter++;
        const instance = new TipcLogger({logLevel: "ERROR", error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(counter).toBe(1);

        instance.warn("test");
        expect(counter).toBe(1);

        instance.info("test");
        expect(counter).toBe(1);

        instance.debug("test");
        expect(counter).toBe(1);
    });

    it("calls nothing if level is off", async () => {
        let counter = 0;
        const cb = () => counter++;
        const instance = new TipcLogger({logLevel: "OFF", error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(counter).toBe(0);

        instance.warn("test");
        expect(counter).toBe(0);

        instance.info("test");
        expect(counter).toBe(0);

        instance.debug("test");
        expect(counter).toBe(0);
    });

    it("applies message prefix if one is set", async () => {
        let output = "";
        const messagePrefix = "[T]";
        const cb = (s: string) => output = s;
        const instance = new TipcLogger({logLevel: "DEBUG", messagePrefix, error: cb, warn: cb, info: cb, debug: cb});

        instance.error("test");
        expect(output).toBe("[T] test");

        instance.warn("something");
        expect(output).toBe("[T] something");

        instance.info("1");
        expect(output).toBe("[T] 1");

        instance.debug("%s", "hello");
        expect(output).toBe("[T] hello");
    });

    it("can stringify various data types", () => {
        let output = "";
        const testCallback = (s: string) => output = s;
        const instance = new TipcLogger({info: testCallback, logLevel: "INFO"});

        instance.info("%s", [1,2,3]);
        expect(output).toBe("[1,2,3]");

        instance.info("%s", {"a": 1, "b": "world"});
        expect(output).toBe('{"a":1,"b":"world"}');

        instance.info("%s %s!", "hello", "world");
        expect(output).toBe("hello world!");

        instance.info("%s %s %s", 1, 2, 3);
        expect(output).toBe("1 2 3");

        instance.info("%s %s %s %s", "hello", 2, [1], {"w":"o"});
        expect(output).toBe('hello 2 [1] {"w":"o"}');
    });
});
