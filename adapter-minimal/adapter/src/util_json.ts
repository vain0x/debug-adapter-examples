/**
 * JSON をパースした結果として得られるデータの型。
 */
export type JsonValue =
  string
  | number
  | boolean
  | null
  | JsonValue[]
  | JsonObject

export type JsonObject = {
  [key: string]: JsonValue
}
