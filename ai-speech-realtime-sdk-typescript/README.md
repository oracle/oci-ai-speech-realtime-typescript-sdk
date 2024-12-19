# Oracle Cloud Infrastructure Realtime Speech TypeScript SDK Development

This is the development guide for the OCI Realtime Speech TypeScript SDK. Before starting development, make sure you have [TypeScript](https://www.npmjs.com/package/typescript) and [Node](https://nodejs.org) installed on your system.

## Installation

To perform this and the subsequent steps, make sure you're in the right directory.

```bash
cd oci-ai-speech-realtime-typescript-sdk/ai-speech-realtime-sdk-typescript/
```

Run the following to install the dependencies of the SDK into your workspace.

```bash
npm install
```
## Unit Tests

To run unit tests, do the following:
```bash
npm run test
```

You can generate the coverage report by doing 
```bash
npm run test -- --coverage
``` 

The coverage report will be available in the `coverage/lcov-report` directory. You can open the `index.html` file in the browser.

## Build
To compile the TypeScript files into JavaScript files, run the following:

```bash
npm run build
```





