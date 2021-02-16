// DAP アダプタの処理の本体部分

import { writeDapMessage } from "./dap_writer"
import { error, fail } from "./util_logging"
import { PlainObject } from "./util_plain_object"

// メッセージにつける連番の最後の値 (`++lastSeq` で値を増やしつつ次の値を取得できる。)
let lastSeq = 0

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: PlainObject): void => {
  const req = validateAsDapRequest(message)
  if (req == null) {
    // (リクエストが形式的に無効なとき。)
    throw fail("リクエストではないメッセージは処理できません。")
  }

  try {
    switch (req.command) {
      case "initialize":
        // 成功レスポンスを返す。(capabilities を指定しないので body は省略できる。)
        writeAck(req)
        return

      case "launch":
        // launch コマンドが来たらプロセスを起動してデバッグを開始するが、
        // このアダプタは何もしない。起動したという想定で成功レスポンスを返す。
        writeAck(req)

        // このアダプタが動いていることを確認するため、デバッガにメッセージを送る。
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
        throw new Error("この種類のリクエストの処理は実装されていません。")
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
  arguments?: unknown
}

/**
 * オブジェクトが DAP リクエストか検査する。
 */
const validateAsDapRequest = (message: PlainObject): DapRequest | null => {
  const { type, seq, command } = message
  return type === "request"
    && typeof seq === "number"
    && typeof command === "string"
    ? { ...message, type, seq, command }
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
