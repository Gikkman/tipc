import { makeKey } from "./TipcCommon";
import { TipcLogger } from "./TipcLogger";
import { Callback, Topic, TipcSubscription, WrappedCallback } from "./TipcTypes";

export class TipcListenerComponent {
    private sendListeners: Map<string, WrappedCallback[]> = new Map();
    private logger: TipcLogger;

    constructor(logger: TipcLogger) {
        this.logger = logger;
    }

    removeListener(namespace: string, topic: Topic, callback: Callback) {
        const fullKey = makeKey(namespace, topic);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.callback !== callback);
        if(filtered.length === 0) {
            this.sendListeners.delete(fullKey);
        }
        else {
            this.sendListeners.set(fullKey, filtered);
        }
    }

    addListener(namespace: string, topic: Topic, callback: WrappedCallback): TipcSubscription {
        this.logger.debug("Added new listener for %s:%s", namespace, topic);
        const fullKey = makeKey(namespace, topic);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        listeners.push(callback);
        this.sendListeners.set(fullKey, listeners);
        return { unsubscribe: () => {
            const filtered = (this.sendListeners.get(fullKey) ?? []).filter(cb => cb !== callback);
            if(filtered.length===0){
                this.sendListeners.delete(fullKey);
            }
            else {
                this.sendListeners.set(fullKey, filtered);
            }
        }};
    }

    callListeners(namespace: string, topic: Topic, ...args: any[]) {
        this.logger.debug("Calling listeners for %s:%s", namespace, topic);
        const fullKey = makeKey(namespace, topic);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.multiUse);
        if(filtered.length===0) {
            this.sendListeners.delete(fullKey);
        }
        else {
            this.sendListeners.set(fullKey, filtered);
        }
        listeners.forEach(c => {
            try {
                c.callback(...args);
            }
            catch (ex) {
                this.logger.error("A listener for %s:%s threw an error: %s", namespace, topic, ex);
            }
        });
    }
}
