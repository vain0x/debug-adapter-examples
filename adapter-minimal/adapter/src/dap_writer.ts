// DAP メッセージを標準出力に書く。

import { encodeUtf8 } from "./util_utf8"

/**
 * DAP のレスポンスメッセージを標準出力に書く。
 */
export const writeDapResponse = (seq: number, requestSeq: number, requestCommand: string, body?: unknown): void => {
  const json = JSON.stringify({
    jsonrpc: "2.0",
    seq,
    "request_seq": requestSeq,
    command: requestCommand,
    body,
  }) + "\r\n" // ログを読みやすくするため、末尾に改行をつけておく。

  const encodedJson = encodeUtf8(json)
  const contentLength = encodedJson.length

  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n`)
  process.stdout.write(encodedJson)
}
