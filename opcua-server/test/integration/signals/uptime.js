const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { DataType, StatusCodes, standardUnits } = require("node-opcua");
const { readValue, writeDouble, readUnitId } = require("../setup");

const NODE = "Gateway.Uptime";

describe("Uptime", () => {
    // No upper limit. A gateway can run for years
    test("is a Double above 0", async () => {
        const dataValue = await readValue(NODE);
        assert.equal(dataValue.statusCode.value, StatusCodes.Good.value);
        assert.equal(dataValue.value.dataType, DataType.Double);
        assert.ok(dataValue.value.value > 0);
    });

    // The server counts this. A client must not change it
    test("cannot be written", async () => {
        const status = await writeDouble(NODE, 5);
        assert.equal(status.value, StatusCodes.BadNotWritable.value);
    });

    test("is in seconds", async () => {
        assert.equal(await readUnitId(NODE), standardUnits.second.unitId);
    });
});
