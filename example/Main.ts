import { A, B } from './shared/EventApi';
import { TipcNodeServer } from '../src/TipcNodeServer';
import express from 'express';
import { join } from 'path';
/************************************************************************
 *  Main behavior
 ************************************************************************/
TipcNodeServer.create({address: "localhost", port: 8088})
.connect()
.then(server => {
    const bus = server.forContractAndNamespace<A>("default")
    const otherBus = server.forContractAndNamespace<B>("alternative");
    bus.addListener('a', (event) => {
        console.log(`a: Received ${event.data} from ${event.sender} on main`);
    });
    otherBus.addListener('b', (event) => {
        console.log(`b: Received ${event.data} from ${event.sender} on main`);
    });
    bus.addListener('c', (event) => {
        console.log(`c: Received ${event.data} from ${event.sender} on main`);
    });
    bus.addOnceListener('d', () => {
        console.log(`d: Received -blank- on main`);
        bus.send('c', {sender: 'main', data: 3});
    });
    bus.addHandler('F', (num, sender) => {
        console.log(`F: Handling ${num} and ${sender} on main`);
        return num;
    });
    bus.addHandler('G', async (data, sender) => {
        console.log(`G: Handling ${data} and ${sender} on main`);
        return data;
    });
    otherBus.addHandler('H', async (data) => {
        console.log(`H: Handling ${data} on main`);
        return new Promise<number>( (res) => setTimeout(() => res(data[0]*data[1]*data[2]), 1000) );
    });
    bus.addHandler('I', () => {
        console.log(`I: Handling -blank- on main`);
        return 'Hello World';
    });
    console.log("Listeners configured")
})

const app = express()
app.use((req,res,next) => {
    console.log(req.url)
    next()
})
app.use(express.static(join(__dirname, '..', 'example-static')))
app.listen(8080, () => console.log("Listening to http://localhost:8080"))

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));