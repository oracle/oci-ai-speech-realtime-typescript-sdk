# Oracle Cloud Infrastructure Realtime Speech TypeScript SDK

# About

This repository contains the source code for the TypeScript SDK to connect to the realtime speech service. There's also an example client for reference.

## Installation instructions

Do the following to install the SDK:

```bash
npm install oci-ai-speech-realtime
```

You can also choose to clone this git repo and install from source.

## Documentation

The home page for the OCI Speech Service can be found [here](https://www.oracle.com/artificial-intelligence/speech/).
The API reference for OCI Speech Service can be found [here](https://docs.oracle.com/en-us/iaas/api/#/en/speech/latest/).

Note that realtime speech URLs are distinct from the speech URLs mentioned in the above link. To obtain a realtime speech url, take a speech url, and replace 'speech' with realtime. Also replace https with wss. 

For example, for the following speech url:

```https://speech.aiservice.af-johannesburg-1.oci.oraclecloud.com```

This is the corresponding realtime speech URL:

```wss://realtime.aiservice.af-johannesburg-1.oci.oraclecloud.com```

## Examples
We have an example here itself, it can be found in the [example-client](example-client/) directory.


## Development
Follow the instructions in the [Development Readme](ai-speech-realtime-sdk-typescript/README.md) to get started with local development/testing of the SDK code. 

## Contributing

This project welcomes contributions from the community. Before submitting a pull request, please [review our contribution guide](./CONTRIBUTING.md)

## Security

Please consult the [security guide](./SECURITY.md) for our responsible security vulnerability disclosure process

## License

Copyright (c) 2024 Oracle and/or its affiliates.

Released under the Universal Permissive License v1.0 as shown at
<https://oss.oracle.com/licenses/upl/>.
