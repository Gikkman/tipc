import { TipcBrowserClient } from '../../src/TipcBrowserClient';
import { TipcNamespaceClient } from '../../src/TipcTypes';
import { Operations, OtherOperations } from '../EventApi';

/************************************************************************
 *  Event listeners
 ************************************************************************/
let ops: TipcNamespaceClient<Operations>, otherOps: TipcNamespaceClient<OtherOperations>;
const core = TipcBrowserClient.create({address: "localhost", port: 8088});
core.connect()
.then(c => {
    ops = c.forContractAndNamespace<Operations>("ops");
    otherOps = c.forContractAndNamespace<OtherOperations>("oops");

    ops.addListener('sendArray', markSend)
    ops.addListener('sendObject', markSend)
    ops.addListener('sendString', markSend)
    ops.addListener('sendVoid', markSend)
    otherOps.addListener('sendNumber', markSend)
})
/************************************************************************
 *  Explicit methods
 * 
 *  Exported to avoid getting treeshake'd
 ************************************************************************/
export function sendVoid() {
    ops.send('sendVoid');
}

export function sendArray() {
    const n1 = parseInt(document.querySelector<HTMLInputElement>("input#n1")?.value ?? "0")
    const n2 = parseInt(document.querySelector<HTMLInputElement>("input#n2")?.value ?? "0")
    const n3 = parseInt(document.querySelector<HTMLInputElement>("input#n3")?.value ?? "0")
    ops.send('sendArray', [n1,n2,n3])
}

export function sendShuffle() {
    const n1 = parseInt(document.querySelector<HTMLInputElement>("input#n1")?.value ?? "0")
    const n2 = parseInt(document.querySelector<HTMLInputElement>("input#n2")?.value ?? "0")
    const n3 = parseInt(document.querySelector<HTMLInputElement>("input#n3")?.value ?? "0")
    ops.invoke('shuffle', n1, n2, n3).then(serverMessage)
}

export function sendObject() {
    const n1 = parseInt(document.querySelector<HTMLInputElement>("input#n1")?.value ?? "0")
    const s1 = document.querySelector<HTMLInputElement>("input#s1")?.value ?? ""
    ops.send('sendObject', {keyA: n1, keyB: s1})
}

export function sendString() {
    const s1 = document.querySelector<HTMLInputElement>("input#s1")?.value ?? ""
    const s2 = document.querySelector<HTMLInputElement>("input#s2")?.value ?? ""
    const s3 = document.querySelector<HTMLInputElement>("input#s3")?.value ?? ""
    ops.send('sendString', s1+s2+s3)
}
export function sendCombine() {
    const s1 = document.querySelector<HTMLInputElement>("input#s1")?.value ?? ""
    const s2 = document.querySelector<HTMLInputElement>("input#s2")?.value ?? ""
    const s3 = document.querySelector<HTMLInputElement>("input#s3")?.value ?? ""
    ops.invoke('combine', s1, s3, s2).then(serverMessage)
}

export function sendNumber() {
    const num = parseInt(document.querySelector<HTMLInputElement>("input#num")?.value ?? "0")
    otherOps.send('sendNumber', num)
}

export function sendDouble() {
    const num = parseInt(document.querySelector<HTMLInputElement>("input#num")?.value ?? "0")
    otherOps.invoke('double', num).then(serverMessage)
}

/************************************************************************
 *  Internal methods
 ************************************************************************/
function markSend() {
    const e = document.querySelector<HTMLParagraphElement>(".sent-message")
    if(!e) return;
    e.classList.remove('fadeOutElement')
    e.offsetHeight;
    setTimeout(() => {
        e.classList.add('fadeOutElement')
    }, 0);
}

function serverMessage(arg: any) {
    const e = document.querySelector<HTMLParagraphElement>("p#return-value");
    if(!e) return
    e.classList.remove('fadeOutElement')
    e.offsetHeight;
    setTimeout(() => {
        e.classList.add('fadeOutElement')
        e.innerText = "Server message: " + JSON.stringify(arg)
    }, 0);
}

for( const e of document.getElementsByClassName('messages')) {
    e.addEventListener('animationend', () => e.classList.remove('fadeOutElement'))
}