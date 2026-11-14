const { before, after } = require("node:test");
const { connect, disconnect } = require("./setup");

before(connect);
after(disconnect);

// To add a signal, add one line here
require("./signals/memory");
require("./signals/cpu");
require("./signals/uptime");
