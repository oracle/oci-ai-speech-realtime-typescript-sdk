/*
 **
 ** Copyright (c) 2024, 2025, Oracle and/or its affiliates
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

enum RealtimeCredentialState {
  "INACTIVE",
  "CREATING",
  "ACTIVE",
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
    region: any,
    compartmentId: string,
    realtimeEndpoint: string,
    realtimeParameters?: RealtimeParameters
  ) {
    this.realtimeClientListener = realtimeClientListener;
    this.provider = provider;
    this.compartmentId = compartmentId;
    this.realtimeEndpoint = realtimeEndpoint;
    if (realtimeParameters) this.realtimeParameters = realtimeParameters;
  }

  private provider: common.AuthenticationDetailsProvider;
  private realtimeEndpoint: string;
  private realtimeWebSocketClient: WebSocket;
  private realtimeWebSocketState: RealtimeWebSocketState;
  private realtimeParameters: RealtimeParameters = {
    isAckEnabled: false,
    shortPauseInMs: 0,
    longPauseInMs: 2000,
    stabilizePartialResults: RealtimeParameters.StabilizePartialResults.None,
    shouldIgnoreInvalidCustomizations: false,
    languageCode: "en-US",
    modelDomain: RealtimeParameters.ModelDomain.Generic,
    modelType: "ORACLE",
    encoding: "audio/raw;rate=16000",
    punctuation: RealtimeParameters.Punctuation.None,
  } as RealtimeParameters;
  private compartmentId: string;
  private realtimeClientListener: RealtimeSpeechClientListener;

  private static realtimeCredential: RealtimeMessageAuthenticationCredentials;
  private static realtimeCredentialTime: number = 0;
  private static realtimeCredentialState: RealtimeCredentialState = RealtimeCredentialState.INACTIVE;

  private sendCredentials = () => {
    const now = Date.now();
    if (RealtimeSpeechClient.realtimeCredentialState === RealtimeCredentialState.INACTIVE || RealtimeSpeechClient.realtimeCredentialTime + 60000 < now) {
      RealtimeSpeechClient.realtimeCredentialState = RealtimeCredentialState.CREATING;
      RealtimeSpeechClient.realtimeCredentialTime = now;
      this.generateCredentials().then(() => {
        this.realtimeWebSocketClient.send(JSON.stringify(RealtimeSpeechClient.realtimeCredential));
      });
    } else if (RealtimeSpeechClient.realtimeCredentialState === RealtimeCredentialState.CREATING) {
      setTimeout(() => {
        this.sendCredentials();
      }, 10);
    } else if (RealtimeSpeechClient.realtimeCredentialState === RealtimeCredentialState.ACTIVE) {
      this.realtimeWebSocketClient.send(JSON.stringify(RealtimeSpeechClient.realtimeCredential));
    }
  };

  private initializeCredentialsCreation = () => {
    const now = Date.now();
    if (RealtimeSpeechClient.realtimeCredentialState === RealtimeCredentialState.INACTIVE || RealtimeSpeechClient.realtimeCredentialTime + 60000 < now) {
      RealtimeSpeechClient.realtimeCredentialState = RealtimeCredentialState.CREATING;
      RealtimeSpeechClient.realtimeCredentialTime = now;
      this.generateCredentials();
    }
  };

  private onWebsocketOpen = (event: Event) => {
    this.realtimeClientListener.onConnect(event);
    this.setWebSocketState(RealtimeWebSocketState.AUTHENTICATING);
    try {
      this.sendCredentials();
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
    if (params.encoding !== undefined) parameterString += "encoding=" + params.encoding + "&";
    if (params.shouldIgnoreInvalidCustomizations !== undefined) parameterString += "shouldIgnoreInvalidCustomizations=" + params.shouldIgnoreInvalidCustomizations + "&";
    if (params.partialSilenceThresholdInMs !== undefined) parameterString += "partialSilenceThresholdInMs=" + params.partialSilenceThresholdInMs + "&";
    if (params.finalSilenceThresholdInMs !== undefined) parameterString += "finalSilenceThresholdInMs=" + params.finalSilenceThresholdInMs + "&";
    if (params.stabilizePartialResults !== undefined) parameterString += "stabilizePartialResults=" + params.stabilizePartialResults + "&";
    if (params.languageCode !== undefined) parameterString += "languageCode=" + params.languageCode + "&";
    if (params.modelDomain !== undefined) parameterString += "modelDomain=" + params.modelDomain + "&";
    if (params.modelType !== undefined && params.modelType !== "ORACLE") parameterString += "modelType=" + params.modelType + "&";
    if (params.punctuation !== undefined && params.punctuation !== RealtimeParameters.Punctuation.None) parameterString += "punctuation=" + params.punctuation + "&";
    if (params.customizations !== undefined && params.customizations.length > 0) {
      parameterString += "customizations=" + encodeURIComponent(JSON.stringify(params.customizations)) + "&";
    }
    if (parameterString.charAt(parameterString.length - 1) === "&") parameterString = parameterString.substring(0, parameterString.length - 1);
    return parameterString;
  };

  private generateCredentials = async () => {
    const requestSigner: common.RequestSigner = new DefaultRequestSigner(this.provider);
    let headers: { [key: string]: any } = {};
    let url = new URL(this.realtimeEndpoint);
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
      authenticationType: "CREDENTIALS",
      compartmentId: this.compartmentId,
      headers: headers,
    };
    RealtimeSpeechClient.realtimeCredential = payload;
    RealtimeSpeechClient.realtimeCredentialState = RealtimeCredentialState.ACTIVE;
  };

  public connect = () => {
    try {
      this.realtimeWebSocketClient = new WebSocket(this.realtimeEndpoint + this.parseParameters(this.realtimeParameters));
      this.realtimeWebSocketClient.onopen = (open: Event) => this.onWebsocketOpen(open);
      this.realtimeWebSocketClient.onmessage = (message: MessageEvent) => this.onWebsocketMessage(message);
      this.realtimeWebSocketClient.onclose = (close: CloseEvent) => this.onWebsocketClose(close);
      this.realtimeWebSocketClient.onerror = (error: ErrorEvent) => this.onWebsocketError(new Error(JSON.stringify(error)));
      this.setWebSocketState(RealtimeWebSocketState.OPENING);
      this.initializeCredentialsCreation();
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

  public sendAudioData = (audioBytes: ArrayBuffer) => {
    if (this.realtimeWebSocketClient.readyState === this.realtimeWebSocketClient.OPEN) this.realtimeWebSocketClient.send(audioBytes);
  };
}
