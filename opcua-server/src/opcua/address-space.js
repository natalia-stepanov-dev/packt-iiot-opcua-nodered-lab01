"use strict";
const { Variant, DataType, StatusCodes } = require("node-opcua");
const { readCpuTimes, cpuUsagePercent } = require("../signals/cpu");
const { memoryUsagePercent } = require("../signals/memory");

function constructAddressSpace(server) {
    const namespace = server.engine.addressSpace.getOwnNamespace();

    const myDevice = namespace.addFolder("ObjectsFolder", {
        browseName: "MyDevice",
    });

    namespace.addVariable({
        componentOf: myDevice,
        nodeId: "b=1020ffab",
        browseName: "Percentage Memory Used",
        dataType: "Double",
        minimumSamplingInterval: 1000,
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: memoryUsagePercent() }),
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
