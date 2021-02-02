// DAP メッセージを標準出力に書く。

import { JsonObject } from "./util_json"
import { encodeUtf8 } from "./util_utf8"

export const writeDapMessage = (message: JsonObject): void => {
  const json = JSON.stringify({
    ...message,
    jsonrpc: "2.0",
  }) + "\r\n" // 出力を見やすくするため、末尾に改行をつけておく。

  const encodedJson = encodeUtf8(json)
  const contentLength = encodedJson.length

  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n`)
  process.stdout.write(encodedJson)
}
