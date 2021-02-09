// 定数値や状態など

import { DebuggeeRuntime } from "./debuggee_runtime"
import * as assert from "assert"

/**
 * メインスレッドの ID
 */
export const MAIN_THREAD_ID = 1

/**
 * メッセージにつける連番の値を生成する。
 */
export const freshSeq = (): number => ++lastSeq

let lastSeq = 0

export const getDebuggee = (): DebuggeeRuntime => {
  assert.ok(currentDebuggee != null)
  return currentDebuggee
}

export const setDebuggee = (d: DebuggeeRuntime): void => {
  assert.ok(currentDebuggee == null)
  currentDebuggee = d
}

let currentDebuggee: DebuggeeRuntime | null = null

export const initialPos = {
  row: 0,
  column: 0,
}
