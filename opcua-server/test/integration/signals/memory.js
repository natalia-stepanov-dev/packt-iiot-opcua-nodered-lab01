const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { DataType, StatusCodes, standardUnits } = require("node-opcua");
const { readValue, writeDouble, readUnitId } = require("../setup");

const NODE = "Gateway.Memory.Usage";

describe("Memory usage", () => {
    test("is a Double from 0 to 100", async () => {
        const dataValue = await readValue(NODE);
        assert.equal(dataValue.statusCode.value, StatusCodes.Good.value);
        assert.equal(dataValue.value.dataType, DataType.Double);
        assert.ok(dataValue.value.value >= 0 && dataValue.value.value <= 100);
    });

    // A write once said Good and did nothing
    test("cannot be written", async () => {
        const status = await writeDouble(NODE, 5);
        assert.equal(status.value, StatusCodes.BadNotWritable.value);
    });

    // Node-RED can read the unit and show it next to the value.
    test("is in percent", async () => {
        assert.equal(await readUnitId(NODE), standardUnits.percent.unitId);
    });
});
