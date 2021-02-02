import { startReader } from "./dap_reader"

startReader()

process.stdin.on("error", err => {
  console.error("ERROR:", err)
  process.exit(1)
})
