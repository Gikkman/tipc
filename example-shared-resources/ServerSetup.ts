import { TipcNodeServer } from "../src/TipcNodeServer";
import { Operations, OtherOperations } from "./EventApi";

export async function setupWebsocketServer() {
    return TipcNodeServer.create({address: "localhost", port: 8088})
        .connect()
        .then(server => {
            const ops = server.forContractAndNamespace<Operations>("ops");
            const otherOps = server.forContractAndNamespace<OtherOperations>("oops");

            ops.addListener('sendVoid', () => {
                console.log("Received 'sendVoid' event");
            });
            ops.addListener('sendString', s => {
                console.log("Received 'sendString' event: " + s);
            });
            ops.addListener('sendArray', arr => {
                console.log("Received 'sendArray' event: " + JSON.stringify(arr));
            });
            ops.addListener('sendObject', obj => {
                console.log("Received 'sendObject' event: " + JSON.stringify(obj));
            });
            otherOps.addListener('sendNumber', num => {
                console.log("Received 'sendNumber' event: " + num);
            });

            ops.addHandler('combine', (prefix, suffix, body) => ({result:prefix+body+suffix}));
            ops.addHandler('shuffle', (...arr) => shuffle(arr));
            otherOps.addHandler('double', num => num*num);

            return server;
        });
}

function shuffle(array: Array<any>) {
    const copy = [...array];
    let currentIndex = copy.length, randomIndex = 0;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [copy[currentIndex], copy[randomIndex]] = [
            copy[randomIndex], copy[currentIndex]];
    }

    return copy;
}
