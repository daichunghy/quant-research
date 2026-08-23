#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalize } from "./core/canonical.js";
import { isRecord } from "./core/parse.js";
import { COMPILER_VERSION } from "./core/types.js";
import { executeTool } from "./tools/execute.js";
import { TOOL_SCHEMAS } from "./tools/index.js";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

const MCP_TOOLS = Object.values(TOOL_SCHEMAS).map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.parameters,
}));

function textResult(value: unknown, isError = false): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const payload = { content: [{ type: "text" as const, text: canonicalize(value) }] };
  return isError ? { ...payload, isError: true } : payload;
}

export async function handleMcpMessage(message: unknown): Promise<Record<string, unknown> | undefined> {
  if (!isRecord(message)) {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "invalid request" } };
  }
  const req = message as JsonRpcRequest;
  const id = req.id ?? null;
  if (req.method === "notifications/initialized" || req.method === "notifications/cancelled") {
    return undefined;
  }
  if (req.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "agentbiz-quant-research", version: COMPILER_VERSION },
      },
    };
  }
  if (req.method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }
  if (req.method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } };
  }
  if (req.method === "tools/call") {
    const params = isRecord(req.params) ? req.params : {};
    const name = typeof params.name === "string" ? params.name : undefined;
    const args = isRecord(params.arguments) ? params.arguments : {};
    if (name === undefined) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: "name is required" } };
    }
    const executed = executeTool(name, args);
    return { jsonrpc: "2.0", id, result: textResult(executed, !executed.ok) };
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${String(req.method)}` } };
}

export async function runMcpStdio(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  let buffer = Buffer.alloc(0);
  for await (const chunk of input) {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }
      const header = buffer.subarray(0, headerEnd).toString("utf8");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (lengthMatch === null || lengthMatch[1] === undefined) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = Number.parseInt(lengthMatch[1], 10);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) {
        break;
      }
      const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
      buffer = buffer.subarray(bodyStart + length);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        continue;
      }
      const response = await handleMcpMessage(parsed);
      if (response === undefined) {
        continue;
      }
      const payload = Buffer.from(`${JSON.stringify(response)}\n`, "utf8");
      output.write(`Content-Length: ${payload.length}\r\n\r\n`);
      output.write(payload);
    }
  }
}

function isMain(): boolean {
  const argvPath = process.argv[1];
  if (!argvPath) {
    return false;
  }
  try {
    return realpathSync(argvPath) === fileURLToPath(import.meta.url);
  } catch {
    return argvPath.includes("mcp");
  }
}

if (isMain()) {
  runMcpStdio().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  });
}
