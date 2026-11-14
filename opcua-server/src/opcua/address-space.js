"use strict";
const { addMemoryNotes } = require("./nodes/memory");
const { addCpuNodes } = require("./nodes/cpu");
const { addUptimeNodes } = require("./nodes/uptime");
const { addDiskNodes } = require("./nodes/disk");

// Not getOwnNamespace(). Its URI has the host name_ and Docker changes it
const NAMESPACE_URI = "urn:iiot-edge-gateway";

function constructAddressSpace(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.registerNamespace(NAMESPACE_URI);

    const gateway = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        nodeId: "s=Gateway",
        browseName: "Gateway",
    });

    // To add a signal, add one line here
    addMemoryNotes(namespace, gateway);
    const stopCpu = addCpuNodes(namespace, gateway);
    addUptimeNodes(namespace, gateway);
    addDiskNodes(namespace, gateway);

    // So no timer writes to a server that is already closed
    return () => {
        stopCpu();
    };
}

module.exports = { constructAddressSpace };
