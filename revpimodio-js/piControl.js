import fs from 'fs';
import ioctl from 'ioctl-napi';

// Constants for ioctl requests, these will need to be verified against the C headers
const PI_CONTROL_IOC_MAGIC = 'p'.charCodeAt(0);
const PI_CONTROL_IOC_RESET = 1;
const PI_CONTROL_IO_OFFSET_MASK = 0xffff;
const PI_CONTROL_IO_AIN_VALUE = 2;
const PI_CONTROL_IO_AOUT_VALUE = 3;

const PICONTROL_IOC_BIT_SET = 19216;
const PICONTROL_IOC_COUNTER_RESET = 19220;
const PICONTROL_IOC_RELAY_GET_CYCLES = 19229;

class PiControl {
    constructor(devicePath = '/dev/piControl0') {
        this.devicePath = devicePath;
        this.fd = null;
        this.isSimulator = false;
        this.mockProcessImage = null;
    }

    open(isSimulator = false) {
        this.isSimulator = isSimulator;
        if (this.isSimulator) {
            this.mockProcessImage = Buffer.alloc(4096); // 4KB mock process image
        } else {
            this.fd = fs.openSync(this.devicePath, 'r+');
        }
    }

    close() {
        if (this.isSimulator) {
            this.mockProcessImage = null;
        } else if (this.fd !== null) {
            fs.closeSync(this.fd);
            this.fd = null;
        }
    }

    call(command, buffer) {
        if (this.isSimulator) {
            switch (command) {
                case PICONTROL_IOC_BIT_SET:
                    {
                        const offset = buffer.readUInt16LE(0);
                        const bit = buffer.readUInt8(2);
                        const value = buffer.length > 3 ? buffer.readUInt8(3) : 1;
                        let byte = this.mockProcessImage.readUInt8(offset);
                        if (value) {
                            byte |= (1 << bit);
                        } else {
                            byte &= ~(1 << bit);
                        }
                        this.mockProcessImage.writeUInt8(byte, offset);
                    }
                    break;
                case PICONTROL_IOC_COUNTER_RESET:
                    // This is a simplified simulation
                    console.log('Simulating counter reset');
                    break;
                case PICONTROL_IOC_RELAY_GET_CYCLES:
                    // This is a simplified simulation
                    console.log('Simulating get relay cycles');
                    break;
            }
            return 0;
        }
        if (this.fd === null) {
            throw new Error('piControl is not open.');
        }
        return ioctl(this.fd, command, buffer);
    }
}

export default new PiControl();