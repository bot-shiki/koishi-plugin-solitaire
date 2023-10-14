import { Context, intersection, Random, segment, Time, User } from 'koishi'
import { endTones, getTone, getToneDict, loadCache, startTones, stripWord, wordMap } from './dict'
import { simplify } from 'simplify-chinese'
import {} from '@koishijs/plugin-help'
import {} from 'koishi-plugin-rate-limit'
import {} from './database'

const solitaireFields = [
  'id', 'name',
  // 'achievement', 'money', 'wealth',
  'solitaireActivity', 'usage', 'timers', 'authority',
  'solitaireF', 'terminateF', 'solitaireB', 'terminateB', 'srbkAchv', 'bestArcade', 'bestDecimal', 'bestHundred',
] as const

export interface Participant {
  total: number
  srbkMask: number
  srbkCount: number
  tones: string[]
  toneMap: Record<string, number>
}

export type SolitaireField = typeof solitaireFields[number]

export interface State {
  channelId: string
  send(content: string): Promise<void>
  /** 接龙发起者 */
  initiator: string
  /** 当前可用的尾音 */
  tones?: string[]
  /** 接龙次数 */
  index?: number
  /** 已经使用过的词 */
  words: Set<string>
  /** 接下来可使用的词 */
  nextWords?: Set<string>
  /** 接龙终止时间 */
  timeout?: number
  /** 接龙停止计时器 */
  timer?: NodeJS.Timeout
  /** 反向模式 */
  reverse: boolean
  /** 严格接龙 */
  strict: boolean
  /** 街机模式 */
  arcade: boolean
  /** 错误提示模式 */
  showWarning?: boolean
  /** 最后一个接龙者 */
  lastUser?: number
  /** 额外限制条件 */
  restriction: string
  pkRounds?: Record<string, number>
  outUsers?: Set<string>
  /** 每个接龙参与者的数据 */
  participants: Record<number, Participant>
  /** 当前模式下尾音为索引的词表 */
  dict: Record<string, Set<string>>
}

const states: Record<number, State> = {}

const MAX_USAGE = 300
const PK_MAX_USAGE = 500
const HINT_MAX_USAGE = 10

export function getUsage(name: string, user: Pick<User, 'usage'>) {
  const _date = Time.getDateNumber()
  if (user.usage._date !== _date) {
    user.usage = { _date }
  }
  return user.usage[name] || 0
}

export function checkUsage(name: string, user: Pick<User, 'usage'>, maxUsage?: number) {
  if (!user.usage) return
  const count = getUsage(name, user)
  if (count >= maxUsage) return true
  if (maxUsage) {
    user.usage[name] = count + 1
  }
}

export const name = 'solitaire'

export function apply(ctx: Context) {
  const logger = ctx.logger('solitaire')

  ctx
    .command('solitaire [words:text]', '东方词汇接龙')
    .alias('jl')
    .alias('slt')
    .userFields(solitaireFields)
    .shortcut('接龙', { fuzzy: true })
    .shortcut('接龙停止', { options: { end: true } })
    .shortcut('接龙提示', { options: { hint: true } })
    .shortcut('停止接龙', { options: { end: true } })
    .shortcut('接龙对战', { options: { pk: true } })
    .shortcut('反向接龙', { options: { reverse: true } })
    .shortcut('反向接龙对战', { options: { pk: true, reverse: true } })
    .shortcut('街机接龙', { options: { arcade: true } })
    .shortcut('反向街机接龙', { options: { arcade: true, reverse: true } })
    .shortcut('街机接龙对战', { options: { pk: true, arcade: true } })
    .shortcut('反向街机接龙对战', { options: { pk: true, arcade: true, reverse: true } })
    .shortcut('严格接龙', { options: { strict: true } })
    .shortcut('反向严格接龙', { options: { reverse: true, strict: true } })
    .shortcut('严格接龙对战', { options: { pk: true, strict: true } })
    .shortcut('反向严格接龙对战', { options: { pk: true, reverse: true, strict: true } })
    .shortcut('严格街机接龙', { options: { arcade: true, strict: true } })
    .shortcut('反向严格街机接龙', { options: { arcade: true, reverse: true, strict: true } })
    .shortcut('严格街机接龙对战', { options: { pk: true, arcade: true, strict: true } })
    .shortcut('反向严格街机接龙对战', { options: { pk: true, arcade: true, reverse: true, strict: true } })
    .shortcut('词库信息', { options: { info: true } })
    .option('arcade', '-a  街机模式')
    .option('check', '-c  检测当前词汇是否被收录')
    .option('end', '-e  停止当前接龙')
    .option('hint', '-H  查看提示')
    .option('info', '-i  查看词库信息')
    .option('pk', '-p  对战模式')
    .option('reverse', '-r  反向接龙')
    .option('strict', '-s  严格模式')
    .option('useSession', '-u  修改本次调用的输出')
    .option('updateSession', '-U  修改当前会话的输出')
    .option('warning', '-w  开启错误提醒')
    .option('warning', '-W  关闭错误提醒', { value: false })
    .option('includes', '-I [word]  查找含有 word 的词条', { authority: 3, hidden: true })
    .option('endsWith', '-E [tones]  查找以 tones 为结束发音的词', { authority: 3, hidden: true })
    .option('startsWith', '-S [tones]  查找以 tones 为起始发音的词', { authority: 3, hidden: true })
    // .checkTimer('$game')
    .usage((session) => {
      const count = getUsage('solitaire', session.user)
      return [
        `已调用次数：${count || 0}/${MAX_USAGE}。`,
        '只有接龙发起者或 2 级以上权限者允许停止接龙。当接龙 30 分钟内无人成功应答或系统判定无法继续时也会自动停止。',
        '对战模式是一种特殊的接龙模式。在对战模式中，只要成功接龙一次即视为参与了对战，且如果连续两倍于总人数轮接龙没有参与则自动退出 (不计数失败次数，之后仍可以重新加入)。'
        + '对战模式中不允许同一个人连续接龙。当系统判定无法继续时，判定最后一个接龙者出局。如果此时场上还有超过 1 名未出局者，系统将重新生成新的初始词汇，且过去使用的词将仍不能使用。'
        + '一旦 1 分钟内无人成功应答或场上只剩下一名未出局者，且接龙此时已有至少 2 人参与了对战，则视为上一个接龙者获胜。',
      ].join('\n')
    })
    .action(async ({ options, session }, ...words) => {
      loadCache()

      const { pkRounds = {}, arcade } = states[session.channelId] || {}
      if (checkUsage('solitaire', session.user, pkRounds[session.userId] || arcade ? PK_MAX_USAGE : MAX_USAGE)) {
        return '调用次数已达上限。'
      }

      let word = simplify(stripWord(words.join('')))

      // --info
      if (options.info) {
        return [
          `当前一共收录了 ${Object.keys(wordMap).length} 个词条。`,
          '我们收录的词条包括：角色，物品，地点，能力，种族，称号，音乐，设定，符卡，关卡信息，作品，篇目名，作者相关信息，STG / FTG 术语等类别。',
          '对于原文是外语的词条，我们将其翻译成首尾两字都是汉字的形式才会加入词库。我们会在一定程度内加入同一个词的不同翻译版本。',
          '我们不收录二设词条（包括零设）和单字词条（例如“鵺”）。',
          '接龙时，如果首尾两字中存在多音字，则只要有一个音相同，即为接龙成功。',
          '如果对现有词条有疑问或觉得需要补充，欢迎私聊项目作者。',
        ].join('\n')
      }

      // --check
      if (options.check) {
        if (!word) return '请输入要检查的词汇。'
        if (word in wordMap) {
          return `检测到“${word}”是合法词汇（${wordMap[word][0]}）。`
        } else {
          return `在词库中没有找到“${word}”。`
        }
      }

      // --includes
      if (options.includes) {
        const output = Object.keys(wordMap)
          .filter(w => w.includes(options.includes))
          .map(w => `${wordMap[w][1]}（${wordMap[w][0]}）`)
        output.unshift(`含有 ${options.includes} 的词条共有 ${output.length} 个${output.length ? '：' : '。'}`)
        return output.join('\n')
      }

      // --starts-with, --ends-with
      if (options.startsWith || options.endsWith) {
        const startWords = new Set<string>()
        const endWords = new Set<string>()
        const attributes: string[] = []

        if (options.startsWith) {
          const toneMap = getToneDict(false, options.strict)
          attributes.push(`以 ${options.startsWith} 开头`)
          String(options.startsWith).split(',').map((tone) => {
            for (const word of toneMap[tone] || []) {
              startWords.add(word)
            }
          })
        }
        if (options.endsWith) {
          const toneMap = getToneDict(true, options.strict)
          attributes.push(`以 ${options.endsWith} 结尾`)
          String(options.endsWith).split(',').map((tone) => {
            for (const word of toneMap[tone] || []) {
              endWords.add(word)
            }
          })
        }

        const words = options.startsWith
          ? options.endsWith
            ? Array.from(startWords).filter(i => endWords.has(i))
            : Array.from(startWords)
          : Array.from(endWords)
        return [
          `${options.strict ? '严格模式下' : ''}${attributes.join('，')}的词共有 ${words.length} 个${words.length ? '：' : '。'}`,
          ...words.map(word => `${wordMap[word][1]}（${wordMap[word][0]}）`),
        ].join('\n')
      }

      if (!states[session.channelId]) {
        if (word || options.hint || options.end) {
          return '当前没有正在进行的接龙。'
        }

        // 接龙开始
        const state = states[session.channelId] = {
          channelId: session.channelId,
          words: new Set<string>(),
          initiator: session.userId,
          participants: {},
          send: async (...args) => {
            await session.send(...args)
          },
          arcade: options.arcade,
          reverse: options.reverse,
          strict: options.strict,
          showWarning: options.warning,
          restriction: '',
          dict: getToneDict(options.reverse, options.strict),
        } as State
        word = createWord(state)
        if (options.pk) {
          states[session.channelId].outUsers = new Set()
          states[session.channelId].pkRounds = {}
        }
        setTask(session.channelId)
        return formatWord(word, state, `接龙${options.pk ? '对战' : ''}开始，第一个词是`)
      }

      if (options.updateSession) states[session.channelId].send = session.send
      const state = states[session.channelId]
      const send = options.useSession ? session.send : state.send

      // --end
      if (options.end) {
        if (session.userId !== state.initiator && session.user.authority < 2) {
          return send('不是接龙发起者且权限不足。')
        } else {
          clearTimeout(state.timer)
          states[session.channelId] = null
          logger.debug('stopped')
          return send(`接龙已停止。`)
        }
      }

      // --hint
      if (options.hint) {
        if (state.pkRounds) {
          return send('接龙对战中不能查看提示。')
        } else if (state.arcade) {
          return send('街机接龙中不能查看提示。')
        } else if (checkUsage('solitaireHint', session.user, HINT_MAX_USAGE)) {
          return send(`每人每天最多查看 ${HINT_MAX_USAGE} 次接龙提示，你的次数已用完。`)
        } else {
          const word = Random.pick([...state.nextWords])
          const [category, fullname] = wordMap[word]
          return send(`提示：${fullname}（${category}）`)
        }
      }

      if (!word) {
        // 无输入下使用 -w/-W 修改错误提醒模式
        if (typeof options.warning !== 'undefined') {
          state.showWarning = options.warning
          return send(options.warning ? '已开启错误提醒模式。' : '已关闭错误提醒模式。')
        }

        // 查看当前接龙状态
        const output = [formatNext(state)]
        if (state.pkRounds) {
          const ids = Object.keys(state.pkRounds)
          if (!ids.length) {
            output.unshift(`当前处于接龙对战中，且没有玩家入局。`)
          } else {
            const players = ids.filter(id => !state.outUsers.has(id)).map(id => segment.at(id)).join('，')
            output.unshift(`当前处于接龙对战中，未出局的玩家为：${players}。`)
          }
        }
        return send(output.join('\n'))
      }

      // 尝试接龙
      ctx.emit('solitaire/trial', session.user, state)

      const { warning = state.showWarning } = options
      const sendHint = (message: string) => warning && send(message)
      if (state.outUsers && state.outUsers.has(session.userId)) {
        // 对战模式已出局
        return sendHint('你已出局，无法继续接龙。')
      } else if (state.lastUser === session.userId) {
        // 对战模式连续接龙
        return sendHint('对战模式中，同一个人不能连续接龙。')
      } else if (state.words.has(word)) {
        // 已经使用过的词
        return sendHint('这个词已经用过了，请换一个吧。')
      } else if (!wordMap[word]) {
        // 词库中没有找到这个词
        return sendHint(`在词库中没有找到“${word}”。`)
      } else if (!state.nextWords.has(word)) {
        // 读音错误
        return sendHint(formatNext(state))
      }

      // 接龙成功
      logger.debug('continue with', word)
      state.index += 1
      state.words.add(word)
      const hasNext = prepareNext(state, word)
      let message = formatWord(word, state, `接龙成功！当前词汇为`)
      if (state.pkRounds) {
        state.pkRounds[session.userId] = -1
        state.lastUser = session.userId
        const count = Object.keys(state.pkRounds).length
        for (const id in state.pkRounds) {
          state.pkRounds[id] += 1
          if (state.pkRounds[id] >= 2 * count) {
            delete state.pkRounds[id]
            message += `\n由于长时间未接龙，${segment.at(id)} 已自动退出，可再次加入。`
            break
          }
        }
      }
      clearTimeout(state.timer)

      // 寻找下一个词
      const output = [message]
      ctx.emit('solitaire/success', session, state, word, output, hasNext)
      if (!hasNext) logger.debug('terminate')

      if (hasNext) {
        // 正常情况
        setTask(session.channelId)
      } else if (state.pkRounds) {
        // 对战中接死
        state.outUsers.add(session.userId)
        const ids = Object.keys(state.pkRounds)
        if (state.outUsers.size === ids.length) {
          states[session.channelId] = null
          output[0] += `\n由于接龙无法继续，玩家 ${session.username} 被判出局。没有人获得胜利。`
        } else {
          output[0] += `\n由于接龙无法继续，玩家 ${session.username} 被判出局。`
          if (state.outUsers.size === ids.length - 1) {
            const winner = ids.find(id => !state.outUsers.has(id))
            output[0] += `\n恭喜 ${segment.at(winner)} 在对战中获胜！`
            states[session.channelId] = null
          } else {
            setTask(session.channelId)
            output.push(formatWord(createWord(state), state, '接龙对战重新开始，第一个词是'))
          }
        }
      } else {
        // 一般情况下接死
        output[0] += '\n由于接龙无法继续，接龙自动停止。'
        states[session.channelId] = null
      }

      return send(output.join('\n'))
    })

  const cats = {
    '角色 /': '角色名',
    '符卡 /': '符卡名',
    篇目名: '篇目名',
    角色能力: '角色能力',
    角色称号: '角色称号',
    格斗作技能: '格斗作技能',
  }

  function prepareNext(state: State, word: string) {
    state.nextWords = new Set()
    state.tones = getNextTones(word, state.reverse, state.strict)
    for (const tone of state.tones) {
      for (const word of state.dict[tone] || []) {
        if (!state.words.has(word)) state.nextWords.add(word)
      }
    }
    if (state.arcade) {
      state.timeout = Math.min(Date.now() + Time.minute,
        (state.timeout || Infinity) - Math.min(100, state.index) * 500,
      ) + Time.minute
    } else if (state.pkRounds) {
      state.timeout = Date.now() + 2 * Time.minute
    } else {
      state.timeout = Date.now() + 30 * Time.minute
    }
    const { size } = state.nextWords
    if (!state.arcade || !size) return size > 0

    // 街机模式
    const words = [...state.nextWords]
    const threshold = Math.max(1, Math.ceil(size * (0.8 - Math.min(100, state.index) * 0.006)))
    if (size === threshold) return (state.restriction = '', true)
    const rules: string[][] = []
    let i: number, bestList: string[], list: string[]

    // 分类限制
    let bestCat: string
    for (const cat in cats) {
      list = words.filter(w => wordMap[w][0].startsWith(cat))
      if (list.length > threshold && list.length < (bestList ? bestList.length : size)) {
        bestCat = cats[cat]
        bestList = list
      }
    }
    if (bestCat) rules.push([`属于${bestCat}且`, ...bestList])

    // 严格模式
    if (!state.strict) {
      const strictDict = getToneDict(state.reverse, true)
      const set = new Set<string>()
      for (const tone of state.tones) {
        for (const word of strictDict[tone] || []) {
          if (!state.words.has(word)) set.add(word)
        }
      }
      if (set.size > threshold && set.size < size) {
        rules.push(['严格模式下', ...set])
      }
    }

    // 多音字
    if (state.tones.length === 1) {
      list = words.filter(w => getNextTones(w, !state.reverse, false).length > 1)
      if (list.length > threshold && list.length < size) {
        rules.push([`以多音字${state.reverse ? '结尾' : '开头'}`, ...list])
      }
    }

    // 首尾字音不同
    list = words.filter(w => intersection(state.tones, getNextTones(w, !state.reverse, state.strict)).length)
    if (list.length > threshold && list.length < size) {
      rules.push(['首尾字音不同且', ...list])
    }

    // 字数限制
    const minLength = Math.min(...words.map(w => w.length))
    for (i = minLength; (list = words.filter(w => w.length > i)).length > threshold; ++i) {
      bestList = list
    }
    if (i > minLength) rules.push([`不少于 ${i} 个字的`, ...bestList])
    const maxLength = Math.max(...words.map(w => w.length))
    for (i = maxLength; (list = words.filter(w => w.length < i)).length > threshold; --i) {
      bestList = list
    }
    if (i < maxLength) rules.push([`不多于 ${i} 个字的`, ...bestList])

    // 挑选限制条件
    if (rules.length) {
      const [restriction, ...list] = Random.pick(rules)
      state.nextWords = new Set(list)
      state.restriction = restriction
    } else {
      state.restriction = ''
    }
    return true
  }

  function createWord(state: State) {
    state.index = 0
    let word: string, index = 0
    while (++index < 20) {
      word = Random.pick(Object.keys(wordMap))
      logger.debug('start with', word)
      if (word !== '娘娘' && !state.words.has(word) && prepareNext(state, word)) break
    }
    if (index >= 20) {
      state.send('由于未知错误，接龙将自行停止。')
      delete states[state.channelId]
      throw new Error('cannot find word')
    }
    state.words.add(word)
    state.lastUser = null
    state.participants = {}
    return word
  }

  function formatWord(word: string, state: State, message: string) {
    const [category, fullname] = wordMap[word]
    message += `“${fullname}”（${category}）`
    if (state.arcade) message = '街机' + message
    if (state.strict) message = '严格' + message
    if (state.reverse) message = '反向' + message
    if (state.index) message = `第 ${state.index} 次` + message
    if (!state.nextWords.size) return message

    if (state.restriction || state.tones.length > 1) {
      message += `\n接下来${formatNext(state)}`
      if (state.arcade) {
        message = `${message.slice(0, -1)}，剩余时间：${((state.timeout - Date.now()) / 1000).toFixed()} 秒。`
      }
    } else if (state.arcade) {
      message += `\n剩余时间：${((state.timeout - Date.now()) / 1000).toFixed()} 秒。`
    }
    return message
  }

  function formatNext({ tones, reverse, restriction }: State) {
    return `请输入${restriction}${reverse ? '尾' : '首'}字读音为 ${tones.join(', ')} 的东方词汇。`
  }

  function setTask(id: string) {
    const state = states[id]
    if (!state) return
    clearTimeout(state.timer)
    if (state.pkRounds) {
      state.timer = setTimeout(async () => {
        states[id] = null
        logger.debug('timeout')
        const ids = Object.keys(state.pkRounds)
        if (state.lastUser && ids.length > 1) {
          state.send(`由于 1 分钟内无人成功应答，恭喜 ${segment.at(state.lastUser)} 在对战中获胜！`)
        } else {
          state.send(`由于 1 分钟内无人成功应答，对战接龙已停止。没有人获得胜利。`)
        }
      }, state.timeout - Date.now())
    } else {
      state.timer = setTimeout(() => {
        states[id] = null
        logger.debug('timeout')
        if (state.arcade) {
          state.send('街机接龙已失败。')
        } else {
          state.send(`由于 30 分钟内无人成功应答，接龙已停止。`)
        }
      }, state.timeout - Date.now())
    }
  }
}

export function getNextTones(word: string, reverse: boolean, strict: boolean) {
  return strict ? [reverse
    ? startTones[word] || getTone(word[0])[0]
    : endTones[word] || getTone(word[word.length - 1])[0],
  ] : getTone(word[reverse ? 0 : word.length - 1])
}
