"use strict";
const {
    OPCUAServer,
    Variant,
    DataType,
    nodesets,
    StatusCodes,
    VariantArrayType,
} = require("node-opcua");
const os = require("os");

/**
 * @param server {OPCUAServer} server
 */
function constructAddressSpace(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    // we create a new folder under RootFolder
    const myDevice = namespace.addFolder("ObjectsFolder", {
        browseName: "MyDevice",
    });

    // now let's add first variable in folder
    // the addVariableInFolder
    const variable1 = 10.0;

    server.nodeVariable1 = namespace.addVariable({
        componentOf: myDevice,
        nodeId: "s=Temperature",
        browseName: "Temperature",
        dataType: "Double",
        value: {
            get: () => {
                const t = new Date() / 10000.0;
                const value = variable1 + 10.0 * Math.sin(t);
                return new Variant({ dataType: DataType.Double, value: value });
            },
        },
    });

    const nodeVariable2 = namespace.addVariable({
        componentOf: myDevice,
        browseName: "MyVariable2",
        dataType: "String",
    });
    nodeVariable2.setValueFromSource({
        dataType: DataType.String,
        value: "Learn Node-OPCUA ! Read https://leanpub.com/node-opcuabyexample",
    });

    const nodeVariable3 = namespace.addVariable({
        componentOf: myDevice,
        browseName: "MyVariable3",
        dataType: "Double",
        arrayDimensions: [3],
        accessLevel: "CurrentRead | CurrentWrite",
        userAccessLevel: "CurrentRead | CurrentWrite",
        valueRank: 1,
    });
    nodeVariable3.setValueFromSource({
        dataType: DataType.Double,
        arrayType: VariantArrayType.Array,
        value: [1.0, 2.0, 3.0],
    });

    namespace.addVariable({
        componentOf: myDevice,
        nodeId: "b=1020ffab",
        browseName: "Percentage Memory Used",
        dataType: "Double",
        minimumSamplingInterval: 1000,
        value: {
            get: () => {
                // const value = process.memoryUsage().heapUsed / 1000000;
                const percentageMemUsed = 1.0 - os.freemem() / os.totalmem();
                const value = percentageMemUsed * 100;
                return new Variant({ dataType: DataType.Double, value: value });
            },
        },
    });

    // Sampled by a timer below. Measuring inside a getter blocked
    // the server for 1 s per read.
    const cpuNode = namespace.addVariable({
        componentOf: myDevice,
        nodeId: "s=CPU",
        browseName: "Percentage CPU Used",
        dataType: "Double",
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead",
        minimumSamplingInterval: 1000,
    });

    // Until the first sample clients see BadWaitingForInitialData,
    // not a 0 that looks real.
    cpuNode.setValueFromSource(
        { dataType: DataType.Double, value: 0 },
        StatusCodes.BadWaitingForInitialData,
    );

    let previousTimes = readCpuTimes();

    // One sample per second matches minimumSamplingInterval above.
    const cpuTimer = setInterval(() => {
        const currentTimes = readCpuTimes();
        const idleDelta = currentTimes.idle - previousTimes.idle;
        const totalDelta = currentTimes.total - previousTimes.total;
        previousTimes = currentTimes;

        // Shouldn't happen with a 1 s interval, but never divide by zero.
        if (totalDelta <= 0) {
            return;
        }

        const usagePercent = 100 * (1 - idleDelta / totalDelta);
        cpuNode.setValueFromSource(
            { dataType: DataType.Double, value: usagePercent },
            StatusCodes.Good,
            new Date(),
        );
    }, 1000);

    // Without unref() the process keeps running after Ctrl+C.
    cpuTimer.unref();
}

// The counters are totals since boot, so one reading says nothing on its own.
function readCpuTimes() {
    let idle = 0;
    let total = 0;
    for (const { times } of os.cpus()) {
        idle += times.idle;
        total += times.user + times.nice + times.sys + times.idle + times.irq;
    }
    return { idle, total };
}

(async () => {
    try {
        // Let create an instance of OPCUAServer
        const server = new OPCUAServer({
            port: 26543, // the port of the listening socket of the server

            nodeset_filename: [nodesets.standard, nodesets.di],
            buildInfo: {
                productName: "Sample NodeOPCUA Server1",

                buildNumber: "7658",
                buildDate: new Date(2020, 6, 14),
            },
        });

        await server.initialize();

        constructAddressSpace(server);

        // we can now start the server
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
