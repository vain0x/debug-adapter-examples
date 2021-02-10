import {
  processScopesRequest,
  processStackTraceRequest,
  processThreadsRequest,
  processVariablesRequest,
} from "./dap_processor_view"
import { getDebuggee, freshSeq, MAIN_THREAD_ID, setDebuggee, initialPos } from "./dap_state"
import { writeDapMessage } from "./dap_writer"
import { DebuggeeRuntime } from "./debuggee_runtime"
import { error, fail } from "./util_logging"

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
        processInitializeRequest(req)
        return

      case "launch":
        processLaunchRequest(req)
        return

      case "disconnect":
        writeAck(req)
        process.exit(0)

      // 実行制御系:
      case "continue":
        processContinueRequest(req)
        return

      // case "pause":
      //   processPauseRequest(req)
      //   return

      case "next":
      case "stepIn":
        processStepInRequest(req)
        return

      case "stepOut":
        processStepOutRequest(req)
        return

      // 表示系:
      case "threads":
        processThreadsRequest(req)
        return

      case "stackTrace":
        processStackTraceRequest(req)
        return

      case "scopes":
        processScopesRequest(req)
        return

      case "variables":
        processVariablesRequest(req)
        return

      default:
        throw new Error("Method not found.")
    }
  } catch (err) {
    // 処理中にエラーが起こったときはエラーレスポンスを返す。
    error(String(err))

    writeDapMessage({
      seq: freshSeq(),
      type: "response",
      request_seq: req.seq,
      command: req.command,
      success: false,
    })
  }
}

const processInitializeRequest = (req: DapRequest): void => {
  // 行番号や列番号が 1 で始まるか 0 で始まるかの設定
  const args = req.arguments as {
    linesStartAt1?: boolean
    columnsStartAt1?: boolean
  }

  initialPos.row = (args.linesStartAt1 ?? true) ? 1 : 0
  initialPos.column = (args.columnsStartAt1 ?? true) ? 1 : 0

  writeAck(req)
}

// -----------------------------------------------
// launch
// -----------------------------------------------

const processLaunchRequest = (req: DapRequest): void => {
  const args = req.arguments as { sourceFile: string }

  // デバッギを起動して、成功したらレスポンスを返す。
  const d = new DebuggeeRuntime(args.sourceFile, writeOutputEvent)
  setDebuggee(d)
  writeAck(req)

  // このアダプタが動いていることを確認するため、デバッガーにメッセージを送る。
  writeOutputEvent("(Launched.)")

  // デバッギが中断した状態で起動したということをデバッガーに伝える。
  writeStoppedEvent("entry")
}

const processContinueRequest = (req: DapRequest): void => {
  // デバッギの実行を再開する。
  const status = getDebuggee().doContinue()

  // (例外が投げられる可能性があるので、処理の後にレスポンスを返す。)
  writeAck(req)

  // デバッギの状況をデバッガーに伝えるためのイベントを発行する。
  switch (status) {
    case "paused":
      writeStoppedEvent("pause")
      return

    case "terminated":
      writeTerminatedEvent()
      return

    default:
      throw never(status)
  }
}

const processStepInRequest = (req: DapRequest): void => {
  // 1ステップだけ実行を進める。
  const status = getDebuggee().stepIn()

  // (例外が投げられる可能性があるので、処理の後にレスポンスを返す。)
  writeAck(req)

  switch (status) {
    case "running":
    case "paused":
      writeStoppedEvent("step")
      return

    case "terminated":
      writeTerminatedEvent()
      return

    default:
      throw never(status)
  }
}

const processStepOutRequest = (req: DapRequest): void => {
  // 1ステップだけ実行を進める。
  const status = getDebuggee().stepOut()

  // (例外が投げられる可能性があるので、処理の後にレスポンスを返す。)
  writeAck(req)

  switch (status) {
    case "running":
    case "paused":
      writeStoppedEvent("step")
      return

    case "terminated":
      writeTerminatedEvent()
      return

    default:
      throw never(status)
  }
}

// -----------------------------------------------
// イベントの発行
// -----------------------------------------------

const writeOutputEvent = (output: string): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "event",
    event: "output",
    body: {
      output: output + "\r\n",
    },
  })
}

// その他の値は仕様書を参照。
type StopReason = "entry" | "step" | "pause"

const writeStoppedEvent = (reason: StopReason): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "event",
    event: "stopped",
    body: {
      reason,
      threadId: MAIN_THREAD_ID,
    }
  })
}

const writeTerminatedEvent = (): void => {
  writeOutputEvent("(Terminated.)")

  writeDapMessage({
    seq: freshSeq(),
    type: "event",
    event: "terminated",
  })
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

const never = (never: never): never => never

export interface DapRequest {
  seq: number
  type: "request"
  command: string
  arguments?: unknown
}

// TypeScript ヒント: これは単に Partial<DapRequest> と書ける。
interface PartialDapRequest {
  seq?: number
  type?: "request"
  command?: string
  arguments?: unknown
}

const validateAsDapRequest = (message: unknown): DapRequest | null => {
  // message がオブジェクトであることを検査する。
  if (!(typeof message === "object" && !(message instanceof Array) && message != null)) {
    return null
  }

  // 所定のプロパティを持つことを検査する。
  const { type, seq, command }: PartialDapRequest = message
  return type === "request"
    && typeof seq === "number"
    && typeof command === "string"
    ? { ...message, type, seq, command }
    : null
}

/**
 * リクエストに対して、パラメータなしの成功レスポンスを送る。
 */
const writeAck = (req: DapRequest): void => {
  writeDapMessage({
    seq: freshSeq(),
    type: "response",
    request_seq: req.seq,
    command: req.command,
    success: true,
  })
}
