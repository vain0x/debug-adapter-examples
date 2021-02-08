// CLI フロントエンド

import * as readline from "readline"
import * as fs from "fs"
import { runInterpreter } from "./interpreter"
import { Ast, Name, Pos, TokenData } from "./syntax"
import { parseToplevel } from "./syntax_parse"
import { tokenize } from "./syntax_tokenize"

const VERSION = "0.1.0"

const helpText = () => (
  "step v" + VERSION + "\n"
  + "\n"
  + "USAGE: step main.step\n"
)

const posToString = (pos: Pos): string => `${pos.row + 1}:${pos.column + 1}`

const dumpTokens = (tokens: TokenData[]): void => {
  for (const token of tokens) {
    console.log(`  ${JSON.stringify(token.kind)}@${posToString(token.pos)}`)
  }
}

const dumpAst = (ast: Ast): void => {
  const asRecord  = (value: unknown): value is Record<string | number, unknown> =>
    typeof value === "object" && value != null

  const replacer = (key: string, value: unknown) => {
    if (key === "name") {
      const name = value as Name
      return `${name.text}@${posToString(name.pos)}`
    }

    if (key === "pos") {
      return undefined
    }

    if (asRecord(value)) {
      if ("kind" in value && value.kind === "literal") {
        return `${value.text}@${posToString(value.pos as unknown as Pos)}`
      }
    }

    return value
  }

  console.log(`  ${JSON.stringify(ast, replacer, 2).split(/\r?\n/).join("\n  ")}`)
}

const main = async () => {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    process.stdout.write(helpText())
    return
  }

  if (process.argv.includes("-v") || process.argv.includes("-V")) {
    process.stdout.write(VERSION)
    return
  }

  const readLines = readline.createInterface(process.stdin)

  const filePath =
    process.argv.find(s => s.endsWith(".step"))
    ?? error("コマンドライン引数に入力ファイルを指定してください。")

  const source = fs.readFileSync(filePath).toString()

  const tokenizeResult = tokenize(source)
  const parseResult = parseToplevel(tokenizeResult.tokens, tokenizeResult.eof)
  const ok = tokenizeResult.errors.length === 0 && parseResult.errors.length === 0

  // 構文解析の結果を出力する。
  console.log("syntax:", ok ? "OK" : "ERROR")
  console.log("tokens:")
  dumpTokens(tokenizeResult.tokens)
  console.log("ast:")
  dumpAst(parseResult.ast)

  // 構文エラーを出力する。
  if (!ok) {
    for (const error of tokenizeResult.errors) {
      console.error("ERROR: token:", error.message, "@", posToString(error.pos))
    }

    for (const error of parseResult.errors) {
      console.error("ERROR: parse:", error.message, "@", posToString(error.pos))
    }

    process.exit(1)
  }

  await runInterpreter({
    ast: parseResult.ast,
    onDebugger: async (pos: Pos) => {
      console.log("trace: debugger @" + posToString(pos))
    },
    onStep: async () => {
      await new Promise<void>(resolve => readLines.once("line", () => resolve()))
    },
    onError: err => {
      console.error("ERROR:", err.message, err.pos)
      process.exit(1)
    },
  })
  readLines.close()
}

const error = (...args: unknown[]): never => {
  console.error("ERROR:", ...args)
  throw new Error()
}

main()
