/*
**
** Copyright (c) 2024 Oracle and/or its affiliates
** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
*/

//sample terminal client to test the SDK
//Warning! this requires SoX to work.
"use strict";
import * as WebSocket from "ws";
const record = require("node-record-lpcm16");
const readline = require("readline");
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

import * as common from "oci-common";
import { RealtimeSpeechClient, RealtimeSpeechClientListener, RealtimeWebSocketState } from "@oracle/oci-ai-speech-realtime";
import { Readable } from "stream";
import { RealtimeMessageAckAudio, RealtimeMessageConnect, RealtimeMessageResult, RealtimeParameters } from "oci-aispeech/lib/model";

var para = "";

const { Command } = require('commander');
const program = new Command();

program
  .requiredOption('-c, --compartmentId <id>', 'Specify the Compartment ID')
  .requiredOption('-r, --region <region>', 'Specify the Region')
  .parse(process.argv);

const options = program.opts();
const serviceRegion = options.region; //like us-ashburn-1
const compartmentId = options.compartmentId;

const realtimeClientParameters: RealtimeParameters = {
  customizations: [],
  languageCode: "en-US",
  modelDomain: RealtimeParameters.ModelDomain.Generic,
  partialSilenceThresholdInMs: 0,
  finalSilenceThresholdInMs: 2000,
  stabilizePartialResults: RealtimeParameters.StabilizePartialResults.None,
  shouldIgnoreInvalidCustomizations: false,
  isAckEnabled: true,
  encoding: "audio/raw;rate=16000", //try setting to "audio/raw;rate=8000"
};

const provider: common.SessionAuthDetailProvider = new common.SessionAuthDetailProvider();
// const provider: common.SessionAuthDetailProvider = new common.SessionAuthDetailProvider();
// can be customized to include a custom OCI Config Path and Profile)
// const provider: common.SessionAuthDetailProvider = new common.SessionAuthDetailProvider("~/.oci/config", "DEFAULT");

var logs = true;
var audioStream: Readable;
var recorder: any;
const printLogs = (logString: any[]) => {
  if (logs) console.log("\x1b[33m" + new Date().toISOString() + "\x1b[0m", ...logString);
};

class MyRealtimeClientListener implements RealtimeSpeechClientListener {
  onClose(closeEvent: WebSocket.CloseEvent) {
    try {
      recorder && recorder.stop();
    } catch (error) {
      printLogs(["Audio Error: " + error]);
    }

  }

  onError(error: Error) {
    try {
      audioStream.destroy();
    } catch (err) {
      printLogs([err]);
    }
    printLogs(["WebSocket Server Error", error.message]);
  }

  onConnect(openEvent: WebSocket.Event) {
    printLogs(["WebSocket Client Connected"]);
  }

  onResult(resultMessage: RealtimeMessageResult) {
    if (resultMessage) {
      printLogs([JSON.stringify(resultMessage)]);

      if (resultMessage.event === RealtimeMessageResult.event && !resultMessage.transcriptions[0].isFinal) {
        var len = para.split(/\r\n|\r|\n/).length;
        if (!logs) {
          console.clear();
          process.stdout.write("\r" + para + "\x1b[36m" + (para.length > 0 ? " " : "") + (resultMessage.transcriptions[0].transcription as String) + "\x1b[0m" + "\n[🟠 \x1b[36mPartial\x1b[0m]\n");
        } else console.log("\x1b[36mPartial: " + resultMessage.transcriptions[0].transcription + "\x1b[0m");
      } else if (resultMessage.event === RealtimeMessageResult.event && resultMessage.transcriptions[0].isFinal) {
        para = para + (para.length > 0 ? " " : "") + (resultMessage.transcriptions[0].transcription as String);

        if (!logs) {
          console.clear();
          process.stdout.write("\r" + para + "\n[🟢 \x1b[32mFinal\x1b[0m]\n");
        } else console.log("\x1b[32mFinal:   " + resultMessage.transcriptions[0].transcription + "\x1b[0m");
      }
    }
  }

  onConnectMessage(connectMessage: RealtimeMessageConnect) {
    console.log(connectMessage);
    if (connectMessage) {
      printLogs([JSON.stringify(connectMessage)]);
      console.log("🟢");
      recorder = record.record({
        sampleRate: 16000, // try setting to 8000
        channels: 1,
      });
      audioStream = recorder.stream();

      audioStream.on("data", (d) => {
        if (realtimeSDK.realtimeWebSocketClient.readyState === realtimeSDK.realtimeWebSocketClient.OPEN) realtimeSDK.realtimeWebSocketClient.send(d);
      });

      if (connectMessage.event === RealtimeMessageConnect.event) {
        if (!logs) {
          process.stdout.write("\x1b[36mSession ID: " + connectMessage.sessionId + "\x1b[0m");
        } else console.log("\x1b[36mSession ID: " + connectMessage.sessionId + "\x1b[0m");
      }
    }
  }

  onAckAudio(ackMessage: RealtimeMessageAckAudio) {
    /* optionally print audio acknowledgement messages
     * this will return an acknowledgement for each audio chunk sent by the SDK
     * the response contains:
     * - sequence number of the chunk,
     * - length of the chunk in bytes,
     * - offset of the chunk, if any.
     *
     * This message is often helpful for debugging purposes
     * It can help analyze if audio is being sent at a steady rate
     * and if the size of the chunks is correct
     *
     * console.log(ackMessage);
     *
     */
  }
}

const startSession = (logsEnabled: boolean) => {
  if ((realtimeSDK && realtimeSDK.getWebSocketState() === RealtimeWebSocketState.STOPPED) || !realtimeSDK) {
    logs = logsEnabled;
    para = "";
    realtimeSDK = new RealtimeSpeechClient(
      /*
       * optionally pass custom parameters to the Listeners
       * here we have passed a custom string and an integer
       */
      new MyRealtimeClientListener(),
      provider,
      provider.getRegion(),
      compartmentId,
      `wss://realtime.aiservice.${serviceRegion}.oci.oraclecloud.com`,
      realtimeClientParameters
    );
    realtimeSDK.connect();

    /* Optionally request the final result on demand.
     *  The below code snippet will request a final result every minutes (60 seconds)
     *  if the websocket connection is active.
     *
     *   setInterval(() => {
     *     if (realtimeSDK.getWebSocketState() === RealtimeWebSocketState.RUNNING) realtimeSDK.requestFinalResult();
     *   }, 60000);
     */
  }
};

var realtimeSDK: RealtimeSpeechClient;

const instructions = () => {
  console.log(
    `Press 'e' to quit
Press 'r' to start without logs
Press 'l' to start with logs
Press 's' to stop`
  );
};

instructions();

process.stdin.on("keypress", (str, key) => {
  if (!key.ctrl && key.name === "e") {
    process.exit();
  } else if (!key.ctrl && key.name === "r") {
    startSession(false);
  } else if (!key.ctrl && key.name === "l") {
    startSession(true);
  } else if (!key.ctrl && key.name === "s") {
    try {
      if (realtimeSDK && realtimeSDK.getWebSocketState() !== RealtimeWebSocketState.STOPPED && realtimeSDK.realtimeWebSocketClient.readyState !== WebSocket.CLOSING) {
        realtimeSDK.close();
        console.log("🔴 Stopped");
        instructions();
      }
    } catch (e) {
      printLogs(["WebSocket Client Error", e.message]);
    }
  }
});
