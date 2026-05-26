export interface Aria2RpcOptions {
  endpoint: string;
  secret: string;
}

export interface Aria2RpcRequest<TParams extends unknown[]> {
  method: string;
  params?: TParams;
}

interface Aria2RpcSuccess<TResult> {
  id: string;
  jsonrpc: "2.0";
  result: TResult;
}

interface Aria2RpcFailure {
  id: string;
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
}

type Aria2RpcResponse<TResult> = Aria2RpcSuccess<TResult> | Aria2RpcFailure;

export class Aria2RpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "Aria2RpcError";
  }
}

export class Aria2RpcClient {
  constructor(private readonly options: Aria2RpcOptions) {}

  async call<TResult, TParams extends unknown[] = unknown[]>(
    request: Aria2RpcRequest<TParams>,
  ): Promise<TResult> {
    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: randomUUID(),
        jsonrpc: "2.0",
        method: request.method,
        params: [`token:${this.options.secret}`, ...(request.params ?? [])],
      }),
    });

    if (!response.ok) {
      throw new Aria2RpcError(`aria2 RPC failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Aria2RpcResponse<TResult>;

    if ("error" in payload) {
      throw new Aria2RpcError(payload.error.message, payload.error.code);
    }

    return payload.result;
  }

  saveSession(): Promise<string> {
    return this.call<string>({ method: "aria2.saveSession" });
  }

  shutdown(): Promise<string> {
    return this.call<string>({ method: "aria2.shutdown" });
  }
}
import { randomUUID } from "node:crypto";
