import { writeDapResponse } from "./dap_writer"
import { JsonValue } from "./util_json"

let lastSeq = 0

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: JsonValue) => {
  // FIXME: 実装
  console.error("trace: process message", message)

  if (typeof message === "object"
    && !(message instanceof Array)
    && message != null
    && message["type"] === "request"
    && message["command"] === "disconnect") {
    writeDapResponse(++lastSeq, message?.["seq"] as number, message?.["command"] as string, null)

    console.error("trace: exit")
    process.exit(0)
  }
}
