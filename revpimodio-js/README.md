# RevPiModIO for Node.js

This is a Node.js port of the popular `revpimodio` Python library for interacting with Kunbus RevolutionPi hardware. It allows you to control and monitor the IOs of your RevolutionPi devices directly from your Node.js applications.

This library aims to provide a similar API to the original Python version, making it easy for developers to transition between the two.

## Features

*   **piCtory Configuration Parsing:** Automatically reads your hardware configuration from `config.rsc`.
*   **Direct IO Access:** Access inputs and outputs by the names you've assigned in piCtory.
*   **Advanced IO Types:** Built-in support for `IntIO`, `IntIOCounter`, and `RelaisOutput`.
*   **Event-Driven:** Register event listeners for IO changes.
*   **Cyclic Execution:** A `cycleloop` for running PLC-like logic.
*   **Selective Device Loading:** Use `RevPiModIOSelected` to work with a subset of your devices.
*   **Virtual Device Drivers:** Use `RevPiModIODriver` to create drivers for virtual devices.
*   **Dynamic IO Replacement:** Redefine IOs at runtime with `replace_io` or a configuration file.
*   **Graceful Shutdown:** Automatically handles `SIGINT` and `SIGTERM` for a clean shutdown.
*   **Simulator Mode:** Develop and test your applications without needing physical hardware.

## Installation

```bash
npm install revpimodio
```

*(Note: This package is not yet published on npm. The above is the intended installation method once published.)*

## Basic Usage

Here's a simple example of how to read an input and set an output:

```javascript
import { RevPiModIO } from 'revpimodio';

const rpi = new RevPiModIO({ autorefresh: true });

// If input 'Input1' is high, set output 'Output1' high
if (rpi.io.Input1.value) {
    rpi.io.Output1.value = true;
}

// Clean up
rpi.exit();
```

## Advanced Usage

### Event-Driven Usage

You can also react to changes on input pins by registering an event handler:

```javascript
import { RevPiModIO } from 'revpimodio';

const rpi = new RevPiModIO({ autorefresh: true });

function handleInputChange(ioName, ioValue) {
    console.log(`IO ${ioName} changed to ${ioValue}`);
    // Set the value of an output based on the input
    rpi.io.Output1.value = ioValue;
}

// Register the event handler for 'Input1'
rpi.io.Input1.reg_event(handleInputChange);

console.log('Listening for IO changes...');
```

### Cycle Loop

For applications that require deterministic, cyclic execution, you can use the `cycleloop`:

```javascript
import { RevPiModIO } from 'revpimodio';

const rpi = new RevPiModIO();

async function myPlcLogic() {
    // This function will be called repeatedly
    const inputValue = rpi.io.Input1.value;
    rpi.io.Output1.value = !inputValue; // Toggle the output based on the input
}

// Start the cycle loop with a 50ms cycle time
rpi.cycleloop(myPlcLogic, 50).then(() => {
    console.log('Cycle loop finished.');
});

// To stop the loop from elsewhere, call:
// rpi.exit();
```

### Selective Device Loading

If you only want to work with a subset of your devices, you can use `RevPiModIOSelected`:

```javascript
import { RevPiModIOSelected } from 'revpimodio';

// Load only the device named 'MyDevice'
const rpi = new RevPiModIOSelected('MyDevice', { autorefresh: true });
```

### Virtual Device Drivers

To create a driver for a virtual device, use `RevPiModIODriver`:

```javascript
import { RevPiModIODriver } from 'revpimodio';

// Create a driver for the virtual device 'MyVirtualDevice'
const rpi = new RevPiModIODriver('MyVirtualDevice');

// You can now write to the inputs of the virtual device
rpi.io.MyVirtualInput.value = 123;
```

### Dynamic IO Replacement

You can redefine an IO at runtime using `replace_io`:

```javascript
import { RevPiModIO } from 'revpimodio';

const rpi = new RevPiModIO();

// Replace the 'Output1' IO with a new 'MyFloat' IO that is a 32-bit float
rpi.io.Output1.replace_io('MyFloat', 'f');

// Now you can access the new IO
rpi.io.MyFloat.value = 3.14;
```

You can also use a configuration file to replace IOs on startup:

**replace_ios.conf**
```ini
[MyFloat]
replace = Output1
frm = f
```

**index.js**
```javascript
import { RevPiModIO } from 'revpimodio';

const rpi = new RevPiModIO({ replace_io_file: 'replace_ios.conf' });

rpi.io.MyFloat.value = 3.14;
```

## License

This project is licensed under the LGPL-2.0-or-later, just like the original Python library.