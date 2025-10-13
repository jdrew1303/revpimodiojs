import config from './config.js';
import piControl from './piControl.js';
import { Device, IO, IOList } from './devices.js';

class RevPiModIO {
    constructor(options = {}) {
        this.options = {
            autorefresh: false,
            monitoring: false,
            syncoutputs: true,
            simulator: false,
            debug: true,
            ...options,
        };

        this.config = null;
        this.devices = [];
        this.io = new IOList();
        this.looping = false;

        this._init();
    }

    _init() {
        try {
            this.config = config.load();
            if (this.options.debug) {
                console.log('piCtory configuration loaded successfully.');
            }
        } catch (e) {
            console.error(e.message);
            // In a real scenario, we might want to handle this more gracefully
            process.exit(1);
        }

        piControl.open(this.options.simulator);

        this._createDevices();
        this._startAutorefresh();
    }

    _createDevices() {
        if (!this.config || !this.config.Devices) {
            return;
        }

        for (const devConfig of this.config.Devices) {
            // This is a simplified version of the device creation logic
            const device = new Device(
                devConfig.name,
                devConfig.position,
                devConfig.offset,
                devConfig.length,
                devConfig.inputs,
                devConfig.outputs
            );
            this.devices.push(device);

            for (const input of device.inputs) {
                const io = new IO(input.name, input.offset, input.length, input.bit, 'input');
                this.io.add(io);
            }

            for (const output of device.outputs) {
                const io = new IO(output.name, output.offset, output.length, output.bit, 'output');
                this.io.add(io);
            }
        }
    }

    exit() {
        this.looping = false;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (!this.options.simulator) {
            piControl.close();
        }
    }

    readprocimg() {
        if (this.options.simulator) {
            // In simulator mode, we don't need to do anything here as the values are in memory
        } else {
            // This will be implemented with ioctl calls
            console.log('Reading from process image...');
        }
    }

    writeprocimg() {
        if (this.options.simulator) {
            // In simulator mode, we don't need to do anything here as the values are in memory
        } else {
            // This will be implemented with ioctl calls
            console.log('Writing to process image...');
        }
    }

    _startAutorefresh() {
        if (this.options.autorefresh) {
            this.refreshInterval = setInterval(() => {
                this.readprocimg();
                this.writeprocimg();
            }, 100); // Default to 100ms, can be made configurable
        }
    }

    async cycleloop(func, cycletime = 50) {
        this.looping = true;
        while (this.looping) {
            const start = Date.now();
            this.readprocimg();
            await func();
            this.writeprocimg();
            const end = Date.now();
            const delay = cycletime - (end - start);
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

}

export default RevPiModIO;