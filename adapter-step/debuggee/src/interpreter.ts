import { Ast, Expr, Name, Pos, Stmt } from "./syntax"

export class RuntimeError extends Error {
  constructor(
    public message: string,
    public readonly pos: Pos,
  ) {
    super(message)
  }
}

/**
 * インタプリタの実行環境
 */
export interface InterpreterHost {
  ast: Ast

  /**
   * 文を実行する前に呼ばれる。
   */
  onStep(Pos: Pos): Promise<void>

  /**
   * debugger 文の実行時に呼ばれる。
   */
  onDebugger(pos: Pos): Promise<void>

  /**
   * ラインタイムエラーの発生時に呼ばれる。
   */
  onError(err: RuntimeError): never
}

/**
 * インタプリタの状態
 */
export interface Interpreter {
  it: Var
  valueEnv: Map<string, Var>[]
  procEnv: Map<string, Proc>[]
  host: InterpreterHost
}

interface Var {
  contents: unknown
}

/**
 * 環境から変数を探す。
 */
const resolveAsValue = (name: string, e: Interpreter): Var | null =>
  pickLast(e.valueEnv, map => map.get(name)) ?? null

/**
 * 環境から手続きを探す。
 */
const resolveAsProc = (name: string, e: Interpreter): Proc | null =>
  pickLast(e.procEnv, map => map.get(name)) ?? null

const enterScope = (e: Interpreter): void => {
  e.valueEnv.push(new Map())
  e.procEnv.push(new Map())
}

const leaveScope = (e: Interpreter): void => {
  e.valueEnv.pop()
  e.procEnv.pop()
}

// -----------------------------------------------
// 式の評価
// -----------------------------------------------

const evalExpr = (expr: Expr, e: Interpreter): unknown => {
  switch (expr.kind) {
    case "missing":
      throw unreachable() // 構文エラーがあるときは実行されない。

    case "var": {
      const v =
        resolveAsValue(expr.name.text, e)
        ?? e.host.onError(new RuntimeError("変数は定義されていません。", expr.name.pos))
      return v.contents
    }
    case "literal":
      return eval(expr.text) as unknown

    default:
      throw never(expr)
  }
}

// -----------------------------------------------
// 宣言の処理
// -----------------------------------------------

/**
 * proc で宣言されている手続きや、assign されている変数を環境に入れる。
 */
const declareStmt = (stmt: Stmt, e: Interpreter): void => {
  switch (stmt.kind) {
    case "proc": {
      last(e.procEnv).set(stmt.name.text, stmt)
      return
    }
    case "assign": {
      const v = resolveAsValue(stmt.name.text, e)
      if (v == null) {
        last(e.valueEnv).set(stmt.name.text, { contents: null })
      }
      return
    }
    default:
      return
  }
}

// -----------------------------------------------
// 文の実行
// -----------------------------------------------

/**
 * 文を実行する。
 */
const runStmt = async (stmt: Stmt, e: Interpreter): Promise<void> => {
  // ステップ実行中なら文の前で止まる。
  await e.host.onStep(stmt.pos)

  switch (stmt.kind) {
    case "debugger":
      await e.host.onDebugger(stmt.pos)
      return

    case "assign": {
      const value = evalExpr(stmt.init, e)
      const v = resolveAsValue(stmt.name.text, e) ?? unreachable()
      v.contents = value
      return
    }
    case "call": {
      const proc =
        resolveAsProc(stmt.name.text, e)
        ?? e.host.onError(new RuntimeError("手続きが定義されていません。", stmt.name.pos))

      const args = stmt.args.map(arg => evalExpr(arg, e))

      switch (proc.kind) {
        case "primitive": {
          e.it.contents = proc.f(args, e)
          return
        }
        case "proc": {
          await runBlock(proc.body, e => {
            for (let i = 0; i < Math.min(proc.params.length, args.length); i++) {
              last(e.valueEnv).set(proc.params[i].text, { contents: args[i] })
            }
          }, e)
          return
        }
        default:
          throw never(proc)
      }
    }
    case "if": {
      const cond = evalExpr(stmt.cond, e)
      if (cond) {
        await runBlock(stmt.body, pass, e)
      }
      return
    }
    case "proc":
      return

    case "js": {
      if (stmt.args.length === 0) {
        throw new RuntimeError("js 文には少なくとも1つの引数が必要です。", stmt.pos)
      }

      let code = String(evalExpr(stmt.args[0], e))
      for (let i = 1; i < stmt.args.length; i++) {
        const value = String(evalExpr(stmt.args[i], e))
        code = code.split("$" + i).join(value)
      }

      // console.log("trace: js:", code)
      e.it.contents = eval(code) as unknown
      return
    }
    default:
      throw never(stmt)
  }
}

const runBlock = async (stmts: Stmt[], init: (e: Interpreter) => void, e: Interpreter): Promise<void> => {
  enterScope(e)

  for (const stmt of stmts) {
    declareStmt(stmt, e)
  }

  init(e)

  for (const stmt of stmts) {
    await runStmt(stmt, e)
  }

  leaveScope(e)
}

export const runInterpreter = (host: InterpreterHost): Promise<void> => {
  const it: Var = { contents: null }

  const valueMap = new Map<string, Var>([
    ...constants.map(([key, value]): [string, Var] => (
      [key, { contents: value }]
    )),
    ["it", it],
  ])

  const e: Interpreter = {
    it,
    valueEnv: [valueMap],
    procEnv: [new Map(primitives)],
    host,
  }
  return runBlock(host.ast.stmts, pass, e)
}

// -----------------------------------------------
// 手続き
// -----------------------------------------------

type Proc =
  {
    kind: "proc"
    name: Name
    params: Name[]
    body: Stmt[]
    pos: Pos
  } | {
    kind: "primitive"
    name: string
    f: PrimitiveFn
  }

type PrimitiveFn = (args: unknown[], i: Interpreter) => unknown

// -----------------------------------------------
// プリミティブなど
// -----------------------------------------------

const constants: Array<[string, unknown]> = [
  ["null", null],
  ["false", false],
  ["true", true],
]

const regularPrimitiveTable: Array<[string, Function]> = [
  ["p", (...args: unknown[]) => console.log(...args)],
  ["log", (...args: unknown[]) => console.log(...args)],

  ["add", (x: any, y: any) => x + y],
  ["sub", (x: any, y: any) => x - y],
  ["mul", (x: any, y: any) => x * y],
  ["div", (x: any, y: any) => x / y],
  ["mod", (x: any, y: any) => x % y],
  ["pow", (x: any, y: any) => x ** y],
]

const regularPrimitives: Array<[string, Proc]> = regularPrimitiveTable.map(([name, f]) => [
  name,
  {
    kind: "primitive",
    name,
    f: (args: unknown[]) => f(...args),
  },
])

const statefulPrimitiveTable: Array<[string, PrimitiveFn]> = [
  ["is_null", (_args, e) => resolveAsValue("it", e) == null]
]

const statefulPrimitives: Array<[string, Proc]> =
  statefulPrimitiveTable.map(([name, f]) => [
    name,
    {
      kind: "primitive",
      name,
      f,
    },
  ])

const primitives = [
  ...regularPrimitives,
  ...statefulPrimitives,
]

// -----------------------------------------------
// 補助
// -----------------------------------------------

const pass = (): void => {
  // Pass.
}

const never = (never: never): never => never

const unreachable = (): never => {
  throw new Error("unreachable")
}

/**
 * 配列の最後の要素
 */
const last = <T>(array: T[]): T => {
  if (array.length === 0) {
    throw new Error("Empty array.")
  }

  return array[array.length - 1]
}

/**
 * 配列の各要素に関数を適用して、最後に出てきた null でない値を返す。
 */
const pickLast = <T, U>(array: T[], f: (value: T) => U | null): U | null => {
  for (let i = array.length; i >= 1;) {
    i--
    const value = f(array[i])
    if (value != null) {
      return value
    }
  }
  return null
}
