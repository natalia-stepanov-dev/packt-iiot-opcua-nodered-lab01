"use strict";
const { Variant, DataType, standardUnits } = require("node-opcua");
const { uptimeSeconds } = require("../../signals/uptime");

function addUptimeNodes(namespace, gateway) {
    //AnalogItem needs a range. Uptime has none, so we use AnalogUnitType
    const uptime = namespace.addVariable({
        componentOf: gateway,
        typeDefinition: "AnalogUnitType",
        nodeId: "s=Gateway.Uptime",
        browseName: "Uptime",
        dataType: "Double",
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead",
        minimumSamplingInterval: 1000,
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: uptimeSeconds() }),
        },
    });

    // No node-opcua helper for this type, so we add the unit by hand
    namespace.addVariable({
        propertyOf: uptime,
        nodeId: "s=Gateway.Uptime.EngineeringUnits",
        browseName: { name: "EngineeringUnits", namespaceIndex: 0 },
        dataType: "EUInformation",
        value: { dataType: DataType.ExtensionObject, value: standardUnits.second },
    });
}

module.exports = { addUptimeNodes };
