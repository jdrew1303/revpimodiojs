# RevPiModIO for Node.js

This is a Node.js port of the popular `revpimodio` Python library for interacting with Kunbus RevolutionPi hardware. It allows you to control and monitor the IOs of your RevolutionPi devices directly from your Node.js applications.

This library aims to provide a similar API to the original Python version, making it easy for developers to transition between the two.

## Features

*   **piCtory Configuration Parsing:** Automatically reads your hardware configuration from `config.rsc`.
*   **Direct IO Access:** Access inputs and outputs by the names you've assigned in piCtory.
*   **Event-Driven:** Register event listeners for IO changes.
*   **Cyclic Execution:** A `cycleloop` for running PLC-like logic.
*   **Simulator Mode:** Develop and test your applications without needing physical hardware.

## Installation

```bash
npm install revpimodio
```

*(Note: This package is not yet published on npm. The above is the intended installation method once published.)*

## Basic Usage

Here's a simple example of how to read an input and set an output:

```javascript
import RevPiModIO from 'revpimodio';

const rpi = new RevPiModIO({ autorefresh: true });

// If input 'Input1' is high, set output 'Output1' high
if (rpi.io.Input1.value) {
    rpi.io.Output1.value = true;
}

// Clean up
rpi.exit();
```

## Event-Driven Usage

You can also react to changes on input pins by registering an event handler:

```javascript
import RevPiModIO from 'revpimodio';

const rpi = new RevPiModIO({ autorefresh: true });

function handleInputChange(ioName, ioValue) {
    console.log(`IO ${ioName} changed to ${ioValue}`);
    // Set the value of an output based on the input
    rpi.io.Output1.value = ioValue;
}

// Register the event handler for 'Input1'
rpi.io.Input1.reg_event(handleInputChange);

console.log('Listening for IO changes...');

// The process will now run until you stop it (e.g., with Ctrl+C)
// You can add a proper exit condition using rpi.exit()
```

## Cycle Loop

For applications that require deterministic, cyclic execution, you can use the `cycleloop`:

```javascript
import RevPiModIO from 'revpimodio';

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

## License

This project is licensed under the LGPL-2.0-or-later, just like the original Python library.