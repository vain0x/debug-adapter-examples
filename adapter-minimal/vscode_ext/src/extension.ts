import * as path from "path"
import * as vscode from "vscode"

/**
 * デバッガの識別子。
 *
 * package.json の contributes.debuggers[].type に書いたのと同じ。
 */
const DEBUG_TYPE = "adapter-minimal"

/**
 * 既定のデバッグ設定。(launch.json に書くやつ。)
 */
const DEFAULT_CONFIG: vscode.DebugConfiguration = {
  name: "Debug with adapter-minimal",
  type: DEBUG_TYPE,

  /**
   * launch, attach、その他。
   *
   * launch: 新しいプロセスを起動してデバッグする。
   * attach: すでに実行中のプロセスに接続してデバッグする。
   * (DAP 仕様の Overview を参照。)
   */
  request: "launch",
}

/**
 * デバッグ設定を動的に生成するもの。
 */
class MyDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  provideDebugConfigurations(_folder: vscode.WorkspaceFolder | undefined, _token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    debug("provideDebugConfigurations")
    return [
      DEFAULT_CONFIG,
    ]
  }

  resolveDebugConfiguration(_folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, _token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
    debug("resolveDebugConfiguration", typeof debugConfiguration, debugConfiguration)

    // launch.json がないときは debugConfiguration={} になっている。
    return Object.assign({}, DEFAULT_CONFIG, debugConfiguration)
  }
}

/**
 * デバッグアダプタに関する設定を提供するもの。
 */
class MyDebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    debug("createDebugAdapterDescriptor", "executable =", executable)

    // 実行ファイルの設定を package.json に書いておくと executable にそれが設定された状態で呼ばれる。
    // いまは書いてないので、undefined が来る。
    if (executable == null) {
      const mainJs = path.resolve(__dirname, "../../adapter/dist/main.js")
      debug("__dirname =", __dirname, "mainJs =", mainJs)
      executable = new vscode.DebugAdapterExecutable("node", [mainJs], {})
    }

    return executable
  }
}

/**
 * 拡張機能が起動したときに呼ばれる。
 *
 * いつ起動するかは package.json の `activationEvents` による。
 * 参考: [Activation Events](https://code.visualstudio.com/api/references/activation-events)
 */
export const activate = (context: vscode.ExtensionContext): void => {
  debug("activate")

  // プロバイダーを登録する。
  // register の結果として、その登録を取り消すためのオブジェクト (vscode.Disposable) が返される。これを context.subscriptions に入れておき、この拡張機能が終了したときに解除されるようにしておく、のが定石っぽい (たぶん)。

  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      DEBUG_TYPE,
      new MyDebugConfigurationProvider(),
    ))

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      DEBUG_TYPE,
      new MyDebugAdapterExecutableFactory(),
    ))
}

export const deactivate = (): void => {
  debug("deactivate")
}

// -----------------------------------------------
// 補助
// -----------------------------------------------

/**
 * デバッグ用にメッセージを出力する。
 *
 * 出力先: 「ヘルプ」＞「開発者ツールの切り替え」でコンソールを開く。
 */
const debug = (message: string, ...args: unknown[]): void => {
  console.log("adapter-minimal: debug:", message, ...args)
}
