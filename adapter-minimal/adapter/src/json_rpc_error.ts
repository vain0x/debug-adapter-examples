export class JsonRpcError extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) {
    super(message)
  }

  public static readonly INVALID_REQUEST: JsonRpcError =
    new JsonRpcError(-32600, "Invalid request.")

  public static readonly METHOD_NOT_FOUND: JsonRpcError =
    new JsonRpcError(-32601, "Method not found.")

  public static readonly INTERNAL: JsonRpcError =
    new JsonRpcError(-32603, "Internal error.")
}
