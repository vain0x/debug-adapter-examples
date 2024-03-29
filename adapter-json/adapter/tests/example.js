// テスト。アダプタを起動して停止させる。

// USAGE: node example.js

const ChildProcess = require("child_process")

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const sourceFile = `${__dirname}/example.json`

const main = () => {
  // アダプタを起動する。
  const adapter = ChildProcess.spawn(`node ${__dirname}/../dist/main.js`, {
    shell: true,

    // stdin, stdout は pipe でつなぐ。stderr は継承する。
    stdio: ["pipe", "pipe", "inherit"],
  })

  // アダプタからの出力をバッファに溜める。
  let adapterOutput = Buffer.from([])
  adapter.stdout.on("readable", () => {
    while (adapter.stdout.readable) {
      const chunk = adapter.stdout.read()
      if (chunk == null || chunk.length === 0) {
        break
      }
      adapterOutput = Buffer.concat([adapterOutput, chunk])
    }
  })

  // アダプタが停止したら出力をまとめて書き出す。
  adapter.on("exit", () => {
    const output = decoder.decode(adapterOutput)
      .trimEnd()
      .split("\r\n")
      .map(line => `<- ${line}\n`)
      .join("")
    process.stdout.write(output)
  })

  const sendMessage = message => {
    const encodedData = encoder.encode(JSON.stringify(message) + "\r\n") // ログを見やすくするため改行をつけておく。

    adapter.stdin.write(`Content-Length: ${encodedData.length}\r\n\r\n`)
    adapter.stdin.write(encodedData)

    // 何を送ったかを出力する。
    process.stdout.write(`-> Content-Length: ${encodedData.length}\n->\n`)
    process.stdout.write(`-> ${JSON.stringify(message)}\n`)
  }

  let lastSeq = 0

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "initialize",
    arguments: {
      adapterID: "adapter-json",
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "launch",
    args: {
      sourceFile,
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "threads",
    args: {
      sourceFile,
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "stackTrace",
    args: {
      threadId: 1,
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "scopes",
    args: {
      frameId: 1,
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "variables",
    args: {
      variablesReference: 1,
    },
  })

  sendMessage({
    seq: ++lastSeq,
    type: "request",
    command: "disconnect",
  })
}

main()
