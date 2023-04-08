import express from 'express';
import { join } from 'path';
import { setupWebsocketServer } from "../example-shared-resources/ServerSetup";
/************************************************************************
 *  Main behavior
 ************************************************************************/
const app = express()
app.use((req,res,next) => {
    console.log(req.url)
    next()
})
app.use(express.static(join(__dirname, 'output')))
app.listen(8080, () => {
    console.log("Listening to http://localhost:8080")
    setupWebsocketServer()
})

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));