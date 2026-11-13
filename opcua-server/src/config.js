"use strict";

const DEFAULT_PORT = 26543;

function readPort(env) {
    const raw = env.OPCUA_PORT;
    if (raw === undefined || raw === "") {
        return DEFAULT_PORT;
    }
    if (!/^\d+$/.test(raw)) {
        throw new Error(`OPCUA_PORT must be a whole number, got "${raw}"`);
    }
    const port = Number(raw);
    if (port < 1 || port > 65535) {
        throw new Error(`OPCUA_PORT must be from 1 to 65535, got ${port}`);
    }
    return port;
}

// env is a parameter so tests can pass their own values.
function loadConfig(env = process.env) {
    return { port: readPort(env) };
}

module.exports = { loadConfig };
