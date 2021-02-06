// adapter-minimal と同様。

import { processIncomingMessage } from "./dap_processor"
import { debug, error, fail } from "./util_logging"
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
      processIncomingMessage(result.message) // dap_processor.ts を参照。
    }
  })
}

const extractSingleMessageFromBuffer = (): { message: unknown } | null => {
  const headerEndIndex = findIndex(buffer, "\r\n\r\n")
  if (headerEndIndex == null) {
    return null
  }
  const bodyIndex = headerEndIndex + 4

  const headerPart = decodeUtf8(buffer.slice(0, bodyIndex))

  let contentLength: number | null = null
  for (const line of headerPart.split("\r\n")) {
    let [key, value] = line.split(":").map(part => part.trim())

    if (key === "Content-Length") {
      contentLength = Number.parseInt(value)
      continue
    }

    if (key !== "") {
      error("Unknown header.", key)
    }
  }
  if (contentLength == null) {
    throw fail("Content-Length missing.")
  }

  const bodyPart = buffer.slice(bodyIndex, bodyIndex + contentLength)
  const body = JSON.parse(decodeUtf8(bodyPart)) as unknown

  buffer = buffer.slice(bodyIndex + contentLength)

  debug("read", body)
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
