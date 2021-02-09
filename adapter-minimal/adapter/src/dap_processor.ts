import { writeDapMessage } from "./dap_writer"
import { error, fail } from "./util_logging"

// メッセージにつける連番の最後の値 (`++lastSeq` で値を増やしつつ次の値を取得できる。)
let lastSeq = 0

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: unknown): void => {
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
  arguments?: unknown
}

// TypeScript ヒント: これは単に Partial<DapRequest> と書ける。
interface PartialDapRequest {
  seq?: number
  type?: "request"
  command?: string
  argument?: unknown
}

const validateAsDapRequest = (message: unknown): DapRequest | null => {
  // message がオブジェクトであることを検査する。
  if (!(typeof message === "object" && !(message instanceof Array) && message != null)) {
    return null
  }

  // 所定のプロパティを持つことを検査する。
  const { type, seq, command }: PartialDapRequest = message
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
