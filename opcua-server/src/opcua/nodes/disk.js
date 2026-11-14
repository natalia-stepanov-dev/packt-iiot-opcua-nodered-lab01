"use strict";
const { Variant, DataType, standardUnits } = require("node-opcua");
const { readDiskStats, diskUsagePercent } = require("../../signals/disk");

// The OS lives here. If it is full, the gateway stops working
const DISK_PATH = "/";

function addDiskNodes(namespace, gateway) {
    const disk = namespace.addObject({
        componentOf: gateway,
        nodeId: "s=Gateway.Disk",
        browseName: "Disk",
    });

    namespace.addAnalogDataItem({
        componentOf: disk,
        nodeId: "s=Gateway.Disk.Usage",
        browseName: "Usage",
        dataType: "Double",
        engineeringUnits: standardUnits.percent,
        engineeringUnitsRange: { low: 0, hight: 100 },
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead",
        minimumSamplingInterval: 1000,
        value: {
            get: () =>
                new Variant({
                    dataType: DataType.Double,
                    value: diskUsagePercent(readDiskStats(DISK_PATH)),
                }),
        },
    });
}

module.exports = { addDiskNodes };
