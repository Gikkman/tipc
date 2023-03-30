import { makeKey } from "./TipcCommon";
import { Callback, TipcSubscription, WrappedCallback } from "./Types";

export class TipcListenerComponent {
    private sendListeners: Map<string, WrappedCallback[]> = new Map();

    removeListener(namespace: string, key: string, callback: Callback) {
        const fullKey = makeKey(namespace, key);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.callback !== callback);
        if(filtered.length === 0) {
            this.sendListeners.delete(fullKey)
        } 
        else {
            this.sendListeners.set(fullKey, filtered);
        }
    }

    addListener(namespace: string, key: string, callback: WrappedCallback): TipcSubscription {
        const fullKey = makeKey(namespace, key);
        const listeners = this.sendListeners.get(fullKey) ?? [];
        listeners.push(callback);
        this.sendListeners.set(fullKey, listeners);
        return { unsubscribe: () => {
            const filtered = (this.sendListeners.get(fullKey) ?? []).filter(cb => cb !== callback)
            if(filtered.length===0){
                this.sendListeners.delete(fullKey)
            } else {
                this.sendListeners.set(fullKey, filtered)
            }
        }}
    }

    callListeners(namespace: string, key: string, ...args: any[]) {
        const fullKey = makeKey(namespace, key)
        const listeners = this.sendListeners.get(fullKey) ?? [];
        const filtered = listeners.filter(c => c.multiUse);
        if(filtered.length===0) {
            this.sendListeners.delete(fullKey)
        }
        else {
            this.sendListeners.set(fullKey, filtered);
        }
        listeners.forEach(c => c.callback(...args));
    }
}