"use strict";
const { Variant, DataType, StatusCodes, VariantArrayType } = require("node-opcua");
const { readCpuTimes, cpuUsagePercent } = require("../signals/cpu");
const { memoryUsagePercent } = require("../signals/memory");
const { simulatedTemperature } = require("../signals/simulation");

function constructAddressSpace(server) {
    const namespace = server.engine.addressSpace.getOwnNamespace();

    const myDevice = namespace.addFolder("ObjectsFolder", {
        browseName: "MyDevice",
    });

    namespace.addVariable({
        componentOf: myDevice,
        nodeId: "s=Temperature",
        browseName: "Temperature",
        dataType: "Double",
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: simulatedTemperature() }),
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

    // Without unref() the process keeps running after Ctrl+C.
    cpuTimer.unref();
}

module.exports = { constructAddressSpace };
