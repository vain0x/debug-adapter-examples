// テキストファイルを解析してコマンドの列に変換するもの

import * as fs from "fs"

export interface TextProgram {
  name: string
  path: string
  commands: Command[]
}

/**
 * 行に到達したときにすること
 */
export type Command =
  {
    // 中断
    kind: "pause"
    path: string
    row: number
  } | {
    // 別のファイルの呼び出し
    kind: "call"
    target: string
    path: string
    row: number
  } | {
    // ログ出力
    kind: "log"
    message: string
    path: string
    row: number
  } | {
    // call から戻る、あるいは実行を終了する。
    kind: "return"
    path: string
    row: number
  }

const parseLine = (line: string, path: string, row: number): Command | null => {
  line = line.trimEnd()

  if (line === "" || line.startsWith("#")) {
    return null // 空行とコメント行
  }

  const [word, arg] = splitBySpace(line)
  switch (word) {
    case "pause":
      return { kind: "pause", path, row }

    case "call":
      return { kind: "call", target: arg, path, row }

    default:
      return { kind: "log", message: line, path, row }
  }
}

export const parseFile = (name: string, path: string): TextProgram => {
  const source = fs.readFileSync(path).toString()
  const lines = source.split(/\r?\n/)

  const commands = (
    lines
    .map((line, row) => parseLine(line, path, row))
    .filter(notNull)
  )
  commands.push({
    kind: "return",
    path,
    row: lines.length,
  })

  return {
    name,
    path,
    commands,
  }
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

/**
 * 文字列を最初の空白の前後に分割する。
 */
const splitBySpace = (s: string): [string, string] => {
  const matchArray = s.match(/\s+/)

  const i = matchArray?.index
  const len = matchArray?.[0].length

  return i != null && len != null
    ? [s.slice(0, i), s.slice(i + len)]
    : [s, ""]
}

/**
 * 値が null でなければ true.
 */
const notNull = <T>(value: T | null): value is T =>
  value != null
