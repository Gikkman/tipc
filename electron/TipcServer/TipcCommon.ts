import { randomUUID } from "crypto";
import { Key, TipcErrorObject, TipcInvokeObject, TipcMessageObject, TipcSendObject } from "./Types";

export function makeKey(namespace: string, topic: Key) {
    return `${namespace}::${topic.toString()}`;
}

export function makeTipcSendObject(namespace: string, topic: Key, ...args: any[]): TipcSendObject {
    return {
        method: "send",
        namespace,
        topic: topic.toString(),
        data: args
    }
}

export function makeTipcInvokeObject(namespace: string, topic: Key, ...args: any[]): TipcInvokeObject {
    return {
        method: "invoke",
        namespace,
        topic: topic.toString(),
        data: args,
        messageId: randomUUID()
    }
}

export function makeTipcErrorObject(namespace: string, topic: Key, message: string): TipcErrorObject {
    return {
        method: "error",
        namespace,
        topic: topic.toString(),
        data: [message]
    }
}

export function validateMessageObject(obj: any): obj is TipcMessageObject {
    const temp = obj as TipcMessageObject;
    const primary = (!!temp.namespace) 
                    && (!!temp.topic) 
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