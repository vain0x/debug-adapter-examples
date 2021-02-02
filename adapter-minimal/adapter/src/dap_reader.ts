// DAP メッセージを標準入力から読む。
//
// [Overview](https://microsoft.github.io/debug-adapter-protocol/overview)
// の Base Protocol のあたりを参照。

import { processIncomingMessage } from "./dap_processor"
import { JsonValue } from "./util_json"
import { decodeUtf8, encodeUtf8 } from "./util_utf8"

// 標準入力から読んだデータのうち、まだメッセージとしてパースしていないもの。
let buffer = Buffer.from([])

/**
 * 標準入力からの読み取りと処理を開始する。
 */
export const startReader = () => {
  process.stdin.on("readable", () => {
    // 読み取ったデータをバッファに追記する。
    while (process.stdin.readable) {
      const chunk = process.stdin.read() as Buffer | null
      if (chunk == null || chunk.length === 0) {
        break
      }

      buffer = Buffer.concat([buffer, chunk])
    }

    // バッファに溜まったデータをメッセージ単位に切り分けて、順次処理する。
    while (true) {
      const result = extractSingleMessageFromBuffer()
      if (result == null) {
        break
      }
      processIncomingMessage(result.message) // dap_process.ts を参照。
    }
  })
}

const extractSingleMessageFromBuffer = (): { message: JsonValue } | null => {
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
    let [key, value] = line.split(":").map(part => part.trim())

    if (key === "Content-Length") {
      contentLength = Number.parseInt(value)
      continue
    }

    if (key !== "") {
      console.error("WARN: Unknown header.", key)
    }
  }
  if (contentLength == null) {
    // (Content-Length は必須。エラー処理の方法は仕様に書いてなさそうなので、クラッシュさせる。)
    throw fail("Content-Length missing.")
  }

  // ボディを JSON としてパースする。(失敗時は例外を伝播する。)
  const bodyPart = buffer.slice(bodyIndex, bodyIndex + contentLength)
  const body = JSON.parse(decodeUtf8(bodyPart)) as JsonValue

  // バッファからメッセージを取り除く。
  buffer = buffer.slice(bodyIndex + contentLength)

  return { message: body }
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

const fail = (message: string): never => {
  console.error("ERROR:", message)
  process.exit(1)
}
