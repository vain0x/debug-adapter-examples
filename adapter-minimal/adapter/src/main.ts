// エントリーポイント

import { startReader } from "./dap_reader"
import { error, fail } from "./util_logging"

startReader()

process.stdin.on("error", err => {
  error(err.message, err.name, err.stack)
  fail("stdin")
})

// Node.js ヒント: (C言語などと違って) Node.js はイベントリスナーが登録されているかぎりプロセスが終了しない。
//                上記で標準入力にイベントリスナーを登録しているので、ここから抜けても終了しない。
