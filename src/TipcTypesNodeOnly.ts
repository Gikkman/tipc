import {Server as HTTPServer, IncomingMessage} from 'node:http';
import {Server as HTTPSServer} from 'node:http';
import { TipcLoggerOptions } from './TipcLogger';
import WebSocket from 'ws';

/**
 * --Tipc Server Options--
 *
 * When specifying {noWsServer: true}, no Websocket server will be created, and you can use the Tipc instance
 * as a pure pub/sub system.
 *
 * When supplying a host and port, a new Websocket server instance will be create. This instance will
 * be managed by Tipc and properly shutdown once the `shutdown()` method is called. To use a random port, supply
 * port number `0`.
 *
 * When supplying a HTTPServer, Tipc will create a Websocket server from that HTTPServer. The Websocket server
 * will be managed by Tipc, but if the HTTPServer is closed externally, the Websocket server will cease to
 * function.
 *
 * If you set `clientTimeoutMs` to 0, the TipcServer won't check clients for disconnects. By default, it will
 * ping clients every 30 seconds to verify that they are still reachable.
 */
export type TipcServerOptions = {
    clientTimeoutMs?: number,
    onNewConnection?: (ws: WebSocket, request: IncomingMessage) => any,
    loggerOptions?: TipcLoggerOptions
}
&
(
    {noWsServer: true}
    | {host: string, port: number, path?: string}
    | {server: HTTPServer | HTTPSServer}
)
