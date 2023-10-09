import { Activity } from './utils'
import { Context, Session } from 'koishi'
import { SolitaireField, State } from '.'

declare module 'koishi' {
  interface Events {
    'solitaire/success'(session: Session<SolitaireField>, state: State, word: string, hints: string[], nextFound: boolean): void
    'solitaire/trial'(user: User.Observed<SolitaireField>, state: State): void
  }

  interface User {
    srbkAchv: number
    solitaireF: number
    terminateF: number
    solitaireB: number
    terminateB: number
    solitaireActivity: Activity
    gameActivity: Activity
    solitaireRank: number
    bestArcade: number
    bestDecimal: number
    bestHundred: number
  }
}

// const solitaireWordSet = new Set(Object.values(wordMap).map(([, w]) => w))
// const hangmanWordList = require(libDir + '/hangman') as [string, string, string][]
// const hangmanWordSet = new Set(hangmanWordList.map(([w]) => w))

// 如果是接龙词汇原词奖励 1.2
// 如果含有吊死鬼词汇奖励 1
// 如果是接龙词汇简化后奖励 0.6
// addNameRater((name) => {
//   if (solitaireWordSet.has(name)) return 1.2
//   if (/^[\w ]+$/.test(name)) {
//     const capture = name.toLowerCase().match(/\b[a-zA-Z]{5,}\b/g)
//     if (capture && capture.some(word => hangmanWordSet.has(word))) return 1
//   }
//   if (stripWord(name) in wordMap) return 0.6
// })

// Profile.add(({ solitaireB, solitaireF, solitaireRank }) => {
//   return `接龙次数：${solitaireB + solitaireF}${solitaireRank ? ` (#${solitaireRank})` : ''}`
// }, ['solitaireF', 'solitaireB', 'solitaireRank'], 40)

// function normalize(times: number, slope: number, offset: number) {
//   return Math.max(0, Math.round(Math.log2(times) * slope) - offset)
// }

// Affinity.add(50, (user, date) => {
//   const value = normalize(Activity.get(user.gameActivity, date), 5, 5)
//   if (value === 0) return []
//   const label = value <= 10 ? '第九代学者' : value <= 15 ? '读心的妖怪' : '思兼的头脑'
//   return [Math.min(value, 20), label]
// }, ['gameActivity'], () => [20, '思兼的头脑'])

// Affinity.add(50, (user, date) => {
//   const value = normalize(Activity.get(user.solitaireActivity, date), 5, 15)
//   if (value === 0) return []
//   const label = value <= 10 ? '接龙高手' : value <= 15 ? '符卡字典' : '不动的大图书馆'
//   return [Math.min(value, 20), label]
// }, ['solitaireActivity'], () => [20, '不动的大图书馆'])

// Affinity.hint(function* (user) {
//   const total = user.solitaireF + user.solitaireB
//   if (total >= 100 && !user.achievement.includes(ACHV_DECIMAL)) {
//     yield '如果在接龙中反复接到同一个音，会发生什么呢？'
//   }
//   if (total >= 1000 && !user.achievement.includes(ACHV_HUNDRED)) {
//     yield '不如试试在接龙中一鼓作气多接几个吧。'
//   }
// }, ['achievement', 'solitaireF', 'solitaireB'])

// const ACHV_EXPERT = 'solitaire.expert'
// const ACHV_DECIMAL = 'solitaire.decimal'
// const ACHV_HUNDRED = 'solitaire.hundred'
// const ACHV_ECHO = 'solitaire.echo'
// const ACHV_TERMINATOR = 'solitaire.terminator'
// const ACHV_SRBK = 'solitaire.senren-banka'

// Achievement.add({
//   id: ACHV_EXPERT,
//   name: '为所欲为',
//   category: 'solitaire',
//   affinity: 10,
//   desc: [
//     '在东方词语接龙中成功接龙 1000 次。',
//     '在东方词语接龙中成功接龙 10000 次。',
//   ],
//   progress: user => (user.solitaireF + user.solitaireB) / 1000,
// }, ['solitaireF', 'solitaireB'])

// Achievement.add({
//   id: ACHV_TERMINATOR,
//   name: '一个顶俩',
//   category: 'solitaire',
//   affinity: 5,
//   desc: [
//     '成功使得东方词语接龙无法继续下去 50 次。',
//     '成功使得东方词语接龙无法继续下去 1000 次。',
//   ],
//   progress: user => (user.terminateF + user.terminateB) / 50,
// }, ['terminateF', 'terminateB'])

// Achievement.add({
//   id: ACHV_DECIMAL,
//   name: ['十进制', '十凶星'],
//   category: 'solitaire',
//   affinity: 5,
//   desc: [
//     '在一局东方词语接龙中第 10 次接到同一个音。',
//     '在一局东方词语接龙中在一个被自己接过至少 10 次的音上接死。',
//   ],
//   hidden: user => user.solitaireF + user.solitaireB < 100,
// }, ['solitaireF', 'solitaireB'])

// Achievement.add({
//   id: ACHV_HUNDRED,
//   name: ['百词斩', '百折不回'],
//   category: 'solitaire',
//   affinity: 5,
//   desc: [
//     '在一局东方词语接龙中接龙成功 100 次。',
//     '在一局东方词语接龙中前 100 次成功接到不同的音，不计多音字。',
//   ],
//   hidden: user => user.solitaireF + user.solitaireB < 1000,
// }, ['solitaireF', 'solitaireB'])

// Achievement.add({
//   id: ACHV_ECHO,
//   name: '疯狂回声',
//   category: 'solitaire',
//   affinity: 5,
//   desc: '在一局东方词语接龙中在 100 次内成功接到 100 个音，考虑多音字。',
//   hidden: user => user.achievement.some(id => id.startsWith(ACHV_HUNDRED)),
// }, ['achievement'])

// Achievement.add({
//   id: ACHV_SRBK,
//   name: '千恋万花',
//   category: 'solitaire',
//   affinity: 5,
//   desc: '在一局东方词语接龙中集齐 10 种千恋万花要素。',
//   descHidden: '游玩东方词汇接龙获得此成就。',
//   progress: ({ srbkAchv }) => srbkAchv / 10,
//   hidden: user => user.solitaireF + user.solitaireB < 1000,
// }, ['solitaireF', 'solitaireB', 'srbkAchv'])

// Rank.value('solitaire', ['接龙'], '`solitaireF` + `solitaireB`', { key: 'solitaireRank', format: ' 次' })
// Rank.value('terminate', ['接死'], '`terminateF` + `terminateB`', { format: ' 次' })
// Rank.value('solitaireForward', ['正向接龙'], '`solitaireF`', { format: ' 次' })
// Rank.value('terminateForward', ['正向接死'], '`terminateF`', { format: ' 次' })
// Rank.value('solitaireBackward', ['反向接龙'], '`solitaireB`', { format: ' 次' })
// Rank.value('terminateBackward', ['反向接死'], '`terminateB`', { format: ' 次' })
// Rank.value('arcade', ['街机接龙'], '`bestArcade`', { format: ' 次' })
// Rank.value('fixedStar', ['十凶星'], '`bestDecimal`', { format: ' 步', threshold: 1000, reverse: true })
// Rank.value('lunaticEcho', ['疯狂回声'], '`bestHundred`', { format: ' 步', threshold: 1000, reverse: true })

export function apply(ctx: Context) {
  ctx.model.extend('user', {
    srbkAchv: 'unsigned(4)',
    solitaireF: 'unsigned(9)',
    terminateF: 'unsigned(9)',
    solitaireB: 'unsigned(9)',
    terminateB: 'unsigned(9)',
    bestArcade: 'unsigned(9)',
    bestDecimal: { type: 'unsigned', length: 9, initial: 1000 },
    bestHundred: { type: 'unsigned', length: 9, initial: 1000 },
    solitaireActivity: 'json',
    gameActivity: 'json',
  })

  // ctx.on('solitaire/trial', (user, { participants }) => {
  //   if (participants[user.id]) return
  //   participants[user.id] = {
  //     total: 0,
  //     srbkCount: 0,
  //     srbkMask: 0,
  //     tones: [],
  //     toneMap: {},
  //   }
  // })

  // ctx.on('solitaire/success', (session, { tones, reverse, participants, arcade }, word, hints, nextFound) => {
  //   const { user } = session
  //   Activity.update(user.solitaireActivity)
  //   const srbkWords: string[][] = loadLibrary('special-words/senren-banka')

  //   // 为所欲为
  //   user[reverse ? 'solitaireB' : 'solitaireF'] += 1
  //   const success = user.solitaireF + user.solitaireB
  //   session.achieve(ACHV_EXPERT, hints, [success >= 1000, success >= 10000])

  //   // 一个顶俩
  //   if (!nextFound) {
  //     user[reverse ? 'terminateB' : 'terminateF'] += 1
  //     const terminate = user.terminateB + user.terminateF
  //     session.achieve(ACHV_TERMINATOR, hints, [terminate >= 50, terminate >= 1000])
  //   }

  //   const participant = participants[user.id]
  //   const isSingle = Object.keys(participants).length === 1

  //   if (arcade) {
  //     user.bestArcade = Math.max(user.bestArcade, participant.total)
  //   }

  //   // 千恋万花
  //   const index = srbkWords.findIndex(words => words.includes(word))
  //   if (index >= 0 && !(participant.srbkMask & (1 << index))) {
  //     participant.srbkMask |= 1 << index
  //     participant.srbkCount += 1
  //     session.achieve(ACHV_SRBK, hints, participant.srbkCount === 10)
  //   }
  //   user.srbkAchv = participant.srbkCount

  //   let hasDecimal = false
  //   participant.tones.push(...getNextTones(word, reverse, true))
  //   for (const tone of tones) {
  //     if (!participant.toneMap[tone]) {
  //       participant.toneMap[tone] = 1
  //     } else {
  //       participant.toneMap[tone] += 1
  //       if (participant.toneMap[tone] >= 10) {
  //         hasDecimal = true
  //       }
  //     }
  //   }

  //   // 疯狂回声
  //   if (++participant.total <= 100 && Object.keys(participant.toneMap).length >= 100) {
  //     // session.achieve(ACHV_ECHO, hints, true)
  //     if (isSingle) {
  //       user.bestHundred = Math.min(user.bestHundred, participant.total)
  //     }
  //   }

  //   // 百词斩 - 百折不回
  //   if (participant.total === 100) {
  //     session.achieve(ACHV_HUNDRED, hints, [true, new Set(participant.tones).size === 100])
  //   }

  //   // 十进制 - 十凶星
  //   session.achieve(ACHV_DECIMAL, hints, [hasDecimal, !nextFound])
  //   if (hasDecimal && !nextFound && isSingle) {
  //     user.bestDecimal = Math.min(user.bestDecimal, participant.total)
  //   }
  // })
}
