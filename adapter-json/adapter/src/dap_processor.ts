import * as fs from "fs"
import { writeDapMessage } from "./dap_writer"
import { error, fail } from "./util_logging"
import { addJsonToVariables, VariableEntry, VariablesReference } from "./variables"

/**
 * 入力されたメッセージを処理する。
 */
export const processIncomingMessage = (message: unknown): void => {
  const req = validateAsDapRequest(message)
  if (req == null) {
    // (リクエストが形式的に無効なとき。エラー処理の方法は仕様に書いてなさそうなので、クラッシュさせる。)
    throw fail("Request parse error.")
  }

  try {
    switch (req.command) {
      case "initialize":
        writeAck(req)
        return

      case "launch":
        processLaunch(req)
        return

      case "disconnect":
        writeAck(req)
        process.exit(0)

      // 表示系
      case "threads":
        processThreads(req)
        return

      case "stackTrace":
        processStackTrace(req)
        return

      case "scopes":
        processScopes(req)
        return

      case "variables":
        processVariables(req)
        return

      default:
        throw new Error("Method not found.")
    }
  } catch (err) {
    error(String(err))

    writeDapMessage({
      seq: ++lastSeq,
      type: "response",
      request_seq: req.seq,
      command: req.command,
      success: false,
    })
  }
}

// -----------------------------------------------
// 定数値や状態など
// -----------------------------------------------

/**
 * メインスレッドの ID
 */
const MAIN_THREAD_ID = 1

/**
 * メインスレッドに1つだけあるスタックフレームの ID
 */
const MAIN_FRAME_ID = 1

/**
 * メインスコープの variablesReference の値。
 *
 * このスコープに変数が含まれていることにする。
 */
const MAIN_SCOPE: VariablesReference = 1

/**
 * メッセージにつける連番の最後の値
 * (`++lastSeq` で値を増やしつつ次の値を取得できる。)
 */
let lastSeq = 0

let variableMap = new Map<VariablesReference, VariableEntry[]>()

// -----------------------------------------------
// launch
// -----------------------------------------------

const processLaunch = (req: DapRequest): void => {
  const args = req.arguments as { sourceFile: string }

  // JSON ファイルを開いて、「スコープ」に「変数」を追加する。
  const jsonText = fs.readFileSync(args.sourceFile).toString()
  addJsonToVariables(jsonText, MAIN_SCOPE, variableMap)

  // デバッギの「起動」に成功したとみなして launch リクエストにレスポンスを返す。
  writeAck(req)

  // デバッギの「実行」が中断したことを通知する。
  // (デバッギの中断に反応してエディタはリクエストを送ってくる。
  //  Overview の "Stopping and accessing debuggee state" のあたりを参照。)
  writeDapMessage({
    seq: ++lastSeq,
    type: "event",
    event: "stopped",
    body: {
      reason: "entry",
      threadId: MAIN_THREAD_ID,
    }
  })
}

// -----------------------------------------------
// 表示系
// -----------------------------------------------

/**
 * threads リクエストを処理する。
 * ここでは常に1つのスレッドだけあるとする。
 *
 * <https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Threads>
 */
const processThreads = (req: DapRequest): void => {
  writeDapMessage({
    seq: ++lastSeq,
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
  return
}

/**
 * stackTrace リクエストを処理する。
 * ここでは常に1つのフレームだけあるとする。
 *
 * https://microsoft.github.io/debug-adapter-protocol/specification#Requests_StackTrace
 * https://microsoft.github.io/debug-adapter-protocol/specification#Types_StackFrame
 */
const processStackTrace = (req: DapRequest): void => {
  const args = req.arguments as {
    threadId: number,
    startFrame?: number,
    levels?: number,
  }

  let allStackFrames: StackFrame[] = []

  // スレッドのスタックフレームのリストを返す。
  if (args.threadId === MAIN_THREAD_ID) {
    allStackFrames = [
      {
        id: MAIN_FRAME_ID,
        name: "main",
        line: 0, // ソース位置情報がなくても line, column は必須らしい。
        column: 0,
      }
    ]
  }

  // startFrame/levels が指定されているときは一部だけ返す。
  const start = args.startFrame ?? 0

  const len = args.levels != null && args.levels !== 0
    ? args.levels
    : allStackFrames.length

  const stackFrames = allStackFrames.slice(start, start + len)

  writeDapMessage({
    seq: ++lastSeq,
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: {
      stackFrames,
      totalFrameCount: allStackFrames.length,
    },
  })
  return
}

/**
 * scopes リクエストを処理する。
 * ここでは常に1つのスコープだけあるとする。
 *
 * https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Scopes
 * https://microsoft.github.io/debug-adapter-protocol/specification#Types_Scope
 */
const processScopes = (req: DapRequest): void => {
  const args = req.arguments as { frameId: number }

  let scopes: Scope[] = []
  if (args.frameId === MAIN_FRAME_ID) {
    scopes = [
      {
        name: "メインスコープ",
        variablesReference: MAIN_SCOPE,
        expensive: false,
      },
    ]
  }

  writeDapMessage({
    seq: ++lastSeq,
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: { scopes },
  })
  return
}

/**
 * variables リクエストを処理する。
 * variablesReference が指す変数が持っている他の変数 (配列の要素やオブジェクトのプロパティ) を列挙して返す。
 *
 * https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Variables
 * https://microsoft.github.io/debug-adapter-protocol/specification#Types_Variable
 */
const processVariables = (req: DapRequest): void => {
  const args = req.arguments as {
    variablesReference: number

    filter?: "indexed" | "named"
    start?: number
    count?: number
  }

  let variables: VariableEntry[] =
    variableMap.get(args.variablesReference) ?? []

  // 表示する項目の種類を制限する。
  if (args.filter != null) {
    variables = variables.filter(entry => entry.kind === args.filter)
  }

  // 表示件数の制限を適用する。
  if (args.start != null || args.count != null) {
    const start = args.start ?? 0
    const count = args.count ?? variables.length
    variables = variables.slice(start, start + count)
  }

  // VariableEntry -> Variable に値を詰め替える。(kind プロパティが余剰なため。)
  const vs: Variable[] = variables.map(entry => ({
    name: entry.name,
    value: entry.value,
    variablesReference: entry.variablesReference,
  }))

  writeDapMessage({
    seq: ++lastSeq,
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
    body: { variables: vs },
  })
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

interface DapRequest {
  seq: number
  type: "request"
  command: string
  arguments?: unknown
}

const validateAsDapRequest = (message: unknown): DapRequest | null => {
  const m: Partial<DapRequest> | null = typeof message === "object" && !(message instanceof Array)
    ? message
    : null
  if (m == null) {
    return null
  }

  return m["type"] === "request"
    && typeof m["seq"] === "number"
    && typeof m["command"] === "string"
    ? m as DapRequest
    : null
}

// 必須項目のみ
interface StackFrame {
  id: number
  name: string

  line: 0
  column: 0
}

// 必須項目のみ
interface Scope {
  name: string
  variablesReference: number
  expensive: boolean
}

// 必須項目のみ
interface Variable {
  name: string
  value: string
  variablesReference: number
}

/**
 * リクエストに対して、パラメータなしの成功レスポンスを送る。
 */
const writeAck = (req: DapRequest): void => {
  writeDapMessage({
    seq: ++lastSeq,
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
  })
}
