// 文字列と UTF-8 バイト列の相互変換

import { TextDecoder, TextEncoder } from "util"

/**
 * [#TextEncoder](https://nodejs.org/api/all.html#util_class_util_textencoder)
 */
const encoder = new TextEncoder()

/**
 * [#TextDecoder](https://nodejs.org/api/all.html#globals_textdecoder)
 */
const decoder = new TextDecoder()

/**
 * 文字列を UTF-8 バイト列に変換する。
 */
export const encodeUtf8 = (s: string): Uint8Array =>
  encoder.encode(s)

/**
 * バイト列を UTF-8 エンコーディングとみなして文字列に変換する。
 */
export const decodeUtf8 = (bytes: Uint8Array): string =>
  decoder.decode(bytes)
