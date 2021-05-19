import { tipc } from '../bus/Bus';
import { A } from '../shared/EventApiA';

const listElem = document.getElementById("list") as HTMLUListElement;

/************************************************************************
 *  Event listeners
 ************************************************************************/
const bus = tipc<A>("default", true);
bus.on("a", (data) => {
    listElem.append( createListElement(data) )
})
bus.on("b", (data) => {
    listElem.append( createListElement(data) )
})
bus.on("c", (data) => {
    listElem.append( createListElement(data) )
})
bus.once("d", () => {
    listElem.append( createListElement({data: -1, sender: ''}) )
})

/************************************************************************
 *  Explicit methods
 ************************************************************************/
function sendA() {
    bus.broadcast("a", {data: 1, sender: "renderer"});
}
function sendB() {
    bus.broadcast("b", {data: 2, sender: "renderer"});
}
function sendC() {
    bus.broadcast("c", {data: 3, sender: "renderer"});
}
function sendD() {
    bus.broadcast("d", undefined);
}

/************************************************************************
 *  Internal methods
 ************************************************************************/
function createListElement(event: {data: number, sender: string}) {
    const node = document.createElement('li');
    node.textContent = `${event.data} (${event.sender})`;
    return node;
}