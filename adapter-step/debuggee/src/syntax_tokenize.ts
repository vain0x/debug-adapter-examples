// 字句解析

import * as assert from "assert"
import { Pos, TokenData, SyntaxError, TokenKind } from "./syntax"
import { TextCursor } from "./util_text_cursor"

/**
 * トリビア (構文解析上の意味が薄いトークン) を含めたトークンの種類
 */
type TokenOrTriviaKind =
  TokenKind
  | "BLANK"
  | "NEWLINE"
  | "COMMENT"
  | "BAD"

export interface TokenizeResult {
  tokens: TokenData[]

  /**
   * ソースコードの末尾の位置
   */
  eof: Pos

  errors: SyntaxError[]
}

/**
 * ソースコードを字句解析する。
 */
export const tokenize = (source: string): TokenizeResult => {
  const regexp = new RegExp(TOKEN_REGEXP, "y")
  const cursor = new TextCursor(source)
  const tokens: TokenData[] = []
  const errors: SyntaxError[] = []

  let last: TokenKind | null = null

  // セミコロン自動挿入: 行の最後のトリビアでないトークンが式の終端になりうるトークンなら、改行の直前に行末トークンを挿入する。
  const insertEol = (pos: Pos) => {
    if (last === "INT" || last === "STRING" || last === "IDENT" || last === "debugger") {
      tokens.push({
        kind: "EOL",
        text: "",
        pos,
      })
      last = null
    }
  }

  while (true) {
    const matchArray = regexp.exec(source)
    if (matchArray == null) {
      break
    }

    // グループの値を取り出す。
    const [, blank, newline, comment, ident, int, string, pun, bad] = matchArray

    const table: Array<[string | null, TokenOrTriviaKind]> = [
      [blank, "BLANK"],
      [newline, "NEWLINE"],
      [comment, "COMMENT"],
      [ident, "IDENT"],
      [int, "INT"],
      [string, "STRING"],
      [pun, "PUN"],
      [bad, "BAD"],
    ]

    // 成功したグループを探す。(どれかのグループは成功しているはず。)
    const item = table.find(([text]) => text != null) ?? unreachable()

    let [text, kind] = item
    if (text == null) {
      throw unreachable()
    }

    // カーソルを進める。
    const pos = cursor.currentPos()
    cursor.advance(text.length)

    // 不正な文字はエラーにする。
    if (kind === "BAD") {
      errors.push({ message: "不正な文字です。", pos })
      continue
    }

    // 改行の直前に行末トークンを挿入する。
    if (kind === "NEWLINE") {
      insertEol(pos)
      continue
    }

    // トリビアは結果に含めない。
    if (kind === "BLANK" || kind == "COMMENT") {
      continue
    }

    // 識別子の種類はキーワードになる可能性がある。
    if (kind === "IDENT") {
      kind = identKind(text)
    }

    tokens.push({
      kind,
      text,
      pos,
    })

    last = kind
  }

  assert.ok(cursor.atEof())
  const eof = cursor.currentPos()

  // EOF の前にも行末トークンを挿入する。
  insertEol(eof)
  return { tokens, eof, errors }
}

// -----------------------------------------------
// 正規表現
// -----------------------------------------------

const createTokenPattern = (): string => {
  const BLANK = "[ \\t]+"
  const NEWLINES = "[\\r\\n]+\\s*"
  const COMMENT = "#[^\\r\\n]*"
  const IDENT = "[A-Za-z_][0-9A-Za-z_]*"
  const INT = "[0-9]+"
  const STRING = "\\\"[^\\r\\n\\\"]*\\\""
  const PUN = "[,=]"
  const BAD = "\\S{1,8}"

  return [
    BLANK,
    NEWLINES,
    COMMENT,
    IDENT,
    INT,
    STRING,
    PUN,
    BAD,
  ].map(pattern => `(${pattern})`).join("|")
}

const TOKEN_REGEXP = new RegExp(createTokenPattern(), "y")

// -----------------------------------------------
// キーワード
// -----------------------------------------------

const identKind = (text: string): TokenKind => {
  switch (text) {
    case "debugger":
    case "end":
    case "if":
    case "js":
    case "proc":
      return text

    default:
      return "IDENT"
  }
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

const unreachable = (): never => {
  throw new Error("unreachable")
}
