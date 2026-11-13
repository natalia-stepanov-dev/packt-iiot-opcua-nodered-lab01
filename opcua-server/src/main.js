"use strict";
const { OPCUAServer, nodesets } = require("node-opcua");
const { constructAddressSpace } = require("./opcua/address-space");
const { loadConfig } = require("./config");

(async () => {
    try {
        const config = loadConfig();
        const server = new OPCUAServer({
            port: config.port,
            nodeset_filename: [nodesets.standard, nodesets.di],
            buildInfo: {
                productName: "Sample NodeOPCUA Server1",
                buildNumber: "7658",
                buildDate: new Date(2020, 6, 14),
            },
        });

        await server.initialize();
        constructAddressSpace(server);
        await server.start();
        console.log("Server is now listening ... ( press CTRL+C to stop) ");
        server.endpoints[0].endpointDescriptions().forEach(function (endpoint) {
            console.log(
                endpoint.endpointUrl,
                endpoint.securityMode.toString(),
                endpoint.securityPolicyUri.toString(),
            );
        });

        process.on("SIGINT", async () => {
            await server.shutdown();
            console.log("terminated");
        });
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }
})();
