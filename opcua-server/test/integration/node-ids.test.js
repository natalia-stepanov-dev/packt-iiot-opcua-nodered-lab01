// Node-RED reads these NodeIds. This test keeps them the same
// while we change the server code.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { OPCUAClient, AttributeIds, DataType, StatusCodes, makeBrowsePath } = require("node-opcua");

const ENDPOINT = "opc.tcp://localhost:26543";
const SERVER_FILE = path.join(__dirname, "..", "..", "src", "main.js");
const NAMESPACE_URI = "urn:iiot-edge-gateway";

let serverProcess;
let client;
let session;
let nsIndex;

// We start the real server as a separate process. So the test does not
// depend on how the server code is built inside.
function startServer() {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [SERVER_FILE], {
            stdio: ["ignore", "pipe", "inherit"],
        });
        const timer = setTimeout(() => reject(new Error("Server did not start in 20 s")), 20000);
        child.stdout.on("data", (chunk) => {
            if (chunk.toString().includes("Server is now listening")) {
                clearTimeout(timer);
                resolve(child);
            }
        });
        child.on("exit", (code) => {
            clearTimeout(timer);
            reject(new Error(`Server stopped with code ${code}`));
        });
    });
}

function readValue(name) {
    return session.read({ nodeId: `ns=${nsIndex};s=${name}`, attributeId: AttributeIds.Value });
}

before(async () => {
    serverProcess = await startServer();
    client = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: { maxRetry: 0 },
    });
    await client.connect(ENDPOINT);
    session = await client.createSession();
    // The server gives out namespace numbers, so we never write ns=2
    // by hand. We look the number up by URI, like a real client.
    const namespaceArray = await session.read({
        nodeId: "ns=0;i=2255",
        attributeId: AttributeIds.Value,
    });
    nsIndex = namespaceArray.value.value.indexOf(NAMESPACE_URI);
    assert.notEqual(nsIndex, -1, `Namespace ${NAMESPACE_URI} not found`);
});

after(async () => {
    if (session) await session.close();
    if (client) await client.disconnect();
    if (serverProcess) serverProcess.kill();
});

test("Memory usage is a Double from 0 to 100", async () => {
    const dataValue = await readValue("Gateway.Memory.Usage");
    assert.equal(dataValue.statusCode.value, StatusCodes.Good.value);
    assert.equal(dataValue.value.dataType, DataType.Double);
    assert.ok(dataValue.value.value >= 0 && dataValue.value.value <= 100);
});

// The first CPU sample comes after about 1 s. Before that the status is
// BadWaitingForInitialData, so we wait a little.
test("CPU usage becomes Good and is from 0 to 100", async () => {
    let dataValue = await readValue("Gateway.Cpu.Usage");
    for (let i = 0; i < 15 && dataValue.statusCode.value !== StatusCodes.Good.value; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        dataValue = await readValue("Gateway.Cpu.Usage");
    }
    assert.equal(dataValue.statusCode.value, StatusCodes.Good.value);
    assert.equal(dataValue.value.dataType, DataType.Double);
    assert.ok(dataValue.value.value >= 0 && dataValue.value.value <= 100);
});

test("CPU usage cannot be written", async () => {
    const status = await session.write({
        nodeId: `ns=${nsIndex};s=Gateway.Cpu.Usage`,
        attributeId: AttributeIds.Value,
        value: { value: { dataType: DataType.Double, value: 5 } },
    });
    assert.equal(status.value, StatusCodes.BadNotWritable.value);
});

test("Memory usage cannot be written", async () => {
    const status = await session.write({
        nodeId: `ns=${nsIndex};s=Gateway.Memory.Usage`,
        attributeId: AttributeIds.Value,
        value: { value: { dataType: DataType.Double, value: 5 } },
    });
    assert.equal(status.value, StatusCodes.BadNotWritable.value);
});

// Clients like SCADA read the unit to label values. 20529 is the
// UNECE code for percent.
test("CPU and memory usage are in percent", async () => {
    for (const name of ["Gateway.Cpu.Usage", "Gateway.Memory.Usage"]) {
        const result = await session.translateBrowsePath(
            makeBrowsePath(`ns=${nsIndex};s=${name}`, ".EngineeringUnits"),
        );
        assert.equal(result.statusCode.value, StatusCodes.Good.value, `${name} has no unit`);
        const units = await session.read({
            nodeId: result.targets[0].targetId,
            attributeId: AttributeIds.Value,
        });
        assert.equal(units.value.value.unitId, 20529, name);
    }
});
