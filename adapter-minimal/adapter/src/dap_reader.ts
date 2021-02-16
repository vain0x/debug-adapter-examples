// DAP メッセージを開発ツールから受け取る部分
//
// [Overview](https://microsoft.github.io/debug-adapter-protocol/overview)
// の Base Protocol のあたりを参照。

import { processIncomingMessage } from "./dap_processor"
import { debug, error, fail } from "./util_logging"
import { asPlainObject, PlainObject } from "./util_plain_object"
import { decodeUtf8, encodeUtf8 } from "./util_utf8"

// 標準入力から読んだデータを入れていくバッファ。
// (メッセージとしてパースできた部分は捨てられる。)
let buffer = Buffer.from([])

/**
 * 標準入力のイベントリスナーを登録して、読み取ったデータを処理する。
 *
 * 参考: [#stdin](https://nodejs.org/api/process.html#process_process_stdin)
 */
export const startReader = () => {
  process.stdin.on("readable", () => {
    // 読み取ったデータをバッファに追加する。
    while (process.stdin.readable) {
      const chunk: Buffer | null = process.stdin.read()
      if (chunk == null || chunk.length === 0) {
        break
      }

      buffer = Buffer.concat([buffer, chunk])
    }

    // バッファに溜まったデータをメッセージ単位に切り分けて、順次処理する。
    while (true) {
      const message = extractSingleMessageFromBuffer()
      if (message == null) {
        break
      }

      processIncomingMessage(message)
    }
  })
}

/**
 * バッファからメッセージを1つ取り出す。
 */
const extractSingleMessageFromBuffer = (): PlainObject | null => {
  // バッファに溜まったデータは、まだメッセージの一部だけかもしれないので、パースが成功するとは限らない。
  // (パースできなかったら何もせず、次にデータが届くのを待つ。)
  // 逆に、バッファにはすでに複数のメッセージが溜まっていることもある。
  // この関数では1つ目のメッセージをパースした後、そのメッセージの部分だけバッファから取り除く。

  // ヘッダー部分                ボディ部分   次のメッセージのヘッダー部分
  // <--------------->         <---------><-------------
  // Content-Length: 11\r\n\r\n{.........}Content-Length...

  // はじめにヘッダー部分とボディ部分の境界となる \r\n\r\n を見つける。
  const headerEndIndex = findIndex(buffer, "\r\n\r\n")
  if (headerEndIndex == null) {
    // データが足りない。
    return null
  }
  const bodyIndex = headerEndIndex + 4

  // ヘッダー部分を解析する。
  // いまのところ Content-Length の値だけ取得すればいい。
  const headerPart = decodeUtf8(buffer.slice(0, bodyIndex))

  let contentLength: number | null = null
  for (const line of headerPart.split("\r\n")) {
    const [key, value] = split(line, ":")

    if (key === "Content-Length") {
      contentLength = Number.parseInt(value, 10)
      continue
    }

    if (key !== "") {
      error("不明なヘッダー:", key)
    }
  }
  if (contentLength == null) {
    throw fail("Content-Length が指定されていません。")
  }

  // ボディを JSON オブジェクトとしてパースする。(失敗時は例外を伝播する。)
  const bodyPart = buffer.slice(bodyIndex, bodyIndex + contentLength)
  const body = parseJsonObject(decodeUtf8(bodyPart))

  // バッファからメッセージを取り除く。
  buffer = buffer.slice(bodyIndex + contentLength)

  debug("read", body)
  return body
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

/**
 * バッファから特定の文字列の位置を探す。
 */
const findIndex = (buffer: Buffer, patternString: string): number | null => {
  const pattern: Uint8Array = encodeUtf8(patternString)

  for (let i = 0; i + pattern.length <= buffer.length; i++) {
    const part = buffer.slice(i, i + pattern.length)
    if (part.compare(pattern) === 0) {
      return i
    }
  }
  return null
}

/**
 * 文字列を分割して配列にする。それぞれのパーツの前後の空白を除去する。
 */
const split = (s: string, sep: string): string[] =>
  s.split(sep).map(part => part.trim())

/**
 * JSON 文字列をオブジェクトとしてパースする。
 *
 * パースできなかったときや、オブジェクトではなかったときは例外を投げる。
 */
const parseJsonObject = (s: string): PlainObject => {
  const obj = asPlainObject(JSON.parse(s) as unknown)
  if (obj == null) {
    throw new Error("Expected an object.")
  }

  return obj
}
