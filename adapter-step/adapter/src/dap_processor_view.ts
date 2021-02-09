// 表示系 (スレッド、変数など) の処理

// 変数の情報は提供しない。
// 実行の中断時に位置情報をデバッガーに伝えるため、スタックフレームの情報は提供する。

import { getDebuggee as getDebuggee, freshSeq, MAIN_THREAD_ID, initialPos } from "./dap_state"
import { writeDapMessage } from "./dap_writer"
import { DapRequest } from "./dap_processor"
import * as assert from "assert"

export const processThreadsRequest = (req: DapRequest): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: {
      threads: [
        { id: MAIN_THREAD_ID, name: "メインスレッド" },
      ],
    },
  })
}

export const processStackTraceRequest = (req: DapRequest): void => {
  const args = req.arguments as {
    threadId: number,
    startFrame?: number,
    levels?: number,
  }

  let allStackFrames: StackFrame[] = []

  // スレッドのスタックフレームのリストを返す。
  if (args.threadId === MAIN_THREAD_ID) {
    const d = getDebuggee()
    for (const frame of [...d.stack, d.current]) {
      const { frameId, program, pc } = frame

      assert.ok(pc < program.commands.length)
      const command = program.commands[pc]

      allStackFrames.push({
        id: frameId,
        name: program.name,
        source: {
          path: program.path,
        },
        line: initialPos.row + command.row,
        column: initialPos.column,
      })
    }

    allStackFrames.reverse()
  }

  // startFrame/levels が指定されているときは一部だけ返す。
  const start = args.startFrame ?? 0

  const len = args.levels != null && args.levels !== 0
    ? args.levels
    : allStackFrames.length

  const stackFrames = allStackFrames.slice(start, start + len)

  writeDapMessage({
    seq: freshSeq(),
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: {
      stackFrames,
      totalFrameCount: allStackFrames.length,
    },
  })
}

export const processScopesRequest = (req: DapRequest): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: { scopes: [] },
  })
}

export const processVariablesRequest = (req: DapRequest): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: { variables: [] },
  })
}

// https://microsoft.github.io/debug-adapter-protocol/specification#Types_Source
// いま必要な部分のみ
interface Source {
  name?: string
  path?: string
}

// https://microsoft.github.io/debug-adapter-protocol/specification#Types_StackFrame
// いま必要な部分のみ
interface StackFrame {
  id: number
  name: string

  source: Source
  line: number
  column: number
}
