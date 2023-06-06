import { Topic, TipcErrorObject, TipcInvokeObject, TipcMessageObject, TipcSendObject } from "./TipcTypes";

export function makeKey(namespace: string, topic: Topic) {
    return `${namespace}::${topic.toString()}`;
}

export function makeTipcSendObject(namespace: string, topic: Topic, args: unknown[]): TipcSendObject {
    return {
        method: "send",
        namespace,
        topic: topic.toString(),
        data: args,
    };
}

export function makeTipcInvokeObject(namespace: string, topic: Topic, uuid: string, args: unknown[]): TipcInvokeObject {
    return {
        method: "invoke",
        namespace,
        topic: topic.toString(),
        data: args,
        messageId: uuid,
    };
}

export function makeTipcErrorObject(namespace: string, topic: Topic, message: string): TipcErrorObject {
    return {
        method: "error",
        namespace,
        topic: topic.toString(),
        data: [message],
    };
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
        return (!!temp.messageId);
    }
    else {
        return primary;
    }
}
