import assert from 'assert';
import config from '../config.js';
import path from 'path';
import { RevPiModIO, RevPiModIOSelected, RevPiModIODriver } from '../revpimodio.js';

// Mock the config loader to use our test config
config.findConfig = () => path.resolve(process.cwd(), 'revpimodio-js/test/mock-config.rsc');

async function testRevPiModIO() {
    console.log('Running RevPiModIO tests...');

    const rpi = new RevPiModIO({ simulator: true });

    assert.strictEqual(rpi.devices.length, 1, 'Should load one device');
    assert.ok(rpi.io.Input1, 'Input1 should exist');
    assert.ok(rpi.io.Output1, 'Output1 should exist');
    assert.ok(rpi.io.InputCounter1, 'InputCounter1 should exist');

    rpi.io.Output1.value = true;
    assert.strictEqual(rpi.io.Output1.value, true, 'Output1 should be true');

    rpi.io.Output1.value = false;
    assert.strictEqual(rpi.io.Output1.value, false, 'Output1 should be false');

    rpi.io.InputCounter1.value = 12345;
    assert.strictEqual(rpi.io.InputCounter1.value, 12345, 'InputCounter1 should be 12345');
    rpi.io.InputCounter1.reset();


    let eventFired = false;
    rpi.io.Output1.reg_event((name, value) => {
        eventFired = true;
        assert.strictEqual(name, 'Output1', 'Event should fire with correct name');
        assert.strictEqual(value, true, 'Event should fire with correct value');
    });

    rpi.io.Output1.value = true;
    assert.strictEqual(eventFired, true, 'Event should have fired');

    let cycleCount = 0;
    const cyclePromise = rpi.cycleloop(async () => {
        cycleCount++;
        if (cycleCount > 2) {
            rpi.exit();
        }
    }, 10);

    await cyclePromise;
    assert.strictEqual(cycleCount, 3, 'Cycleloop should run 3 times');

    console.log('RevPiModIO tests passed.');
}

async function testRevPiModIOSelected() {
    console.log('Running RevPiModIOSelected tests...');

    const rpi = new RevPiModIOSelected('MyDevice', { simulator: true });

    assert.strictEqual(rpi.devices.length, 1, 'Should load one device');
    assert.ok(rpi.io.Input1, 'Input1 should exist');

    const rpi2 = new RevPiModIOSelected(['MyDevice'], { simulator: true });
    assert.strictEqual(rpi2.devices.length, 1, 'Should load one device');

    const rpi3 = new RevPiModIOSelected('NonExistentDevice', { simulator: true });
    assert.strictEqual(rpi3.devices.length, 0, 'Should load zero devices');


    console.log('RevPiModIOSelected tests passed.');
}

async function testRevPiModIODriver() {
    console.log('Running RevPiModIODriver tests...');

    const rpi = new RevPiModIODriver('MyDevice', { simulator: true });

    assert.strictEqual(rpi.devices.length, 1, 'Should load one device');
    assert.ok(rpi.io.Input1, 'Input1 should exist');
    assert.strictEqual(rpi.options.simulator, true, 'Simulator should be enabled');

    console.log('RevPiModIODriver tests passed.');
}

async function testReplaceIO() {
    console.log('Running ReplaceIO tests...');

    const rpi = new RevPiModIO({ simulator: true });
    rpi.io.Output1.replace_io('MyFloat', 'f');
    assert.ok(rpi.io.MyFloat, 'MyFloat should exist');
    assert.strictEqual(rpi.io.Output1, undefined, 'Output1 should not exist');

    const rpi2 = new RevPiModIO({ simulator: true, replace_io_file: path.resolve(process.cwd(), 'revpimodio-js/test/replace_ios.conf') });
    assert.ok(rpi2.io.MyFloat, 'MyFloat should exist');
    assert.strictEqual(rpi2.io.Output1, undefined, 'Output1 should not exist');

    console.log('ReplaceIO tests passed.');
}

async function runTests() {
    await testRevPiModIO();
    await testRevPiModIOSelected();
    await testRevPiModIODriver();
    await testReplaceIO();
}

runTests();