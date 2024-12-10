/*
**
** Copyright (c) 2024 Oracle and/or its affiliates
** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
*/

import WebSocket, { MessageEvent, CloseEvent, ErrorEvent, Event } from "ws";
import common, { DefaultRequestSigner, HttpRequest } from "oci-common";
import {
  RealtimeMessage,
  RealtimeMessageAckAudio,
  RealtimeMessageAuthentication,
  RealtimeMessageAuthenticationCredentials,
  RealtimeMessageConnect,
  RealtimeMessageError,
  RealtimeMessageResult,
  RealtimeMessageSendFinalResult,
  RealtimeParameters,
} from "oci-aispeech/lib/model";

export { RealtimeMessageAuthentication, RealtimeMessageAuthenticationCredentials, RealtimeParameters };

export enum RealtimeWebSocketState {
  "STOPPED",
  "RUNNING",
  "OPENING",
  "AUTHENTICATING",
  "ERROR",
}

export interface RealtimeSpeechClientListener {
  onClose(closeEvent: CloseEvent): any;
  onConnect(openEvent: Event): any;
  onError(errorEvent: Error): any;
  onConnectMessage(connectMessage: RealtimeMessageConnect): any;
  onResult(resultMessage: RealtimeMessageResult): any;
  onAckAudio(ackMessage: RealtimeMessageAckAudio): any;
}
export class RealtimeSpeechClient {
  constructor(
    realtimeClientListener: RealtimeSpeechClientListener,
    provider: common.AuthenticationDetailsProvider,
    region: common.Region,
    compartmentId: string,
    realtimeEndpoint?: string,
    realtimeParameters?: RealtimeParameters
  ) {
    this.realtimeClientListener = realtimeClientListener;
    this.provider = provider;
    this.region = region;
    this.compartmentId = compartmentId;
    if (realtimeParameters) this.realtimeParameters = realtimeParameters;
    if (realtimeEndpoint) this.realtimeEndpoint = realtimeEndpoint;
    else this.realtimeEndpoint = `ws://realtime.aiservice-preprod.${this.region.regionId}.oci.oracleiaas.com`;
  }

  provider: common.AuthenticationDetailsProvider;
  region: common.Region;
  realtimeEndpoint: string;
  realtimeWebSocketClient: WebSocket;
  realtimeWebSocketState: RealtimeWebSocketState;
  realtimeParameters: RealtimeParameters = {
    isAckEnabled: false,
    shortPauseInMs: 0,
    longPauseInMs: 2000,
    stabilizePartialResults: RealtimeParameters.StabilizePartialResults.None,
    shouldIgnoreInvalidCustomizations: false,
    languageCode: "en-US",
    modelDomain: RealtimeParameters.ModelDomain.Generic,
    encoding: "audio/raw;rate=16000",
  } as RealtimeParameters;
  mediaStream: MediaStream;
  realtimeAuthPayload: RealtimeMessageAuthentication;
  compartmentId: string;
  realtimeClientListener: RealtimeSpeechClientListener;

  private onWebsocketOpen = (event: Event) => {
    this.realtimeClientListener.onConnect(event);
    this.setWebSocketState(RealtimeWebSocketState.AUTHENTICATING);
    //auth client
    try {
      if (this.realtimeAuthPayload !== null) this.realtimeWebSocketClient.send(JSON.stringify(this.realtimeAuthPayload));
    } catch (error) {
      try {
        this.realtimeWebSocketClient.close();
      } catch (err) {
        this.onWebsocketError(err);
      }
      this.setWebSocketState(RealtimeWebSocketState.STOPPED);
    }
  };

  private onWebsocketClose = (close: CloseEvent) => {
    this.setWebSocketState(RealtimeWebSocketState.STOPPED);
    this.realtimeClientListener.onClose(close);
  };
  private onWebsocketMessage = (message: MessageEvent) => {
    if (message.data) {
      let data = JSON.parse(message.data.toString()) as RealtimeMessage;
      if (data.event === RealtimeMessageAckAudio.event) {
        this.realtimeClientListener.onAckAudio(data as any as RealtimeMessageAckAudio);
      } else if (data.event === RealtimeMessageConnect.event) {
        this.setWebSocketState(RealtimeWebSocketState.RUNNING);
        this.realtimeClientListener.onConnectMessage(data as any as RealtimeMessageConnect);
      } else if (data.event === RealtimeMessageResult.event) {
        this.realtimeClientListener.onResult(data as any as RealtimeMessageResult);
      } else if (data.event === RealtimeMessageError.event) {
        let errorMessage = (data as any as RealtimeMessageError).code + ": " + (data as any as RealtimeMessageError).message;
        this.onWebsocketError(new Error(errorMessage));
      }
    }
  };
  private onWebsocketError = (error: Error) => {
    console.error(error);
    this.setWebSocketState(RealtimeWebSocketState.ERROR);
    this.realtimeClientListener.onError(error);
  };

  private parseParameters = (params: RealtimeParameters) => {
    let parameterString = "/ws/transcribe/stream?";
    if (params.isAckEnabled !== undefined) parameterString += "isAckEnabled=" + params.isAckEnabled + "&";
    if (params.shouldIgnoreInvalidCustomizations !== undefined) parameterString += "shouldIgnoreInvalidCustomizations=" + params.shouldIgnoreInvalidCustomizations + "&";
    if (params.partialSilenceThresholdInMs !== undefined) parameterString += "partialSilenceThresholdInMs=" + params.partialSilenceThresholdInMs + "&";
    if (params.finalSilenceThresholdInMs !== undefined) parameterString += "finalSilenceThresholdInMs=" + params.finalSilenceThresholdInMs + "&";
    if (params.stabilizePartialResults !== undefined) parameterString += "stabilizePartialResults=" + params.stabilizePartialResults + "&";
    if (params.languageCode !== undefined) parameterString += "languageCode=" + params.languageCode + "&";
    if (params.modelDomain !== undefined) parameterString += "modelDomain=" + params.modelDomain + "&";

    // if (params.version !== undefined && params.version.length > 0) parameterString += "version=" + params.version + "&";
    // if (params.speciality !== undefined) parameterString += "speciality=" + params.speciality + "&";
    if (params.customizations !== undefined && params.customizations.length > 0) {
      parameterString += "customizations=" + encodeURIComponent(JSON.stringify(params.customizations)) + "&";
    }
    if (parameterString.charAt(parameterString.length - 1) === "&") parameterString = parameterString.substring(0, parameterString.length - 1);
    // if (params.freeformTags !== undefined && Object.keys(params.freeformTags).length > 0) {
    //   parameterString += "freeFormTags=" + encodeURIComponent(JSON.stringify(params.freeformTags));
    // }
    return parameterString;
  };

  private sendCreds = (authType: string) => {
    const requestSigner: common.RequestSigner = new DefaultRequestSigner(this.provider);
    let headers: { [key: string]: any } = {};
    // let jwt: string = "";
    let url = new URL(this.realtimeEndpoint);
    (async () => {
      const httpRequest: HttpRequest = {
        uri: `${url.protocol}//${url.host}${url.pathname}`,
        headers: new Headers(),
        method: "GET",
      };

      await requestSigner.signHttpRequest(httpRequest);

      httpRequest.headers.forEach((value, key) => {
        headers[key] = value;
      });
      headers["host"] = url.host;
      headers["uri"] = `${url.protocol}//${url.host}${url.pathname}`;
      let payload: RealtimeMessageAuthenticationCredentials = {
        authenticationType: authType,
        compartmentId: this.compartmentId,
        headers: headers,
      };
      this.realtimeAuthPayload = payload;
    })().catch((err) => {
      this.onWebsocketError(err);
      this.close();
    });
  };

  public connect = () => {
    try {
      this.realtimeWebSocketClient = new WebSocket(this.realtimeEndpoint + this.parseParameters(this.realtimeParameters), {
        headers: { "Content-Type": this.realtimeParameters.encoding },
      });
      this.realtimeWebSocketClient.onopen = (open: Event) => this.onWebsocketOpen(open);
      this.realtimeWebSocketClient.onmessage = (message: MessageEvent) => this.onWebsocketMessage(message);
      this.realtimeWebSocketClient.onclose = (close: CloseEvent) => this.onWebsocketClose(close);
      this.realtimeWebSocketClient.onerror = (error: ErrorEvent) => this.onWebsocketError(new Error(JSON.stringify(error)));
      this.setWebSocketState(RealtimeWebSocketState.OPENING);
      this.sendCreds("CREDENTIALS");
    } catch (err) {
      this.onWebsocketError(err);
      this.close();
    }
  };

  public close = () => {
    try {
      this.realtimeWebSocketClient.close();
    } catch (err) {
      this.onWebsocketError(err);
    }
  };

  public getWebSocketState = () => {
    return this.realtimeWebSocketState;
  };

  private setWebSocketState = (state: RealtimeWebSocketState) => {
    this.realtimeWebSocketState = state;
  };

  public requestFinalResult = () => {
    let requestMessage: RealtimeMessageSendFinalResult = {
      event: RealtimeMessageSendFinalResult.event,
    };
    this.realtimeWebSocketClient.send(JSON.stringify(requestMessage));
  };
}
