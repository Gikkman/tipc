import { setInterval } from "timers";
import { WebSocketServer, WebSocket, AddressInfo } from "ws";

type MessageHandler = (message: any) => void

export class TipcServerWebsocket {
    private websocketServer: WebSocketServer;
    private clientAlive: Map<WebSocket, boolean> = new Map();

    private messageHandler: MessageHandler;

    constructor(callback: MessageHandler) {
        this.messageHandler = callback;

        const host = process.env['WSS_HOST'];
        const port = Number.parseInt(process.env['WSS_PORT'] ?? "") || undefined;
        
        this.websocketServer = new WebSocketServer({port, host});
        this.websocketServer.on("connection", ws => {
            this.clientAlive.set(ws, true);
            ws.on("pong", () => this.clientAlive.set(ws, true))
            ws.on("message", (data, isBinary) => {
                const msg = (isBinary ? data : data.toString()) as string;
                const obj = JSON.parse(msg);
                this.messageHandler(obj);
            })
        })

        const interval = setInterval( () => {
            this.websocketServer.clients.forEach(ws => {
                if( this.clientAlive.get(ws) === false ) {
                    return ws.terminate();
                }
                this.clientAlive.set(ws, false);
                ws.ping();
            }, 30_000)
        })

        this.websocketServer.on("close", () => {
            clearInterval(interval);
        })
    }

    getAddressInfo() {
        return this.websocketServer.address() as AddressInfo;
    }
}