// デバッギ: デバッグされるプログラム
// テキストファイルを「実行」するインタプリタのようなもの。

import * as assert from "assert"
import { basename, dirname, resolve } from "path"
import { parseFile, TextProgram } from "./debuggee_syntax"

let lastFrameId = 0

export class DebuggeeRuntime {
  // DAP アダプタがスタックフレームの情報を読めるように、フィールドを public にしている。
  readonly stack: Frame[] = []
  current: Frame

  constructor(
    path: string,
    private readonly writeOutput: (output: string) => void,
  ) {
    this.current = {
      frameId: ++lastFrameId,
      program: parseFile(basename(path), path),
      pc: 0,
    }

    this.assertInvariants()
  }

  private assertInvariants() {
    for (const frame of [...this.stack, this.current]) {
      assert.ok(frame.pc < frame.program.commands.length)
    }
  }

  /**
   * 次のコマンドを1つ、処理する。
   */
  stepIn(): StepStatus {
    const command = this.current.program.commands[this.current.pc]
    this.current.pc++

    switch (command.kind) {
      case "log":
        this.writeOutput(command.message)
        return "running"

      case "pause":
        return "paused"

      case "call": {
        const path = resolve(dirname(this.current.program.path), command.target)
        this.stack.push(this.current)
        this.current = {
          frameId: ++lastFrameId,
          program: parseFile(command.target, path),
          pc: 0,
        }
        return "running"
      }
      case "return": {
        const prev = this.stack.pop()
        if (prev == null) {
          this.current.pc-- // pc を範囲外にしないため。
          return "terminated"
        }

        this.current = prev
        return "running"
      }
      default:
        throw never(command)
    }
  }

  /**
   * 次に return するまでステップ実行する。
   */
  stepOut(): StepStatus {
    while (true) {
      const command = this.current.program.commands[this.current.pc]
      if (command.kind === "return") {
        return this.stepIn()
      }

      const status = this.stepIn()
      if (status !== "running") {
        return status
      }
    }
  }

  /**
   * 中断か停止するまで実行を進める。
   */
  doContinue(): ContinueStatus {
    while (true) {
      const status = this.stepIn()
      if (status !== "running") {
        return status
      }
    }
  }
}

/**
 * スタックフレーム
 */
interface Frame {
  frameId: number

  /**
   * 実行中のプログラム (テキストファイル)
   */
  program: TextProgram

  /**
   * プログラムカウンタ。いま何番目のコマンドにいるか。
   */
  pc: number
}

/**
 * ステップ実行の結果、デバッギの状態がどう変わったか。
 */
type StepStatus =
  "running"
  | "paused"
  | "terminated"

/**
 * 実行再開の結果、デバッギの状態がどう変わったか。
 */
type ContinueStatus =
  "paused"
  | "terminated"

// -----------------------------------------------
// 補助
// -----------------------------------------------

const never = (never: never): never => never
