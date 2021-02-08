import * as assert from "assert"

/**
 * 文字列の位置を指し示すカーソル。
 * その位置の行番号や列番号を取り出せる。
 *
 * (インデックスや列番号は UTF-16 ベースで計算される。
 *  サロゲートペアは考慮されない。)
 */
export class TextCursor {
  constructor(
    private readonly text: string,
  ) { }

  private index = 0
  private row = 0
  private column = 0

  /**
   * 不変条件を検査する。
   */
  private checkInvariant(): void {
    assert.ok(0 <= this.index && this.index <= this.text.length)
  }

  currentPos(): Pos {
    return {
      index: this.index,
      row: this.row,
      column: this.column,
    }
  }

  /**
   * カーソルが文字列の末尾に達している？
   */
  atEof(): boolean {
    this.checkInvariant()
    return this.index === this.text.length
  }

  /**
   * カーソルの現在位置の offset だけ後方にある文字を取得する。(文字がなければ null。)
   */
  at(offset: number): string | null {
    if (this.index + offset >= this.text.length) {
      return null
    }

    return this.text[this.index + offset]
  }

  /**
   * カーソルを指定した位置まで進める。
   *
   * (戻すことはできない。)
   */
  advance(len: number): void {
    if (!(0 <= len && len <= this.text.length - this.index)) throw new Error("out of range")

    const end = this.index + len
    while (this.index < end) {
      if (this.text[this.index] === "\n") {
        this.row++
        this.column = 0
        this.index++
      } else {
        this.column++
        this.index++
      }
    }

    this.checkInvariant()
  }
}

interface Pos {
  index: number
  row: number
  column: number
}
