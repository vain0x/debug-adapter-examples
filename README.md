# Debug Adapter Examples

Debug Adapter Protocol (DAP) の実装例

## 一覧

- [adapter-minimal](./adapter-minimal)
    - 起動と終了だけできる DAP アダプタ
    - 通信まわりや拡張機能の設定の参考になるはず
- [adapter-json](./adapter-json)
    - 変数の表示だけできる DAP アダプタ
    - variables リクエストの参考になるはず

## リンク

DAP:

- DAP の仕様: [Official page for Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)

VSCode:

- VSCode でデバッガーを提供する拡張機能を作る方法のドキュメント: [Debugger Extension | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/debugger-extension)
- DAP アダプタと VSCode 拡張機能のサンプル: [microsoft/vscode-mock-debug\: Starter sample for developing debug adapters for VSCode.](https://github.com/microsoft/vscode-mock-debug)
- DAP アダプタの実装 (Node.js): [microsoft/vscode-debugadapter-node\: Debug adapter protocol and implementation for VS Code.](https://github.com/Microsoft/vscode-debugadapter-node)
