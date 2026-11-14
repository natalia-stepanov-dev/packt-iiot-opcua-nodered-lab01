"use strict";
const { Variant, DataType, StatusCodes, standardUnits } = require("node-opcua");
const { readCpuTimes, cpuUsagePercent } = require("../signals/cpu");
const { memoryUsagePercent } = require("../signals/memory");

// The URI of ns=1 has the host name in it, and in Docker the host
// name changes. This URI stays the same, so clients can find our
// nodes by it on any machine.
const NAMESPACE_URI = "urn:iiot-edge-gateway";

function constructAddressSpace(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.registerNamespace(NAMESPACE_URI);

    const gateway = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        nodeId: "s=Gateway",
        browseName: "Gateway",
    });
    const cpu = namespace.addObject({
        componentOf: gateway,
        nodeId: "s=Gateway.Cpu",
        browseName: "Cpu",
    });
    const memory = namespace.addObject({
        componentOf: gateway,
        nodeId: "s=Gateway.Memory",
        browseName: "Memory",
    });

    namespace.addAnalogDataItem({
        componentOf: memory,
        nodeId: "s=Gateway.Memory.Usage",
        browseName: "Usage",
        dataType: "Double",
        engineeringUnits: standardUnits.percent,
        engineeringUnitsRange: { low: 0, high: 100 },
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead",
        minimumSamplingInterval: 1000,
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: memoryUsagePercent() }),
        },
    });

    // Sampled by a timer below. Measuring inside a getter blocked
    // the server for 1 s per read.
    const cpuNode = namespace.addAnalogDataItem({
        componentOf: cpu,
        nodeId: "s=Gateway.Cpu.Usage",
        browseName: "Usage",
        dataType: "Double",
        engineeringUnits: standardUnits.percent,
        engineeringUnitsRange: { low: 0, high: 100 },
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
        const usagePercent = cpuUsagePercent(previousTimes, currentTimes);
        previousTimes = currentTimes;
        if (usagePercent === null) {
            return;
        }
        cpuNode.setValueFromSource(
            { dataType: DataType.Double, value: usagePercent },
            StatusCodes.Good,
            new Date(),
        );
    }, 1000);

    // main.js calls this on shutdown, so the timer does not write
    // to a server that is already closed.
    return () => clearInterval(cpuTimer);
}

module.exports = { constructAddressSpace };
