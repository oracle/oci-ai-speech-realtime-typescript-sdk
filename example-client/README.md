# Sample NodeJS client for Speech Service Realtime SDK.

## Installation Steps

> ### **Prerequisites:**
>
> - This client requires SoX to capture user audio, the client will not work without it. Install SoX from for Windows or MacOS depending on your system. Also make sure that SoX is recognized as a PATH command and added to the PATH environment variable. Read more about installation at [SoX](https://sourceforge.net/projects/sox/) > <br/><br/>
>   Sox is not required by the OCI Realtime Speech SDK but only by an example client which attempts to directly capture audio from the users' microphone.
> - `NodeJS >= 14.20` are required to successfully build and run the project.

> ### **Authentication:**
>
> Follow the steps for creating OCI Credentials here: [OCI SDK Setup](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/devguidesetupprereq.htm) and add your profile name and config file location in `index.ts`. If none added, path `~/.oci/config` and profile `DEFAULT` will be used by default.

### 1. Install npm libraries

If you want to test the package build in the source, first go back to the `../ai-speech-realtime-sdk-typescript` directory and run `npm pack`:

```
npm install
```

If you want to test the package build in the source, first go back to the `../ai-speech-realtime-sdk-typescript` directory and run `npm pack`:


### 2. Update index.ts

In `index.ts`,
Update details in lines **25-45** with the following details:
- `compartmentId`
- `authentication method` and `profile`
- `realtimeClientParameters` object present at with the parameters you want to use in the realtime session. More information about the parameters is provided in the [RealtimeParameters](#realtimeparameters) section below.

Update `MyRealtimeClientListener` class present at **line 45** by overriding the methods you want to use in the realtime session. More information about the Listeners and events is provided in the [RealtimeSpeechClientListener](#realtimespeechclientlistener) section below.

### 3. Build project

```
npm run build
```

## Running the Project

### A. Run project in dev mode

```
npm run start:dev
```

This will start the project in hot-reload mode where making changes to `index.ts` will automatically restart the app.

### B. Run project

```
npm start
```

This will start the compiled project which was built earlier using `npm run build`.

The project will start in the terminal. Follow the on-screen instructions to try the service.

- Press 'e' to quit the script
- Press 'r' to start without logs. In this mode only the partial and final results will be printed
- Press 'l' to start with logs. In this mode all raw results as they are received from the service will be printed along with other client side logs.
- Press 's' to stop. This will stop the session. After the session stops, you can press 'r' or 'l' again to start a new session

## Regions and complete endpoints for API


The home page for the OCI Speech Service can be found [here](https://www.oracle.com/artificial-intelligence/speech/).
The API reference for OCI Speech Service can be found [here](https://docs.oracle.com/en-us/iaas/api/#/en/speech/latest/).

Note that realtime speech URLs are distinct from the speech URLs mentioned in the above link. To obtain a realtime speech url, take a speech url, and replace 'speech' with realtime. Also replace https with wss. 

For example, for the following speech url:

```https://speech.aiservice.af-johannesburg-1.oci.oraclecloud.com```

This is the corresponding realtime speech URL:

```wss://realtime.aiservice.af-johannesburg-1.oci.oraclecloud.com```

## RealtimeParameters

These are the parameters which can be tweaked before starting a Realtime Speech Transcription Session:

### 1. `encoding`

- Encoding to use for the audio chunks which are sent to the service.
- Type - string
- Required - No
- Valid values:
  1. `audio/raw;rate=16000` (default)
  2. `audio/raw;rate=8000`
  3. `audio/raw;rate=8000;codec=mulaw`
  4. `audio/raw;rate=8000;codec=alaw`

### 2. `isAckEnabled`

- Toggle for ack messages. These are ping/pong messages which return an “ack” for each chunk sent to the service.
- Type - boolean
- Required - No
- Default - `false`

### 3. `partialSilenceThresholdInMs`

- Silence threshold for Realtime Speech partial results in milliseconds.
- Type - integer
- Required - No
- Default - 0

### 4. `finalSilenceThresholdInMs`

- Silence threshold for Realtime Speech final results in milliseconds.
- Type - integer
- Required - No
- Default - 2000

### 5. `stabilizePartialResults`

- When enabled sets the amount of confidence required for latest tokens before returning them as part of a new partial result
- Type - string (enum)
- Required - No
- Valid values -
  1. `NONE` (default)
  2. `LOW`
  3. `MEDIUM`
  4. `HIGH`

### 6. `modelDomain`

- Domain (speciality) of the model used for transcriptions. Amodel specialised to a particular domain will be better atrecognising utterances which are related to that domain.
- Type - string (enum)
- Required - No
- Valid values -
  1. `GENERIC` (default)
  2. `MEDICAL`

### 7. `languageCode`

- Language used for recognition
- Type - string
- Required - No
- Valid values - Locale value as per given in [https://datatracker.ietf.org/doc/html/rfc5646] -
  1. `en-US`: English - United States
  2. `es-ES`: Spanish - Spain
  3. `pt-BR`: Portuguese - Brazil
  4. `en-GB`: English - Great Britain
  5. `en-AU`: English - Australia
  6. `en-IN`: English - India
  7. `hi-IN`: Hindi - India
  8. `fr-FR`: French - France
  9. `de-DE`: German - Germany
  10. `it-IT`: Italian - Italy

### 8. `shouldIgnoreInvalidCustomizations`

- If set to true, the service will not fail connection attempt if it encounters any issues that prevent the loading of all specified user customizations. Any invalid customizations will simply be ignored and connection will continue being established with the default base model and any remaining valid customizations. If set to false, if the service is unable to load any of the specified customizations, an error detailing why will be returned and the session will end.
- Type - boolean
- Required - No
- Default - false

### 9. `customizations`

- Array of customization objects which will be used to prepare the session so that it can recognise custom vocabulary.
- Type - Customization[]
- Required - No

## RealtimeSpeechClientListener

`RealtimeSpeechClientListener` interface provides the methods which are triggered when the certain events from the Realtime Speech Service are received.

Users can freely implement this interface on their own Listener class and pass it to the `RealtimeSpeechClient` when the client object is being created. (**line 141**)

Users can also initialize their Listener with custom parameters of their own, which they think will be useful in their use-case. For example, in **line 141**, you can pass custom text, port numbers and so on for each Realtime Speech Session that you create. This can help you further identifying and processing the results when you have multiple instances of the `RealtimeSpeechClient` running.

### 1. `onClose(closeEvent: CloseEvent): any`:

Triggered when the Realtime Speech Service session closes.

### 2. `onConnect(openEvent: Event): any`:

Triggered when the Realtime Speech Service session is connected successfully. Note that while the session has been connected, it has not been authenticated yet.

### 3. `onError(errorEvent: Error): any`:

Triggered when the Realtime Speech Service session throws an error.

### 4. `onConnectMessage(connectMessage: RealtimeMessageConnect): any`:

Triggered when the Realtime Speech Service session is authenticated successfully. After this event is triggered you can start sending audio to the service.

### 5. `onResult(resultMessage: RealtimeMessageResult): any`:

Triggered when a Partial or Final result is returned by the service. The pause in receiving the final and partial results will depend on the values specified for [`finalSilenceThresholdInMs`](#4-finalsilencethresholdinms) and [`partialSilenceThresholdInMs`](#3-partialsilencethresholdinms) respectively.

### 6. `onAckAudio(ackMessage: RealtimeMessageAckAudio): any`:

Triggered everytime the service returns an acknowledgement for audio bytes which were received by the service. The event is useful for debugging purposes where the users might want to check if the audio is being sent properly and if the audio chunk size is appropriate. This event only activates when [`isAckEnabled`](#4-isackenabled) is set to `true`.
