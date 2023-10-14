import { resolve } from 'path'
import { load } from 'js-yaml'
import { readFileSync } from 'fs'
import { Time } from 'koishi'

// defineEnumProperty(Channel.Flag, 'official', 1 << 4)

export const libDir = resolve(__dirname, '../words')
export const outDir = resolve(__dirname, '../out')

const cache: Record<string, any> = {}

export function loadLibrary<T>(file: string): T {
  const path = resolve(libDir, file + '.yaml')
  return cache[path] || (cache[path] = load(readFileSync(path, 'utf8')))
}

export type Activity = Record<number, number>

export namespace Activity {
  const PRESERVE = 7
  const LENGTH = 7

  export function update(activity: Activity, preserve = PRESERVE) {
    const date = Time.getDateNumber()
    if (activity[date]) {
      return activity[date] += 1
    }
    const dates = Object.keys(activity)
    for (const key of dates) {
      if (+key <= date - preserve) {
        delete activity[key]
      }
    }
    return activity[date] = 1
  }

  export function get(activity: Activity, date: number) {
    const denominator = (1 << (LENGTH - 1)) - 1
    let total = 0
    for (let offset = 1; offset < LENGTH - 1; ++offset) {
      total += (activity[date - offset] || 0) << (LENGTH - offset - 2)
    }
    const value1 = total * 2 + (activity[date - LENGTH + 1] || 0)
    const value2 = total + ((activity[date] || 0) << (LENGTH - 2))
    if (value1 <= value2) return value2 / denominator
    const coefficient = (Date.now() / 60000 - Time.getTimezoneOffset()) / 1440 - date
    return (value1 + (value2 - value1) * coefficient) / denominator
  }
}
