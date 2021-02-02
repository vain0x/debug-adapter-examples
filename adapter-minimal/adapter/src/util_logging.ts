import * as fs from "fs"

// VSCode と接続しているときは標準エラーが (たぶん) 読めないので、ファイルにも書き込む。
const LOG_FILE = __dirname + "/../debug.log"

const VERBOSE = true // process.env["VERBOSE"] != ""

/**
 * デバッグ用のテキストを表示する。
 */
export const debug = (message: string, ...args: unknown[]): void => {
  if (VERBOSE) {
    console.error("debug:", message, ...args)
    fs.appendFileSync(LOG_FILE, "debug: " + JSON.stringify([message, ...args]) + "\n")
  }
}

/**
 * エラーを出力する。
 */
export const error = (message: string, ...args: unknown[]): void => {
  console.error("ERROR:", message, ...args)
  fs.appendFileSync(LOG_FILE, "ERROR: " + JSON.stringify([message, ...args]) + "\n")
}

/**
 * メッセージを出力して、プロセスをエラー終了する。
 */
export const fail = (message: string): never => {
  error(message)
  process.exit(1)
}
