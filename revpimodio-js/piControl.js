import fs from 'fs';
import ioctl from 'ioctl-napi';

// Constants for ioctl requests, these will need to be verified against the C headers
const PI_CONTROL_IOC_MAGIC = 'p'.charCodeAt(0);
const PI_CONTROL_IOC_RESET = 1;
const PI_CONTROL_IO_OFFSET_MASK = 0xffff;
const PI_CONTROL_IO_AIN_VALUE = 2;
const PI_CONTROL_IO_AOUT_VALUE = 3;

const PICONTROL_IOC_BIT_SET = 19216;
const PICONTROL_IOC_BIT_RESET = 19217;
const PICONTROL_IOC_BIT_READ = 19218;

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
            const offset = buffer.readUInt16LE(0);
            const bit = buffer.readUInt8(2);

            switch (command) {
                case 19216: // PICONTROL_IOC_BIT_SET
                    {
                        let byte = this.mockProcessImage.readUInt8(offset);
                        byte |= (1 << bit);
                        this.mockProcessImage.writeUInt8(byte, offset);
                    }
                    break;
                case 19217: // PICONTROL_IOC_BIT_RESET
                    {
                        let byte = this.mockProcessImage.readUInt8(offset);
                        byte &= ~(1 << bit);
                        this.mockProcessImage.writeUInt8(byte, offset);
                    }
                    break;
                case 19218: // PICONTROL_IOC_BIT_READ
                    {
                        const byte = this.mockProcessImage.readUInt8(offset);
                        const value = (byte & (1 << bit)) !== 0;
                        buffer.writeUInt8(value ? 1 : 0, 3);
                    }
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