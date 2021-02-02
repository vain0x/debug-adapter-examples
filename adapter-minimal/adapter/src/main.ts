import { startReader } from "./dap_reader"
import { error, fail } from "./util_logging"

startReader()

process.stdin.on("error", err => {
  error(err.message, err.name, err.stack)
  fail("stdin")
})
