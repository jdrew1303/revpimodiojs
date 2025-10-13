import fs from 'fs';
import config from './config.js';
import piControl from './piControl.js';
import { Device, IO, IntIO, IntIOCounter, RelaisOutput, IOList, ProductType } from './devices.js';
import configparser from 'configparser';

class RevPiModIO {
    constructor(options = {}) {
        this.options = {
            autorefresh: false,
            monitoring: false,
            syncoutputs: true,
            simulator: false,
            debug: true,
            replace_io_file: null,
            ...options,
        };

        this.config = null;
        this.devices = [];
        this.io = new IOList();
        this.looping = false;
        this.processImage = null;
        this.length = 0;

        this.handlesignalend();
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
        this.processImage = Buffer.alloc(this.length);
        if (this.options.replace_io_file) {
            this._configure_replace_io();
        }
        this._startAutorefresh();
    }

    _configure_replace_io() {
        const cp = new configparser();
        cp.read(this.options.replace_io_file);
        const sections = cp.sections();
        for (const section of sections) {
            if (section === 'DEFAULT') {
                continue;
            }
            const parentio = cp.get(section, 'replace');
            const frm = cp.get(section, 'frm');
            const options = {};
            for (const [key, value] of Object.entries(cp.items(section))) {
                if (key !== 'replace' && key !== 'frm') {
                    options[key] = value;
                }
            }
            this.io[parentio].replace_io(section, frm, options);
        }
    }

    _createDevices(devices = null) {
        if (!this.config || !this.config.Devices) {
            return;
        }

        const deviceList = devices || this.config.Devices;

        for (const devConfig of deviceList) {
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

            if (devConfig.offset + devConfig.length > this.length) {
                this.length = devConfig.offset + devConfig.length;
            }

            const isDI = devConfig.productType === ProductType.DI || devConfig.productType === ProductType.DIO;
            const isRO = devConfig.productType === ProductType.RO;

            for (const input of device.inputs) {
                let io;
                if (isDI && devConfig.inputs.find(i => i.name === input.name.replace('Counter', ''))) {
                    const counterId = parseInt(input.name.replace(/[^0-9]/g, '')) - 1;
                    io = new IntIOCounter(this, input.name, devConfig.offset + input.offset, input.length, input.bit, 'input', false, 'little', counterId, devConfig.position);
                } else if (input.length > 1) {
                    io = new IntIO(this, input.name, devConfig.offset + input.offset, input.length, input.bit, 'input');
                } else {
                    io = new IO(this, input.name, devConfig.offset + input.offset, input.length, input.bit, 'input');
                }
                this.io.add(io);
            }

            for (const output of device.outputs) {
                let io;
                if (isRO) {
                    io = new RelaisOutput(this, output.name, devConfig.offset + output.offset, output.length, output.bit, 'output', devConfig.position);
                } else if (output.length > 1) {
                    io = new IntIO(this, output.name, devConfig.offset + output.offset, output.length, output.bit, 'output');
                } else {
                    io = new IO(this, output.name, devConfig.offset + output.offset, output.length, output.bit, 'output');
                }
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
            fs.readSync(piControl.fd, this.processImage, 0, this.length, 0);
        }
    }

    writeprocimg() {
        if (this.options.simulator) {
            // In simulator mode, we don't need to do anything here as the values are in memory
        } else {
            fs.writeSync(piControl.fd, this.processImage, 0, this.length, 0);
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

    handlesignalend() {
        process.on('SIGINT', () => this.exit());
        process.on('SIGTERM', () => this.exit());
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

class RevPiModIOSelected extends RevPiModIO {
    constructor(deviceselection, options = {}) {
        super(options);
        this.deviceselection = deviceselection;
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

        const selectedDevices = this.config.Devices.filter(dev => {
            if (Array.isArray(this.deviceselection)) {
                return this.deviceselection.includes(dev.name) || this.deviceselection.includes(dev.position);
            } else {
                return this.deviceselection === dev.name || this.deviceselection === dev.position;
            }
        });

        this._createDevices(selectedDevices);
        this.processImage = Buffer.alloc(this.length);
        if (this.options.replace_io_file) {
            this._configure_replace_io();
        }
        this._startAutorefresh();
    }
}


class RevPiModIODriver extends RevPiModIOSelected {
    constructor(virtdev, options = {}) {
        super(virtdev, { ...options, simulator: true });
    }
}

export { RevPiModIO, RevPiModIOSelected, RevPiModIODriver };