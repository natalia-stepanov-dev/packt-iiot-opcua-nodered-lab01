"use strict";

// A sine wave from the course. It is not a real sensor.
function simulatedTemperature(now = Date.now()) {
    return 10.0 + 10.0 * Math.sin(now / 10000.0);
}

module.exports = { simulatedTemperature };
