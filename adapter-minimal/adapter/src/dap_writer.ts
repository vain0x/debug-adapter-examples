// DAP メッセージを開発ツールに送る部分

import { debug } from "./util_logging"
import { PlainObject } from "./util_plain_object"
import { encodeUtf8 } from "./util_utf8"

/**
 * DAP メッセージを標準出力に出力する。
 */
export const writeDapMessage = (message: PlainObject): void => {
  // メッセージを JSON 文字列にシリアライズする
  // 末尾に改行をつけているのは、単にログを見やすくするため。。
  const json = JSON.stringify(message) + "\r\n"

  // JSON 文字列を UTF-8 にエンコーディングする。
  // エンコーディング後の長さが Content-Length になる。(message.length と混同しないこと。)
  const encodedJson = encodeUtf8(json)
  const contentLength = encodedJson.length

  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n`)
  process.stdout.write(encodedJson)

  debug("write", message)
}
