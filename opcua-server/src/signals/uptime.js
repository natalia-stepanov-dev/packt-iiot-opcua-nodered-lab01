"use strict";
const os = require("os");

function uptimeSeconds() {
    return os.uptime();
}

module.exports = { uptimeSeconds };
