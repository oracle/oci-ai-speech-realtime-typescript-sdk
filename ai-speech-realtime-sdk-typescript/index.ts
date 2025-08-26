/*
 **
 ** Copyright (c) 2024, 2025, Oracle and/or its affiliates
 ** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl/
 */

import * as AIServiceSpeechRealtimeClient from "./src/client";
import pkg from "./package.json";
export const version = pkg.version;
export * from "./src/client";
export default AIServiceSpeechRealtimeClient;
