import { randomUUID } from "crypto";
import { TipcErrorObject, TipcInvokeObject, TipcMessageObject, TipcSendObject } from "./Types";

export function makeKey(namespace: string, key: string) {
    return `${namespace}::${key.toString()}`;
}

export function makeTipcSendObject(namespace: string, key: string, ...args: any[]): TipcSendObject {
    return {
        method: "send",
        namespace,
        key,
        data: args
    }
}

export function makeTipcInvokeObject(namespace: string, key: string, ...args: any[]): TipcInvokeObject {
    return {
        method: "invoke",
        namespace,
        key,
        data: args,
        messageId: randomUUID()
    }
}

export function makeTipcErrorObject(namespace: string, key: string, message: string): TipcErrorObject {
    return {
        method: "error",
        namespace,
        key,
        data: [message]
    }
}

export function validateMessageObject(obj: any): obj is TipcMessageObject {
    const temp = obj as TipcMessageObject;
    const primary = (!!temp.namespace) 
                    && (!!temp.key) 
                    && (temp.method==="send"
                        ||temp.method==="invoke"
                        ||temp.method==="error");
    // TipcInvokeObject has an additional property, messageId
    if(primary && temp.method==="invoke") {
        return (!!temp.messageId)
    } else {
        return primary
    }
}