import { TextDecoder, TextEncoder } from "util"

const encoder = new TextEncoder()
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
