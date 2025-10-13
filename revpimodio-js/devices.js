import { EventEmitter } from 'events';
import piControl from './piControl.js';

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