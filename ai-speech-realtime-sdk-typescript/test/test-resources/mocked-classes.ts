import { RealtimeMessageAckAudio, RealtimeMessageConnect, RealtimeMessageResult } from "oci-aispeech/lib/model";
import { CloseEvent, Event } from "ws";
import { RealtimeSpeechClientListener } from "../../src/client";

export const MockListener: RealtimeSpeechClientListener = {
  onClose: jest.fn((closeEvent: CloseEvent) => {
    console.log("onClose: ", closeEvent);
  }),
  onConnect: jest.fn((openEvent: Event) => {
    console.log("onConnect: ", openEvent);
  }),
  onError: jest.fn((errorEvent: Error) => {
    console.log("onError: ", errorEvent);
  }),
  onConnectMessage: jest.fn((connectMessage: RealtimeMessageConnect) => {
    console.log("onConnectMessage: ", connectMessage);
  }),
  onResult: jest.fn((resultMessage: RealtimeMessageResult) => {
    console.log("onResult: ", resultMessage);
  }),
  onAckAudio: jest.fn((ackMessage: RealtimeMessageAckAudio) => {
    console.log("onAckAudio: ", ackMessage);
  }),
};

// Mock implementation of WebSocket
export class MockWebSocket {
  static instances: MockWebSocket[] = []; // Track created instances
  constructor(url: string) {
      if (!url || typeof url !== "string") {
          throw new Error("A valid WebSocket URL must be provided.");
      }
      this.url = url; // Capture the provided URL
      MockWebSocket.instances.push(this); // Track this instance
  }
  url = ""
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  send = jest.fn();
  close = jest.fn();

  // Simulate opening the connection
  simulateOpen() {
    if (this.onopen) {
      this.onopen();
    }
  }

  // Simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  // Simulate closing the connection
  simulateClose(event: Partial<CloseEvent> = {}) {
    if (this.onclose) {
      this.onclose(event as CloseEvent);
    }
  }

  // Simulate an error
  simulateError(event: ErrorEvent) {
    if (this.onerror) {
      this.onerror(event);
    }
  }
}
