import { A, B } from '../shared/EventApi';
import { TipcBrowserClient } from '../../src/TipcBrowserClient';
import { TipcClient } from '../../src/TipcTypes';

const listElem = document.getElementById('list') as HTMLUListElement;

/************************************************************************
 *  Event listeners
 ************************************************************************/
let bus: TipcClient<A>, otherBus: TipcClient<B>;
const core = TipcBrowserClient.create({address: "localhost", port: 8088});
core.connect()
.then(c => {
    bus = c.forContractAndNamespace<A>("default");
    otherBus = c.forContractAndNamespace<B>("alternative");
    bus.addListener('a', (data) => {
        listElem.append( createListElement(data) );
    });
    otherBus.addListener('b', (data) => {
        listElem.append( createListElement(data) );
    });
    bus.addListener('c', (data) => {
        listElem.append( createListElement(data) );
    });
    bus.addListener('d', () => {
        listElem.append( createListElement({data: -1, sender: ''}) );
    });
})
/************************************************************************
 *  Explicit methods
 ************************************************************************/
function sendA() {
    bus.send('a', {data: 1, sender: 'renderer'});
}
function sendB() {
    otherBus.send('b', {data: 2, sender: 'renderer'});
}
function sendC() {
    bus.send('c', {data: 3, sender: 'renderer'});
}
function sendD() {
    bus.send('d');
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