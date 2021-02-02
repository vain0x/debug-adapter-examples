import { writeDapMessage } from "./dap_writer"
import { JsonRpcError } from "./json_rpc_error"
import { JsonObject, JsonValue } from "./util_json"
import { error } from "./util_logging"

// メッセージにつける連番の最後の値 (`++lastSeq` で値を増やしつつ次の値を取得できる。)
let lastSeq = 0

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: JsonValue): void => {
  try {
    const req = validateAsDapRequest(message)
    if (req == null) {
      throw JsonRpcError.INVALID_REQUEST
    }

    switch (req.command) {
      case "initialize":
        writeAck(req)
        return

      case "launch":
        // launch コマンドが来たらプロセスを起動してデバッグを開始するが、
        // このアダプタは何もしない。

        writeAck(req)

        // このアダプタが動いていることを確認するため、デバッガーにメッセージを送る。
        writeDapMessage({
          seq: ++lastSeq,
          type: "event",
          event: "output",
          body: {
            output: "Hello debugger!",
          },
        })

        // デバッグされているプロセスが終了した旨を報告する。
        // (プロセスが起動後に即終了した状況を再現している。)
        writeDapMessage({
          seq: ++lastSeq,
          type: "event",
          event: "terminated",
        })
        return

      case "disconnect":
        writeAck(req)
        process.exit(0)

      default:
        throw JsonRpcError.METHOD_NOT_FOUND
    }
  } catch (err) {
    // 処理中にエラーが起こったときは JSON-RPC の仕様にのっとってエラーを送信する。
    if (!(err instanceof JsonRpcError)) {
      error(String(err))

      err = JsonRpcError.INTERNAL
    }

    writeDapMessage({
      code: err.code,
      message: err.message,
    })
  }
}
// -----------------------------------------------
// 補助
// -----------------------------------------------

interface DapRequest {
  seq: number
  type: "request"
  command: string
  args?: JsonValue
}

const validateAsJsonObject = (value: JsonValue): JsonObject | null =>
  typeof value === "object" && !(value instanceof Array)
    ? value
    : null

const validateAsDapRequest = (message: JsonValue): DapRequest | null => {
  const obj = validateAsJsonObject(message)
  if (obj == null) {
    return null
  }

  // HACK: m["type"] === request という検査から m <: { type: "request" } という型付けを帰結するには、
  //       前もって m に「省略可能プロパティ type を含む型」({ type?: unknown } など) をつけておく必要がある。
  //       DapRequest のそれぞれのプロパティを (省略可能な状態で) 持つ型は Partial<DapRequest> と書ける。
  const m: Partial<DapRequest> = obj
  return m["type"] === "request"
    && typeof m["seq"] === "number"
    && typeof m["command"] === "string"
    ? m as DapRequest
    : null
}

/**
 * リクエストに対して、パラメータなしの成功レスポンスを送る。
 */
const writeAck = (req: DapRequest): void => {
  writeDapMessage({
    seq: ++lastSeq,
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
  })
}
