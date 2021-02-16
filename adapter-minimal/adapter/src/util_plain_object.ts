// PlainObject 型の定義

/**
 * どんなキーを持つか定かでないオブジェクトの型。
 *
 * JSON のオブジェクトをパースした結果として得られる値を表すのに適しているはず。
 *
 * ## 備考
 *
 * `{}` や `object` は適切でない。
 * 参考: [Bans specific types from being used](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md)
 */
export type PlainObject = Record<string, unknown>

/**
 * PlainObject 型にダウンキャストする。
 */
export const asPlainObject = (value: unknown): PlainObject | null =>
  typeof value === "object"
    && value != null
    && isPlainObjectPrototype(Object.getPrototypeOf(value))
    ? value as PlainObject
    : null

const isPlainObjectPrototype = (value: unknown): boolean =>
  value == null || value === Object.prototype
