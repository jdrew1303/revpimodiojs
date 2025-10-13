import { EventEmitter } from 'events';
import piControl from './piControl.js';

class IO extends EventEmitter {
    constructor(name, offset, length, bit, type) {
        super();
        this.name = name;
        this.offset = offset;
        this.length = length;
        this.bit = bit;
        this.type = type; // 'input' or 'output'
        this._value = null;
    }

    get value() {
        if (this.length === 1 && this.bit !== undefined) {
            const buffer = Buffer.alloc(4);
            buffer.writeUInt16LE(this.offset, 0);
            buffer.writeUInt8(this.bit, 2);
            piControl.call(19218 /* PICONTROL_IOC_BIT_READ */, buffer);
            return buffer.readUInt8(3) !== 0;
        } else {
            // Simplified for now, will need to handle different data types
            const buffer = Buffer.alloc(this.length);
            piControl.mockProcessImage.copy(buffer, 0, this.offset, this.offset + this.length);
            return buffer;
        }
    }

    set value(newValue) {
        const oldValue = this.value;
        if (this.length === 1 && this.bit !== undefined) {
            const buffer = Buffer.alloc(4);
            buffer.writeUInt16LE(this.offset, 0);
            buffer.writeUInt8(this.bit, 2);
            buffer.writeUInt8(newValue ? 1 : 0, 3);
            piControl.call(newValue ? 19216 /* PICONTROL_IOC_BIT_SET */ : 19217 /* PICONTROL_IOC_BIT_RESET */, buffer);
        } else {
            // Simplified for now, will need to handle different data types
            const buffer = Buffer.from(newValue);
            buffer.copy(piControl.mockProcessImage, this.offset);
        }

        if (oldValue !== newValue) {
            this.emit('change', { value: newValue, oldValue });
        }
    }

    reg_event(callback) {
        this.on('change', (data) => callback(this.name, data.value));
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

export { Device, IO, IOList };