import { EventEmitter } from 'events';
import piControl from './piControl.js';
import { jspack } from 'jspack';

const ProductType = {
    DIO: 96,
    DI: 97,
    DO: 98,
    AIO: 103,
    MIO: 118,
    RO: 137,
};

class IO extends EventEmitter {
    constructor(revpi, name, offset, length, bit, type) {
        super();
        this.revpi = revpi;
        this.name = name;
        this.offset = offset;
        this.length = length;
        this.bit = bit;
        this.type = type; // 'input' or 'output'
    }

    get value() {
        if (this.length === 1 && this.bit !== undefined) {
            const byte = this.revpi.processImage.readUInt8(this.offset);
            return (byte & (1 << this.bit)) !== 0;
        } else {
            const buffer = Buffer.alloc(this.length);
            this.revpi.processImage.copy(buffer, 0, this.offset, this.offset + this.length);
            return buffer;
        }
    }

    set value(newValue) {
        const oldValue = this.value;
        if (this.length === 1 && this.bit !== undefined) {
            let byte = this.revpi.processImage.readUInt8(this.offset);
            if (newValue) {
                byte |= (1 << this.bit);
            } else {
                byte &= ~(1 << this.bit);
            }
            this.revpi.processImage.writeUInt8(byte, this.offset);
        } else {
            const buffer = Buffer.from(newValue);
            buffer.copy(this.revpi.processImage, this.offset);
        }

        if (oldValue !== newValue) {
            this.emit('change', { value: newValue, oldValue });
        }
    }

    reg_event(callback) {
        this.on('change', (data) => callback(this.name, data.value));
    }

    replace_io(name, frm, options = {}) {
        const newIO = new StructIO(this, name, frm, options);
        this.revpi.io.add(newIO);
        delete this.revpi.io[this.name];
    }
}

class IntIO extends IO {
    constructor(revpi, name, offset, length, bit, type, signed = false, byteorder = 'little') {
        super(revpi, name, offset, length, bit, type);
        this.signed = signed;
        this.byteorder = byteorder;
    }

    get value() {
        const buffer = super.value;
        if (this.byteorder === 'little') {
            return this.signed ? buffer.readIntLE(0, this.length) : buffer.readUIntLE(0, this.length);
        } else {
            return this.signed ? buffer.readIntBE(0, this.length) : buffer.readUIntBE(0, this.length);
        }
    }

    set value(newValue) {
        const buffer = Buffer.alloc(this.length);
        if (this.byteorder === 'little') {
            this.signed ? buffer.writeIntLE(newValue, 0, this.length) : buffer.writeUIntLE(newValue, 0, this.length);
        } else {
            this.signed ? buffer.writeIntBE(newValue, 0, this.length) : buffer.writeUIntBE(newValue, 0, this.length);
        }
        super.value = buffer;
    }
}

class IntIOCounter extends IntIO {
    constructor(revpi, name, offset, length, bit, type, signed = false, byteorder = 'little', counterId, devicePosition) {
        super(revpi, name, offset, length, bit, type, signed, byteorder);
        this.counterId = counterId;
        this.devicePosition = devicePosition;
    }

    reset() {
        if (this.revpi.options.simulator) {
            console.log(`Simulating counter reset for ${this.name}`);
            return;
        }
        const buffer = Buffer.alloc(4);
        buffer.writeUInt8(this.devicePosition, 0);
        buffer.writeUInt16LE(1 << this.counterId, 2);
        piControl.call(19220 /* PICONTROL_IOC_COUNTER_RESET */, buffer);
    }
}

class RelaisOutput extends IO {
    constructor(revpi, name, offset, length, bit, type, devicePosition) {
        super(revpi, name, offset, length, bit, type);
        this.devicePosition = devicePosition;
    }

    get_switching_cycles() {
        if (this.revpi.options.simulator) {
            console.log(`Simulating get_switching_cycles for ${this.name}`);
            return 0;
        }
        const buffer = Buffer.alloc(17);
        buffer.writeUInt8(this.devicePosition, 0);
        piControl.call(19229 /* PICONTROL_IOC_RELAY_GET_CYCLES */, buffer);
        if (this.bit !== undefined) {
            return buffer.readUInt32LE(1 + this.bit * 4);
        } else {
            const cycles = [];
            for (let i = 0; i < 4; i++) {
                cycles.push(buffer.readUInt32LE(1 + i * 4));
            }
            return cycles;
        }
    }
}

class StructIO extends IO {
    constructor(parentio, name, frm, options) {
        super(parentio.revpi, name, parentio.offset, parentio.length, parentio.bit, parentio.type);
        this.frm = frm;
        this.options = options;
    }

    get value() {
        const buffer = super.value;
        const byteorder = this.options.byteorder === 'big' ? '>' : '<';
        return jspack.Unpack(byteorder + this.frm, buffer)[0];
    }

    set value(newValue) {
        const byteorder = this.options.byteorder === 'big' ? '>' : '<';
        const buffer = Buffer.from(jspack.Pack(byteorder + this.frm, [newValue]));
        super.value = buffer;
    }
}

class IOList {
    constructor() {}

    add(io) {
        if (this[io.name]) {
            console.warn(`Duplicate IO name: ${io.name}. It will be overwritten.`);
        }
        this[io.name] = io;
    }
}

class Device {
    constructor(name, position, offset, length, inputs, outputs) {
        this.name = name;
        this.position = position;
        this.offset = offset;
        this.length = length;
        this.inputs = inputs;
        this.outputs = outputs;
    }
}

export { Device, IO, IntIO, IntIOCounter, RelaisOutput, StructIO, IOList, ProductType };