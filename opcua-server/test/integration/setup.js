// All tests in signals/ share this server. It takes ~1.5 s to start.
const { spawn } = require("node:child_process");
const path = require("node:path");
const { OPCUAClient, AttributeIds, DataType, StatusCodes, makeBrowsePath } = require("node-opcua");

const ENDPOINT = "opc.tcp://localhost:26543";
const NAMESPACE_URI = "urn:iiot-edge-gateway";
const SERVER_FILE = path.join(__dirname, "..", "..", "src", "main.js");

let serverProcess;
let client;
let session;
let nsIndex;

// Not require(). main.js may call process.exit and stop the tests too.
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

async function connect() {
    serverProcess = await startServer();
    client = OPCUAClient.create({
        endpointMustExist: false,
        connectionStrategy: { maxRetry: 0 },
    });
    await client.connect(ENDPOINT);
    session = await client.createSession();

    // ns=2 today, but the server may give another number.
    const namespaceArray = await session.read({
        nodeId: "ns=0;i=2255",
        attributeId: AttributeIds.Value,
    });
    nsIndex = namespaceArray.value.value.indexOf(NAMESPACE_URI);
    if (nsIndex === -1) {
        throw new Error(`Namespace ${NAMESPACE_URI} not found`);
    }
}

async function disconnect() {
    if (session) await session.close();
    if (client) await client.disconnect();
    if (serverProcess) await serverProcess.kill();
}

function readValue(name) {
    return session.read({ nodeId: `ns=${nsIndex};s=${name}`, attributeId: AttributeIds.Value });
}

function writeDouble(name, value) {
    return session.write({
        nodeId: `ns=${nsIndex};s=${name}`,
        attributeId: AttributeIds.Value,
        value: { value: { dataType: DataType.Double, value } },
    });
}

// Without this, the next lines fail with a vague "undefined".
async function readUnitId(name) {
    const result = await session.translateBrowsePath(
        makeBrowsePath(`ns=${nsIndex};s=${name}`, ".EngineeringUnits"),
    );
    if (result.statusCode.value !== StatusCodes.Good.value) {
        throw new Error(`${name} has no unit`);
    }
    const units = await session.read({
        nodeId: result.targets[0].targetId,
        attributeId: AttributeIds.Value,
    });
    return units.value.value.unitId;
}

module.exports = { connect, disconnect, readValue, writeDouble, readUnitId };
