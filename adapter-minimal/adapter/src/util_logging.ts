// ログ出力用の関数

// リクエストにエラーレスポンスを返す以外のエラー処理の方法は DAP の仕様に書いてなさそうなので、
// そういうときは単にクラッシュさせている。

import * as fs from "fs"

// VSCode と接続しているときは、ログを標準エラーに出力しても (たぶん) 読めないので、ファイルにも書き込む。
const LOG_FILE = __dirname + "/../debug.log"

/**
 * デバッグ用のテキストをログに出力する。
 */
export const debug = (message: string, ...args: unknown[]): void => {
  console.error("debug:", message, ...args)
  fs.appendFileSync(LOG_FILE, "debug: " + JSON.stringify([message, ...args]) + "\n")
}

/**
 * エラーをログに出力する。
 */
export const error = (message: string, ...args: unknown[]): void => {
  console.error("ERROR:", message, ...args)
  fs.appendFileSync(LOG_FILE, "ERROR: " + JSON.stringify([message, ...args]) + "\n")
}

/**
 * エラーメッセージを出力して、プロセスを終了する。
 */
export const fail = (message: string): never => {
  error(message)
  process.exit(1)
}
