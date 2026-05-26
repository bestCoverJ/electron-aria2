import { randomUUID } from "node:crypto";

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

  changeGlobalOption(options: Record<string, string>): Promise<string> {
    return this.call<string, [Record<string, string>]>({
      method: "aria2.changeGlobalOption",
      params: [options],
    });
  }

  addUri(uris: string[], options: Record<string, string>): Promise<string> {
    return this.call<string, [string[], Record<string, string>]>({
      method: "aria2.addUri",
      params: [uris, options],
    });
  }

  addTorrent(
    torrentBase64: string,
    options: Record<string, string>,
  ): Promise<string> {
    return this.call<string, [string, string[], Record<string, string>]>({
      method: "aria2.addTorrent",
      params: [torrentBase64, [], options],
    });
  }

  addMetalink(
    metalinkBase64: string,
    options: Record<string, string>,
  ): Promise<string> {
    return this.call<string, [string, Record<string, string>]>({
      method: "aria2.addMetalink",
      params: [metalinkBase64, options],
    });
  }

  pause(gid: string): Promise<string> {
    return this.call<string, [string]>({
      method: "aria2.pause",
      params: [gid],
    });
  }

  unpause(gid: string): Promise<string> {
    return this.call<string, [string]>({
      method: "aria2.unpause",
      params: [gid],
    });
  }

  remove(gid: string): Promise<string> {
    return this.call<string, [string]>({
      method: "aria2.remove",
      params: [gid],
    });
  }

  forceRemove(gid: string): Promise<string> {
    return this.call<string, [string]>({
      method: "aria2.forceRemove",
      params: [gid],
    });
  }

  removeDownloadResult(gid: string): Promise<string> {
    return this.call<string, [string]>({
      method: "aria2.removeDownloadResult",
      params: [gid],
    });
  }

  tellActive<TResult>(): Promise<TResult[]> {
    return this.call<TResult[]>({ method: "aria2.tellActive" });
  }

  tellWaiting<TResult>(offset = 0, count = 1000): Promise<TResult[]> {
    return this.call<TResult[], [number, number]>({
      method: "aria2.tellWaiting",
      params: [offset, count],
    });
  }

  tellStopped<TResult>(offset = 0, count = 1000): Promise<TResult[]> {
    return this.call<TResult[], [number, number]>({
      method: "aria2.tellStopped",
      params: [offset, count],
    });
  }
}
