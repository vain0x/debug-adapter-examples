// 構文の型定義: 位置情報、字句情報、抽象構文木など

// -----------------------------------------------
// 位置情報
// -----------------------------------------------

/**
 * ソースファイル上の位置
 */
export interface Pos {
  index: number

  /**
   * 行番号 (0 から始まる。)
   */
  row: number

  /**
   * 列番号 (0 から始まる。)
   */
  column: number
}

/**
 * ソースファイル上の範囲
 */
export interface Range {
  start: Pos
  end: Pos
}

// -----------------------------------------------
// 字句情報
// -----------------------------------------------

/**
 * 字句の種類
 */
export type TokenKind =
  "INT"
  | "STRING"
  | "IDENT"
  | "PUN"

  // End-of-line. 行末に自動で挿入される。他の言語のセミコロン `;` のように、文の終端になる。
  | "EOL"

  // Keywords:
  | "debugger"
  | "end"
  | "if"
  | "js"
  | "proc"

/**
 * 字句
 */
export interface TokenData {
  kind: TokenKind
  text: string
  pos: Pos
}

/**
 * 構文エラー
 */
export interface SyntaxError {
  message: string
  pos: Pos
}

// -----------------------------------------------
// 抽象構文木 (AST)
// -----------------------------------------------

/**
 * 変数などの名前 (位置情報つき)
 */
export interface Name {
  text: string
  pos: Pos
}

/**
 * AST の式
 */
export type Expr =
  // missing: 構文エラーが発生したときに代理で配置される。
  {
    kind: "missing"
    pos: Pos
  } | {
    kind: "literal"
    text: string
    pos: Pos
  } | {
    kind: "var"
    name: Name
  }

/**
 * AST の文
 */
export type Stmt =
  {
    kind: "debugger"
    pos: Pos
  } | {
    kind: "js"
    args: Expr[]
    pos: Pos
  } | {
    kind: "call"
    name: Name
    args: Expr[]
    pos: Pos
  } | {
    kind: "assign"
    name: Name
    init: Expr
    pos: Pos
  } | {
    kind: "if"
    cond: Expr
    body: Stmt[]
    pos: Pos
  } | {
    kind: "proc"
    name: Name
    params: Name[]
    body: Stmt[]
    pos: Pos
  }

/**
 * 抽象構文木
 */
export interface Ast {
  stmts: Stmt[]
}
