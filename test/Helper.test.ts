export async function sleep(ms: number) {
    return new Promise<void>(r => {
        setTimeout(() => {
            r()
        }, ms);
    })
}

// export let core: TipcServerCoreTest;
// export let client: TipcNodeClient;
// 
// beforeEach(async () => {
//     console.log("---- Starting test -----")
//     core = new TipcServerCoreTest();
//     await core.startup();
//     const address = core.getAddressInfo();
//     
//     client = new TipcNodeClient();
//     return client.startup(`ws://${address.address}:${address.port}`)
// })
// afterEach(async () => {
//     console.log("---- Ending test -----")
//     await core.shutdown();
//     return client.shutdown()
// })