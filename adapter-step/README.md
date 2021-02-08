# adapter-step

ステップ実行をサポートした DAP アダプタの実装 (予定)

## 仕様

STEP 言語 (.step) をデバッグする。

## STEP 言語の仕様

```rb
# ハッシュで始まる行はコメント。

# js 文は JavaScript の式を評価して、値を it (グローバル変数) に代入する。
# 式に含まれる $i は i 番目の引数に展開される。
js "コード", 引数1, 引数2, ...

js "console.log($1)", "hello" # 標準出力に hello が出力される。

# debugger 文はデバッグ実行を中断させる。
debugger

# 代入文は式の値をローカル変数に代入する。
変数 = 式

n = 42

# if 文は条件を満たしたときだけ本体を実行する。
if 条件式
    文の並び
end

# proc 文は手続きを定義する。
proc 名前 パラメータ1, パラメータ2, ...
    文の並び
end

proc log message
    js "console.log($1)", message
end

# 手続きを呼ぶ。
log "hello"
```
