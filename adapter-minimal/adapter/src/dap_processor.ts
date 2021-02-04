import { writeDapMessage } from "./dap_writer"
import { JsonObject, JsonValue } from "./util_json"
import { error, fail } from "./util_logging"

// メッセージにつける連番の最後の値 (`++lastSeq` で値を増やしつつ次の値を取得できる。)
let lastSeq = 0

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: JsonValue): void => {
  const req = validateAsDapRequest(message)
  if (req == null) {
    // (リクエストが形式的に無効なとき。エラー処理の方法は仕様に書いてなさそうなので、クラッシュさせる。)
    throw fail("Request parse error.")
  }

  try {
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
        throw new Error("Method not found.")
    }
  } catch (err) {
    // 処理中にエラーが起こったときはエラーレスポンスを返す。
    error(String(err))

    writeDapMessage({
      seq: ++lastSeq,
      type: "response",
      request_seq: req.seq,
      command: req.command,
      success: false,
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

  const m: Record<string, unknown> = obj
  return m["type"] === "request"
    && typeof m["seq"] === "number"
    && typeof m["command"] === "string"
    ? m as unknown as DapRequest
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
