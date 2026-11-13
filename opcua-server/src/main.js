"use strict";
const { OPCUAServer, nodesets } = require("node-opcua");
const { constructAddressSpace } = require("./opcua/address-space");

(async () => {
    try {
        const server = new OPCUAServer({
            port: 26543,
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
