"use strict";
const { DataType, StatusCodes, standardUnits } = require("node-opcua");
const { readCpuTimes, cpuUsagePercent } = require("../../signals/cpu");

const SAMPLE_INTERVAL_MS = 1000;

function addCpuNodes(namespace, gateway) {
    const cpu = namespace.addObject({
        componentOf: gateway,
        nodeId: "s=Gateway.Cpu",
        browseName: "Cpu",
    });

    // Not getter. One mesurement takes 1 s, and the server would freeze
    const usage = namespace.addAnalogDataItem({
        componentOf: cpu,
        nodeId: "s=Gateway.Cpu.Usage",
        browseName: "Usage",
        dataType: "Double",
        engineeringUnits: standardUnits.percent,
        engineeringUnitsRange: { low: 0, high: 100 },
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead",
        minimumSamplingInterval: SAMPLE_INTERVAL_MS,
    });

    // A 0 here would look like a real value
    usage.setValueFromSource(
        { dataType: DataType.Double, value: 0 },
        StatusCodes.BadWaitingForInitialData,
    );

    let previousTimes = readCpuTimes();
    const timer = setInterval(() => {
        const currentTimes = readCpuTimes();
        const percent = cpuUsagePercent(previousTimes, currentTimes);
        previousTimes = currentTimes;
        if (percent === null) {
            return;
        }
        usage.setValueFromSource(
            { dataType: DataType.Double, value: percent },
            StatusCodes.Good,
            new Date(),
        );
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(timer);
}

module.exports = { addCpuNodes };
