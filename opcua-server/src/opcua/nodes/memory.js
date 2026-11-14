"use strict";
const { Variant, DataType, standardUnits } = require("node-opcua");
const { memoryUsagePercent } = require("../../signals/memory");

function addMemoryNotes(namespace, gateway) {
    const memory = namespace.addObject({
        componentOf: gateway,
        nodeId: "s=Gateway.Memory",
        browseName: "Memory",
    });

    // A getter is fine here. Free memory is read at once
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
}

module.exports = { addMemoryNotes };
