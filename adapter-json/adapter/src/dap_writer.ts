// adapter-minimal と同様。

// DAP メッセージを標準出力に書く。

import { debug } from "./util_logging"
import { encodeUtf8 } from "./util_utf8"

export const writeDapMessage = (message: unknown): void => {
  const json = JSON.stringify(message) + "\r\n" // 出力を見やすくするため、末尾に改行をつけておく。

  const encodedJson = encodeUtf8(json)
  const contentLength = encodedJson.length

  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n`)
  process.stdout.write(encodedJson)

  debug("write", message)
}
