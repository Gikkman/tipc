import { tipc } from '../bus/Bus';
import { A } from '../shared/EventApiA';

/************************************************************************
 *  Event listeners
 ************************************************************************/
const bus = tipc<A>("default", true);
bus.on("a", (data) => {
    console.log(data + " on 'a' in renderer");
})
bus.on("b", (data) => {
    console.log(data + " on 'b' in renderer");
})
bus.on("c", (data) => {
    console.log(data + " on 'c' in renderer");
})

/************************************************************************
 *  Explicit methods
 ************************************************************************/
setInterval(() => {
    bus.broadcast('c', 3)
}, 1000);