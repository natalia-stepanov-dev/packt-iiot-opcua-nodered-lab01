"use strict";
const { OPCUAServer, nodesets } = require("node-opcua");
const { constructAddressSpace } = require("./opcua/address-space");
const { loadConfig } = require("./config");

(async () => {
    try {
        const config = loadConfig();
        const server = new OPCUAServer({
            port: config.port,
            nodeset_filename: [nodesets.standard],
            buildInfo: {
                productName: "Sample NodeOPCUA Server1",
                buildNumber: "7658",
                buildDate: new Date(2020, 6, 14),
            },
        });

        await server.initialize();
        const stopSignals = constructAddressSpace(server);
        await server.start();
        console.log("Server is now listening ... ( press CTRL+C to stop) ");
        server.endpoints[0].endpointDescriptions().forEach(function (endpoint) {
            console.log(
                endpoint.endpointUrl,
                endpoint.securityMode.toString(),
                endpoint.securityPolicyUri.toString(),
            );
        });

        // A second signal during shutdown must not start it again.
        let stopping = false;
        async function shutdown(signal) {
            if (stopping) {
                return;
            }
            stopping = true;
            console.log(`${signal} received, shutting down`);
            try {
                stopSignals();
                await server.shutdown();
                console.log("terminated");
                process.exit(0);
            } catch (err) {
                console.log(err);
                process.exit(1);
            }
        }

        // Ctrl+C sends SIGINT. Docker stop sends SIGTERM.
        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
})();
