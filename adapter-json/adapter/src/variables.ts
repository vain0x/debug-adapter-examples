export type VariablesReference = number

type EntryKind = "indexed" | "named"

export type VariableEntry = {
  variablesReference: VariablesReference
  kind: EntryKind
  name: string
  value: string
}

export const addJsonToVariables = (
  jsonText: string,
  scopeVariablesReference: VariablesReference,
  map: Map<VariablesReference, VariableEntry[]>,
): void => {
  let lastId = scopeVariablesReference

  const onArray = (array: unknown[]): VariableEntry[] =>
    array
      .map((value, index) => onEntry(String(index), "indexed", value))

  const onObject = (obj: unknown): VariableEntry[] =>
    toEntries(obj)
      .map(([key, value]) => onEntry(key, "named", value))

  const onEntry = (name: string, kind: EntryKind, value: unknown): VariableEntry => {
    switch (typeof value) {
      case "string":
      case "number":
      case "boolean":
        return { variablesReference: 0, name, kind, value: String(value) }

      case "object": {
        if (value == null) {
          return { variablesReference: 0, name, kind, value: "null" }
        }

        if (value instanceof Array) {
          const variablesReference = ++lastId
          const entries = onArray(value)
          map.set(variablesReference, entries)
          return {
            variablesReference,
            name,
            kind,
            value: `(length = ${entries.length})`,
          }
        }

        const variablesReference = ++lastId
        const entries = onObject(value)
        map.set(variablesReference, entries)
        return {
          variablesReference,
          name,
          kind,
          value: `(size = ${entries.length})`,
        }
      }
      default:
        // function etc.
        return { variablesReference: 0, name, kind, value: "null" }
    }
  }

  const obj = JSON.parse(jsonText)
  if (!isPlainObject(obj)) {
    map.set(scopeVariablesReference, [ERROR])
    return
  }

  map.set(scopeVariablesReference, onObject(obj))
}

const isPlainObject = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object"
  && !(data instanceof Array)
  && data != null

const toEntries = (data: unknown): Array<[string, unknown]> =>
  isPlainObject(data) ? Object.entries(data) : []

const ERROR: VariableEntry = {
  variablesReference: 0,
  name: "ERROR",
  kind: "named",
  value: "トップレベルはオブジェクトでなければいけません。",
}
