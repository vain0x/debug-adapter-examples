# Adapter Minimal

DAP アダプタの最小の実装

## 仕様

通信などの基礎的な部分に注目するため、初期化と終了のルーチンだけ実装している。

adapter は実際には何もデバッグしない。
「デバッグするプログラムは起動してすぐに終了した」という想定で振る舞う。
(そのため、ステップ実行や変数表示などは実装していない。)

## ディレクトリ構造

- [adapter](./adapter)
    - 最小の DAP アダプタを実装するコンソールアプリ。
    - これは TypeScript (on Node.js) で書いているが、どの言語で実装してもいい。
- [vscode_ext](./vscode_ext)
    - デバッガを登録する拡張機能。
    - デバッグを開始すると adapter が起動し、すぐに終了する。
    - adapter は plaintext (.txt) のファイルのデバッガとして登録される。

## 動作確認

- [Node.js](https://nodejs.org) をインストールする。(v13.14.2)
- [VSCode](https://code.visualstudio.com) をインストールする。

```sh
# node_modules を復元する。
cd adapter && npm ci && cd ..
cd vscode_ext && npm ci && cd ..
```

- VSCode でこのディレクトリを開き、デバッグを開始する (F5)。
    ([.vscode/launch.json](.vscode/launch.json) に拡張機能をデバッグ実行するための設定が書かれている。)
- VSCode の新しいインスタンスが開くので、そこで適当に .txt ファイルを開く。
- .txt ファイルのデバッグを開始する (F5) と、「デバッグコンソール」に何かメッセージが出て、すぐに終了する。

通信のログは [adapter/debug.log](adapter/debug.log) に書かれる。

## その他

実装の詳細はソースコードのコメントを参照。

「Node.js ヒント」などと書いてあるコメントは、直接 DAP に関係ないが、Node.js に詳しくない読者がひっかかりそうな事項を説明している。
