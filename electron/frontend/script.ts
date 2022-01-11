import { tipcRenderer } from '../bus/Bus';
import { A, B } from '../shared/EventApi';

const listElem = document.getElementById('list') as HTMLUListElement;

/************************************************************************
 *  Event listeners
 ************************************************************************/
const bus = tipcRenderer<A>({debug: true});
const otherBus = tipcRenderer<B>({debug: true, namespace: "alternative-namespace"});
bus.on('a', (data) => {
    listElem.append( createListElement(data) );
});
otherBus.on('b', (data) => {
    listElem.append( createListElement(data) );
});
bus.on('c', (data) => {
    listElem.append( createListElement(data) );
});
bus.once('d', () => {
    listElem.append( createListElement({data: -1, sender: ''}) );
});
/************************************************************************
 *  Explicit methods
 ************************************************************************/
function sendA() {
    bus.broadcast('a', {data: 1, sender: 'renderer'});
}
function sendB() {
    otherBus.broadcast('b', {data: 2, sender: 'renderer'});
}
function sendC() {
    bus.broadcast('c', {data: 3, sender: 'renderer'});
}
function sendD() {
    bus.broadcast('d');
}
function invokeF() {
    bus.invoke('F', 1, 'renderer').then( (val) => {
        listElem.append( createListElement({data: val, sender: 'renderer'}) );
    });
}
function invokeG() {
    bus.invoke('G', 2, 'renderer').then( (val) => {
        listElem.append( createListElement({data: val, sender: 'renderer'}) );
    });
}
function invokeH() {
    otherBus.invoke('H', [4,3,2], ).then( (val) => {
        listElem.append( createListElement({data: val, sender: 'renderer'}) );
    });
}
function invokeI() {
    bus.invoke('I').then( (val) => {
        listElem.append( createListElement({data: -1, sender: val}) );
    });
}

/************************************************************************
 *  Internal methods
 ************************************************************************/
function createListElement(event: {data: number, sender: string}) {
    const node = document.createElement('li');
    node.textContent = `${event.data} (${event.sender})`;
    return node;
}