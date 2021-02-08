// 構文解析

import * as assert from "assert"
import {
  Ast,
  Expr,
  Name,
  Pos,
  Range,
  Stmt,
  SyntaxError,
  TokenData,
  TokenKind,
} from "./syntax"

export interface ParseResult {
  ast: Ast
  errors: SyntaxError[]
}

// -----------------------------------------------
// パーサー
// -----------------------------------------------

class Parser {
  constructor(
    private readonly tokens: TokenData[],
    private readonly eof: Pos,
  ) { }

  private index: number = 0
  public readonly errors: SyntaxError[] = []

  /**
   * トークン列の末尾に達したか？
   */
  atEof(): boolean {
    return this.index === this.tokens.length
  }

  /**
   * 次のトークンの開始位置
   */
  nextPos(): Pos {
    return this.atEof()
      ? this.eof
      : this.tokens[this.index].pos
  }

  nextText(): string {
    return this.atEof()
      ? ""
      : this.tokens[this.index].text
  }

  /**
   * 次のトークンの種類
   */
  peek(): TokenKind | null {
    return this.tokens[this.index]?.kind ?? null
  }

  /**
   * 次のトークンを飛ばす。
   */
  bump(): TokenData {
    if (this.atEof()) {
      throw new Error("Can't bump over EOF.")
    }

    this.index++
    return this.tokens[this.index - 1]
  }

  /**
   * (エラー回復の一部として) 次のトークンを捨てる。
   */
  skip(): void {
    if (!this.atEof()) {
      this.index++
    }
  }

  /**
   * 構文エラーを報告する。
   */
  error(message: string): void {
    this.errors.push({ message, pos: this.nextPos() })
  }
}

// -----------------------------------------------
// misc
// -----------------------------------------------

/**
 * 文の末尾にいるか？
 *
 * (すべての文は行末か end か EOF で終わる。)
 */
const atStmtEnd = (p: Parser): boolean => {
  const k = p.peek()
  return k === "EOL" || k == "end"
}

/**
 * 式や文の構文エラーから回復する。
 *
 * (行の残りのトークンを無視する。)
 */
const recoveryStmt = (p: Parser): void => {
  // 1つ以上のトークンをスキップできるときだけこの関数を呼ぶようにしている。
  // (トークンをスキップせずにエラーから回復すると無限ループのリスクがある。)
  assert.ok(!p.atEof() && !atStmtEnd(p))

  while (!p.atEof() && !atStmtEnd(p)) {
    p.skip()
  }
}

/**
 * ブロックの構文エラーから回復する。
 *
 * (end が出てくるまで、トークンを無視する。)
 */
const recoveryBlock = (p: Parser): void => {
  assert.ok(!p.atEof() && p.peek() !== "end")

  while (!p.atEof() && p.peek() !== "end") {
    p.skip()
  }
}

/**
 * 行末に達していることを検査し、行末トークンがあれば飛ばす。
 */
const expectEol = (p: Parser): void => {
  if (!p.atEof() && !atStmtEnd(p)) {
    p.error("改行が必要です。")
    recoveryStmt(p)
  }

  if (p.peek() === "EOL") {
    p.bump()
  }
}

/**
 * ブロックの末尾に達していることを検査し、end トークンがあれば飛ばす。
 */
const expectEndToken = (p: Parser): void => {
  if (p.peek() !== "end") {
    p.error("end が必要です。")
    recoveryBlock(p)
  }

  if (p.peek() === "end") {
    p.bump()
  }
}

/**
 * 次の字句が特定の記号か？
 */
const atPun = (punText: string, p: Parser): boolean =>
  p.peek() === "PUN" && p.nextText() === punText

/**
 * (名前をパースできなかったとき) エラーを報告してダミーの名前を生成する。
 */
const missName = (hint: string, p: Parser): Name => {
  p.error(hint + "が必要です。")
  return { text: "", pos: p.nextPos() }
}

/**
 * 名前をパースする。
 */
const parseName = (p: Parser): Name | null => {
  if (p.peek() !== "IDENT") {
    return null
  }

  const pos = p.nextPos()
  const { text } = p.bump()
  return { text, pos }
}

/**
 * パラメータの並びをパースする。
 */
const parseParams = (p: Parser): Name[] => {
  const params: Name[] = []

  while (!p.atEof() && !atStmtEnd(p)) {
    const param = parseName(p) ?? missName("パラメータ", p)
    params.push(param)

    if (!atPun(",", p)) {
      break
    }
    p.bump()
  }
  return params
}

/**
 * 引数の並びをパースする。
 */
const parseArgs = (p: Parser): Expr[] => {
  const args: Expr[] = []

  while (!p.atEof() && !atStmtEnd(p)) {
    const arg = parseExpr(p) ?? missExpr("引数式", p)
    args.push(arg)

    if (!atPun(",", p)) {
      break
    }
    p.bump()
  }
  return args
}

// -----------------------------------------------
// 式のパース
// -----------------------------------------------

/**
 * (式をパースできなかったとき) エラーを報告して、ダミーの式を生成する。
 */
const missExpr = (hint: string, p: Parser): Expr => {
  p.error(hint + "が必要です。")
  return { kind: "missing", pos: p.nextPos() }
}

/**
 * 式をパースする。
 *
 * (次の字句が FIRST(expr) に入っていなければ null.)
 */
const parseExpr = (p: Parser): Expr | null => {
  switch (p.peek()) {
    case "INT":
    case "STRING": {
      const pos = p.nextPos()
      const { text } = p.bump()
      return { kind: "literal", text, pos }
    }
    case "IDENT": {
      const name = parseName(p) ?? unreachable()
      return { kind: "var", name }
    }
    default:
      return null
  }
}

// -----------------------------------------------
// 文のパース
// -----------------------------------------------

const parseDebuggerStmt = (p: Parser): Stmt => {
  const pos = p.nextPos()
  p.bump()
  expectEol(p)
  return { kind: "debugger", pos }
}

const parseIfStmt = (p: Parser): Stmt => {
  const pos = p.nextPos()
  p.bump()

  const cond = parseExpr(p) ?? missExpr("条件式", p)
  const body = parseBlock(p)
  return { kind: "if", cond, body, pos }
}

const parseJsStmt = (p: Parser): Stmt => {
  const pos = p.nextPos()
  p.bump()

  const args = parseArgs(p)
  expectEol(p)
  return { kind: "js", args, pos }
}

const parseProcStmt = (p: Parser): Stmt => {
  const pos = p.nextPos()
  p.bump()

  const name = parseName(p) ?? missName("手続き名", p)
  const params = parseParams(p)
  const body = parseBlock(p)
  return { kind: "proc", name, params, body, pos }
}

const parseAssignStmt = (pos: Pos, name: Name, p: Parser): Stmt => {
  const init = parseExpr(p) ?? missExpr("右辺", p)
  expectEol(p)
  return { kind: "assign", name, init, pos }
}

const parseCallStmt = (pos: Pos, name: Name, p: Parser): Stmt => {
  const args = parseArgs(p)
  expectEol(p)
  return { kind: "call", name, args, pos }
}

/**
 * 文をパースする。
 *
 * (次の字句が FIRST(stmt) に入っていなければ何もせず null を返す。
 *  途中のパースに失敗したときは、パースエラーを起こしつつ何らかの stmt を返す。)
 */
const parseStmt = (p: Parser): Stmt | null => {
  switch (p.peek()) {
    case "debugger":
      return parseDebuggerStmt(p)

    case "if":
      return parseIfStmt(p)

    case "js":
      return parseJsStmt(p)

    case "proc":
      return parseProcStmt(p)

    case "IDENT": {
      // 代入または手続きの呼び出し。
      const pos = p.nextPos()
      const name = parseName(p) ?? unreachable()

      if (atPun("=", p)) {
        p.bump()
        return parseAssignStmt(pos, name, p)
      } else {
        return parseCallStmt(pos, name, p)
      }
    }
    default:
      return null
  }
}

/**
 * ブロックの本体をパースする。末尾の end も飛ばす。
 */
const parseBlock = (p: Parser): Stmt[] => {
  const stmts: Stmt[] = []

  while (!p.atEof() && p.peek() !== "end") {
    // 空文
    if (p.peek() === "EOL") {
      p.skip()
      continue
    }

    assert.ok(!p.atEof() && !atStmtEnd(p))
    const stmt = parseStmt(p)
    if (stmt == null) {
      p.error("文が必要です。")
      recoveryStmt(p)
      continue
    }

    stmts.push(stmt)
  }

  expectEndToken(p)
  return stmts
}

export const parseToplevel = (tokens: TokenData[], eof: Pos): ParseResult => {
  const p = new Parser(tokens, eof)
  const stmts: Stmt[] = []

  while (!p.atEof()) {
    // 空文
    if (p.peek() === "EOL") {
      p.skip()
      continue
    }

    if (p.peek() === "end") {
      p.error("不正な end です。")
      p.skip()
      continue
    }

    assert.ok(!p.atEof() && !atStmtEnd(p))
    const stmt = parseStmt(p)
    if (stmt == null) {
      p.error("文が必要です。")
      recoveryStmt(p)
      continue
    }

    stmts.push(stmt)
  }

  assert.ok(p.atEof())
  return { ast: { stmts }, errors: p.errors }
}

// -----------------------------------------------
// 補助関数
// -----------------------------------------------

const unreachable = () => {
  throw new Error("unreachable")
}
