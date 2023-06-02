import { format } from "util";

type LogLevel = "DEBUG"|"INFO"|"WARN"|"ERROR"|"OFF";

type LogSink = (s: string, ...rest: unknown[]) => void;

export type TipcLoggerOptions = {
    messagePrefix?: string,
    logLevel?: LogLevel,
    debug?: LogSink,
    info?: LogSink,
    warn?: LogSink,
    error?: LogSink,
}

const defaultOptions: Required<TipcLoggerOptions> = {
    messagePrefix: "",
    logLevel: "INFO",
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
}

export class TipcLogger {
    private messagePrefix: string;
    private logLevel: ReturnType<typeof levelToLogScore>;
    private debugSink: LogSink;
    private infoSink: LogSink;
    private warnSink: LogSink;
    private errorSink: LogSink;

    /**
     * Creates a new TipcLoggerInstance. Defaults to loglevel `INFO`, and
     * uses `console` for output.
     * @param options Options for this logger instance.
     */
    constructor(options?: TipcLoggerOptions) {
        const opts = {...defaultOptions, ...options}
        this.messagePrefix = opts.messagePrefix;
        this.logLevel = levelToLogScore(opts.logLevel);
        this.debugSink = opts.debug;
        this.infoSink = opts.info;
        this.warnSink = opts.warn;
        this.errorSink = opts.error;
    }

    debug(s: string, ...rest: any) {
        if(levelToLogScore("DEBUG") < this.logLevel) return;
        const message = formatMessage(this.messagePrefix, s, ...rest)
        this.debugSink(message);
    }

    info(s: string, ...rest: any) {
        if(levelToLogScore("INFO") < this.logLevel) return;
        const message = formatMessage(this.messagePrefix, s, ...rest)
        this.infoSink(message);
    }

    warn(s: string, ...rest: any) {
        if(levelToLogScore("WARN") < this.logLevel) return;
        const message = formatMessage(this.messagePrefix, s, ...rest)
        this.warnSink(message);
    }

    error(s: string, ...rest: any) {
        if(levelToLogScore("ERROR") < this.logLevel) return;
        const message = formatMessage(this.messagePrefix, s, ...rest)
        this.errorSink(message);
    }
}

function levelToLogScore(level: LogLevel) {
    switch (level) {
        case "DEBUG": return 10;
        case "INFO": return 20;
        case "WARN": return 30;
        case "ERROR": return 40;
        case "OFF": return 100;
    }
}

function formatMessage(prefix: string, message: string, ...args: any[]) {
    let pre = (prefix && prefix.length > 0 ) ? prefix + " " : "";
    const mapped = args.map(el => {
        const type = typeof el;
        if(type === "object" || Array.isArray(el))
            return JSON.stringify(el)
        if(type === "function")
            return el.toString()
        else
            return el
    });
    return format(pre + message, ...mapped)
}