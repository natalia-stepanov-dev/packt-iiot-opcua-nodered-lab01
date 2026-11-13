"use strict";
const os = require("os");

function memoryUsagePercent() {
    return 100 * (1 - os.freemem() / os.totalmem());
}

module.exports = { memoryUsagePercent };
