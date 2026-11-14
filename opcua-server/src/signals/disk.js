"use strict";
const fs = require("fs");

function readDiskStats(path) {
    return fs.statfsSync(path);
}

// Same math as df. Blocks kept for root are not free for us
function diskUsagePercent({ blocks, bfree, bavail }) {
    const used = blocks - bfree;
    return (100 * used) / (used + bavail);
}

module.exports = { readDiskStats, diskUsagePercent };
