import assert from 'assert';
import RevPiModIO from '../revpimodio.js';
import config from '../config.js';

import path from 'path';

// Mock the config loader to use our test config
config.findConfig = () => path.resolve(process.cwd(), 'revpimodio-js/test/mock-config.rsc');

async function testRevPiModIO() {
    console.log('Running RevPiModIO tests...');

    const rpi = new RevPiModIO({ simulator: true });

    assert.strictEqual(rpi.devices.length, 1, 'Should load one device');
    assert.ok(rpi.io.Input1, 'Input1 should exist');
    assert.ok(rpi.io.Output1, 'Output1 should exist');

    rpi.io.Output1.value = true;
    assert.strictEqual(rpi.io.Output1.value, true, 'Output1 should be true');

    rpi.io.Output1.value = false;
    assert.strictEqual(rpi.io.Output1.value, false, 'Output1 should be false');

    let eventFired = false;
    rpi.io.Output1.reg_event((name, value) => {
        eventFired = true;
        assert.strictEqual(name, 'Output1', 'Event should fire with correct name');
        assert.strictEqual(value, true, 'Event should fire with correct value');
    });

    rpi.io.Output1.value = true;
    assert.strictEqual(eventFired, true, 'Event should have fired');


    console.log('RevPiModIO tests passed.');
}

testRevPiModIO();