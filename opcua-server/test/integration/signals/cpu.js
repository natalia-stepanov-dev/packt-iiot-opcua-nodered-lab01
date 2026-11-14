const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { DataType, StatusCodes, standardUnits } = require("node-opcua");
const { readValue, writeDouble, readUnitId } = require("../setup");

const NODE = "Gateway.Cpu.Usage";

describe("CPU usage", () => {
    //No value in the first second. We wait up to 3 s.
    test("becomes Good and is from 0 to 100", async () => {
        let dataValue = await readValue(NODE);
        for (let i = 0; i < 15 && dataValue.statusCode.value !== StatusCodes.Good.value; i++) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            dataValue = await readValue(NODE);
        }
        assert.equal(dataValue.statusCode.value, StatusCodes.Good.value);
        assert.equal(dataValue.value.dataType, DataType.Double);
        assert.ok(dataValue.value.value >= 0 && dataValue.value.value <= 100);
    });

    // The server measures this. A client must not change it.
    test("cannot be written", async () => {
        const status = await writeDouble(NODE, 5);
        assert.equal(status.value, StatusCodes.BadNotWritable.value);
    });

    test("is in percent", async () => {
        assert.equal(await readUnitId(NODE), standardUnits.percent.unitId);
    });
});
