import { deduplicate } from 'koishi'
import { simplify } from 'simplify-chinese'
import { loadLibrary, outDir } from './utils'

const pinyinMap: Record<string, string> = require('../data/chinese/pinyin')
const charMap: Record<string, string> = {}

for (const pinyin in pinyinMap) {
  const chars = pinyinMap[pinyin]
  for (const char of chars) {
    if (char in charMap) {
      charMap[char] += ',' + pinyin
    } else {
      charMap[char] = pinyin
    }
  }
}

const PHONETIC = require('../data/chinese/phonetic')
const RE_PHONETIC = new RegExp(`([${Object.keys(PHONETIC).join('')}])`, 'g')

export function getPinyin(char: string) {
  return (charMap[char] || char).split(',')
}

export function getTone(char: string) {
  return deduplicate(getPinyin(char).map(tone => tone.replace(RE_PHONETIC, (_, $1) => PHONETIC[$1][0])))
}

export function getTone2(char: string) {
  return getPinyin(char).map((tone) => {
    let pitch = ''
    return tone.replace(RE_PHONETIC, (_, $1) => (pitch = PHONETIC[$1][1], PHONETIC[$1][0])) + pitch
  })
}

export const wordMap: Record<string, [string, string]> = {}
export const toneStartMap: Record<string, Set<string>> = {}
export const toneEndMap: Record<string, Set<string>> = {}
export const toneStartStrictMap: Record<string, Set<string>> = {}
export const toneEndStrictMap: Record<string, Set<string>> = {}

export function stripWord(source: string) {
  return source.replace(/[\s。\.，,？?！!&＆～~…、／/\[\]＊Ｘ【】()“”「」『』♪（）－·+-]/g, '').toLowerCase()
}

function* getSpellWords(source: string) {
  const words = source.split(' ')
  const segments = words.map(stripWord)
  const strippedSource = stripWord(source)

  const alphabetPrefixed = !strippedSource.match(/^\W/)
  if (words.length > 1 && segments[0].match(/\W$/)) {
    yield [words[0], segments[0], alphabetPrefixed] as const
  }
  if (strippedSource.match(/\W$/)) {
    yield [source, strippedSource, alphabetPrefixed] as const
  }
}

function getMusicWords(source: string): [string, string][] {
  source = source.replace(/\(.+\)/, '')
  const words = source.split('～')
  if (words.length > 1) words.push(source)
  return (words.map(w => [w, stripWord(w)]) as [string, string][]).filter(([, s]) => !s.match(/^\w|\w$/))
}

export const startTones: Record<string, string> = require('../data/chinese/leading')
export const endTones: Record<string, string> = require('../data/chinese/trailing')
export const unknownStartTones: string[][] = []
export const unknownEndTones: string[][] = []

export function addTone(toneMap: Record<string, Set<string>>, word: string, tone: string) {
  (toneMap[tone] || (toneMap[tone] = new Set())).add(word)
}

export function loadTone(word: string, source: string, full: string) {
  if (word.length === 1) return
  const oldData = wordMap[word]
  wordMap[word] = [source, full]
  if (oldData) return
  const start = getTone(word[0])
  if (start.length > 1 && !startTones[word]) {
    unknownStartTones.push([word, ...start])
  } else {
    addTone(toneStartStrictMap, word, startTones[word] || start[0])
  }
  start.map(tone => addTone(toneStartMap, word, tone))
  const end = getTone(word[word.length - 1])
  if (end.length > 1 && !endTones[word]) {
    unknownEndTones.push([word, ...end])
  } else {
    addTone(toneEndStrictMap, word, endTones[word] || end[0])
  }
  end.map(tone => addTone(toneEndMap, word, tone))
}

interface Library {
  name: string
  items: string[]
}

export function loadFile(file: string) {
  loadLibrary<Library[]>(`words/${file}`).forEach(({ name, items }) => {
    items.forEach((item) => {
      item = simplify(item)
      if (name.startsWith('符卡')) {
        const spell = /(.*)([「＊])(.+)([」＊])/.exec(item)
        for (const [card, stripped, alphabetPrefixed] of getSpellWords(spell[3])) {
          if (!alphabetPrefixed) {
            loadTone(stripped, name, `${spell[2]}${card}${spell[4]}`)
          }
          if (spell[1].match(/^\W/)) {
            loadTone(stripWord(spell[1]) + stripped, name, `${spell[1]}${spell[2]}${card}${spell[4]}`)
          }
        }
      } else if (name.startsWith('音乐')) {
        getMusicWords(item).map(([word, stripped]) => {
          loadTone(stripped, name, word)
        })
      } else {
        const stripped = stripWord(item)
        if (!stripped.match(/^\w|\w$/)) {
          loadTone(stripped, name, item)
        }
      }
    })
  })
}

function toMappedSet(source: Record<string, string[]>, target: Record<string, Set<string>> = {}) {
  for (const key in source) {
    target[key] = new Set(source[key])
  }
  return target
}

export function getToneDict(reverse: boolean, strict: boolean) {
  return reverse
    ? strict ? toneEndStrictMap : toneEndMap
    : strict ? toneStartStrictMap : toneStartMap
}

let loaded = false

export function loadCache() {
  if (loaded) return
  loaded = true
  Object.assign(wordMap, require(outDir + '/wordMap.json'))
  toMappedSet(require(outDir + '/toneEndMap.json'), toneEndMap)
  toMappedSet(require(outDir + '/toneStartMap.json'), toneStartMap)
  toMappedSet(require(outDir + '/toneEndStrictMap.json'), toneEndStrictMap)
  toMappedSet(require(outDir + '/toneStartStrictMap.json'), toneStartStrictMap)
}
