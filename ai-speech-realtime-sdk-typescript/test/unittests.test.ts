import { RealtimeMessageSendFinalResult, RealtimeParameters } from "oci-aispeech/lib/model";
import { RealtimeMessageAuthenticationCredentials, RealtimeSpeechClient, RealtimeWebSocketState } from "../src/client";
import { MockListener, MockWebSocket } from "./test-resources/mocked-classes";
import common from "oci-common";

jest.mock("ws");
jest.mock("oci-common");

describe("Test typescript sdk client", () => {
  let mockListener = MockListener;
  let mockWebsocket: MockWebSocket;
  let region: common.Region;
  let compartmentId = "testCompartmentId";
  let realtimeEndpoint = "testEndpoint";
  let provider: common.AuthenticationDetailsProvider;
  let speechClient: RealtimeSpeechClient;

  beforeAll(() => {
    // global.WebSocket = MockWebSocket as any
    // jest.mock("ws", () => require("./test-resources/mocked-classes").MockWebSocket);
    global.URL = jest.fn().mockImplementation((url: string) => {
      if (url) {
        return {
          href: "https://test.com/",
          origin: "https://test.com",
          pathname: "/test",
          search: "",
          searchParams: new URLSearchParams(),
          toString: () => "https://test.com/",
        };
      }
      throw new TypeError("Invalid URL");
    }) as unknown as typeof URL;
  });

  beforeEach(() => {
    speechClient = new RealtimeSpeechClient(mockListener, provider, region, compartmentId, realtimeEndpoint);
    MockWebSocket.instances = [];
    speechClient.connect();
    mockWebsocket = MockWebSocket.instances[0];
  });

  it("should initialize client", () => {
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.OPENING);
  });

  it("should handle ws open", () => {
    mockWebsocket.simulateOpen();
    expect(mockListener.onConnect).toHaveBeenCalled();
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.AUTHENTICATING);
    let payload: RealtimeMessageAuthenticationCredentials = {
      authenticationType: "CREDENTIALS",
      compartmentId: compartmentId,
      headers: { uri: "undefined//undefined/test" },
    };
    expect(mockWebsocket.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("should handle open event exceptions", () => {
    // cover ws.send catch block
    mockWebsocket.send.mockImplementation(() => {
      throw new Error("send failed");
    });
    mockWebsocket.simulateOpen();
    expect(mockWebsocket.close).toHaveBeenCalled();
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.STOPPED);

    // cover catch within the catch
    mockWebsocket.close.mockImplementation(() => {
      throw new Error("close failed");
    });
    mockWebsocket.simulateOpen();
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.STOPPED);
    expect(mockListener.onError).toHaveBeenCalled();
  });

  it("should handle websocket close", () => {
    mockWebsocket.simulateClose();
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.STOPPED);
    expect(mockListener.onClose).toHaveBeenCalled();
  });

  it("should handle websocket connect message", () => {
    const message = '{"event": "CONNECT"}';
    mockWebsocket.simulateMessage(message);
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.RUNNING);
    expect(mockListener.onConnectMessage).toHaveBeenCalledWith({ event: "CONNECT" });
  });

  it("should handle websocket ack audio message", () => {
    const message = '{"event": "ACKAUDIO"}';
    mockWebsocket.simulateMessage(message);
    expect(mockListener.onAckAudio).toHaveBeenCalledWith({ event: "ACKAUDIO" });
  });

  it("should handle websocket result message", () => {
    const message = '{"event": "RESULT"}';
    mockWebsocket.simulateMessage(message);
    expect(mockListener.onResult).toHaveBeenCalledWith({ event: "RESULT" });
  });

  it("should handle websocket result message", () => {
    const message = '{"event": "ERROR"}';
    mockWebsocket.simulateMessage(message);
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.ERROR);
  });

  it("should parse parameters", () => {
    const realtimeParameters: RealtimeParameters = {
      isAckEnabled: false,
      partialSilenceThresholdInMs: 0,
      finalSilenceThresholdInMs: 2000,
      stabilizePartialResults: RealtimeParameters.StabilizePartialResults.None,
      shouldIgnoreInvalidCustomizations: false,
      languageCode: "en-US",
      modelDomain: RealtimeParameters.ModelDomain.Generic,
      modelType: "ORACLE",
      encoding: "audio/raw;rate=16000",
      punctuation: RealtimeParameters.Punctuation.Auto,
      customizations: ["test"],
    } as RealtimeParameters;
    realtimeEndpoint = "wss://realtime.aiservice.testId.oci.oraclecloud.com";
    region = {
      regionId: "testId",
    } as any;
    speechClient = new RealtimeSpeechClient(mockListener, provider, region, compartmentId, realtimeEndpoint, realtimeParameters);
    MockWebSocket.instances = [];
    speechClient.connect();
    mockWebsocket = MockWebSocket.instances[0];
    expect(mockWebsocket.url).toBe(
      "wss://realtime.aiservice.testId.oci.oraclecloud.com/ws/transcribe/stream?isAckEnabled=false&encoding=audio/raw;rate=16000&shouldIgnoreInvalidCustomizations=false&partialSilenceThresholdInMs=0&finalSilenceThresholdInMs=2000&stabilizePartialResults=NONE&languageCode=en-US&modelDomain=GENERIC&punctuation=AUTO&customizations=%5B%22test%22%5D"
    );
  });

  it("should parse parameters whisper", () => {
    const realtimeParameters: RealtimeParameters = {
      isAckEnabled: false,
      languageCode: "en",
      modelDomain: RealtimeParameters.ModelDomain.Generic,
      modelType: "WHISPER",
      encoding: "audio/raw;rate=16000",
      punctuation: RealtimeParameters.Punctuation.Auto,
    } as RealtimeParameters;
    realtimeEndpoint = "wss://realtime.aiservice.testId.oci.oraclecloud.com";
    region = {
      regionId: "testId",
    } as any;
    speechClient = new RealtimeSpeechClient(mockListener, provider, region, compartmentId, realtimeEndpoint, realtimeParameters);
    MockWebSocket.instances = [];
    speechClient.connect();
    mockWebsocket = MockWebSocket.instances[0];
    expect(mockWebsocket.url).toBe(
      "wss://realtime.aiservice.testId.oci.oraclecloud.com/ws/transcribe/stream?isAckEnabled=false&encoding=audio/raw;rate=16000&languageCode=en&modelDomain=GENERIC&modelType=WHISPER&punctuation=AUTO"
    );
  });

  it("should close", () => {
    speechClient.close();
    expect(mockWebsocket.close).toHaveBeenCalled();
    mockWebsocket.close = jest.fn().mockImplementationOnce(() => {
      throw new Error("mock close error");
    });
    speechClient.close();
    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.ERROR);
    expect(mockListener.onError).toHaveBeenCalled();
  });

  it("should send final result", () => {
    const requestMessage: RealtimeMessageSendFinalResult = {
      event: RealtimeMessageSendFinalResult.event,
    };
    speechClient.requestFinalResult();
    expect(mockWebsocket.send).toHaveBeenCalledWith(JSON.stringify(requestMessage));
  });

  it("should handle connect exception", () => {
    jest.resetModules();
    jest.doMock("ws", () => jest.requireActual("ws"));

    const { RealtimeSpeechClient } = require("../src/client");
    const { RealtimeWebSocketState } = require("../src/client");

    speechClient = new RealtimeSpeechClient(mockListener, provider, region, compartmentId, 0 as any);
    speechClient.connect();

    expect(speechClient.getWebSocketState()).toBe(RealtimeWebSocketState.ERROR);
    expect(mockListener.onError).toHaveBeenCalled();
    expect(mockListener.onClose).toHaveBeenCalled();
  });
});
