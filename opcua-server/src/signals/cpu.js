"use strict";
const os = require("os");

// The counters are totals since boot, so one reading says nothing on its own.
function readCpuTimes() {
    let idle = 0;
    let total = 0;
    for (const { times } of os.cpus()) {
        idle += times.idle;
        total += times.user + times.nice + times.sys + times.idle + times.irq;
    }
    return { idle, total };
}

// Returns null when no time has passed. This should not happen with a 1 s
// timer, but we never divide by zero.
function cpuUsagePercent(previous, current) {
    const idleDelta = current.idle - previous.idle;
    const totalDelta = current.total - previous.total;
    if (totalDelta <= 0) {
        return null;
    }
    return 100 * (1 - idleDelta / totalDelta);
}

module.exports = { readCpuTimes, cpuUsagePercent };
