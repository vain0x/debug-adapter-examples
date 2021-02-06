# adapter-json

変数の表示だけを行う DAP アダプタの実装 (予定)

## 仕様

JSON (.json) ファイルをデバッグする。「起動」すると JSON ファイルがパースされて、それがローカル変数の情報であるかのように表示される。

### 例

```json
{
    "message": "hello, world!"
}
```

これは次のような状況を表していると解釈する:

```js
    const message = "hello, world!"
```
