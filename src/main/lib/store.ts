import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

let JSON5: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  JSON5 = require('json5')
} catch {
  JSON5 = null
}

export function readJson5File(filePath: string): unknown {
  try {
    if (!existsSync(filePath)) return {}
    const raw = readFileSync(filePath, 'utf8')
    if (JSON5) {
      return JSON5.parse(raw)
    }
    // 简单兜底：去除注释行再用 JSON 解析
    const withoutComments = raw
      .split(/\r?\n/)
      .filter((l) => !/^\s*\/.*/.test(l))
      .join('\n')
    return JSON.parse(withoutComments)
  } catch (e) {
    return {}
  }
}

export function writeJson5File(filePath: string, data: unknown): void {
  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const content = JSON5 ? JSON5.stringify(data, null, 2) : JSON.stringify(data, null, 2)
    writeFileSync(filePath, String(content))
  } catch (e) {
    // ignore
  }
}
