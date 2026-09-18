import type { Adjust, Entry, EntryInput, GenerateResponse, Tone } from '../shared/types'
import { CAUSE_UNSURE } from '../shared/types'
import type { ChatMessage } from './llm'

const TONES: Record<Tone, string> = {
  plain: '平实、克制，像给自己随手记的，不抒情。',
  warm: '温和一点，允许一两处轻轻的自我体谅，但不煽情，不说教。',
}

export const SYSTEM_PROMPT = (tone: Tone) => `你是「几个词」日记应用里的代笔。用户不想打字，只从词库里点选了今天的感受、做的事、感受的原因，偶尔留一句话。你把这些词写成一小段日记，用户会把它当作自己写的。

硬性规则：
1. 第一人称，简体中文，口语化的书面语，像人自己随手记的。
2. 长度 3 到 5 句，60 到 140 字。一个自然段。
3. 只能写用户给出的信息。绝对不能编造具体的事件、地点、人名、对话、时间、天气、原因或细节。用户没说的，就不写。
4. 感受要写准：用户选了什么词，就围绕那个词写，可以直接用这个词。标了「很」的，程度要写出来；没标的不要夸大。
5. 有「主角」的事，日记以它为中心，其他事一笔带过或不提。
6. 「因为」关系要体现出来，但只写用户点的关系。标为「${CAUSE_UNSURE}」的，就如实写成说不清、还没想明白。
7. 不要建议，不要安慰，不要总结道理，不要出现「加油」「明天会更好」这类话，不要感叹号。
8. 不要出现「今天我选了」「记录」「日记」这类字眼，直接写内容。
9. 语气：${TONES[tone]}
10. 如果给了「昨天」的信息，只在同一情绪延续时可以顺带提一句，否则忽略。
11. 如果给了「用户改过的往期日记」，模仿它的语气和句式，不模仿内容。
12. 如果是「平淡的一天」，写 2 句就够，平淡本身就是内容，不要硬找意义。

追问规则：
- 只有当信息明显不够写准时，才提一个问题，并给三个简短选项。
- 问题像朋友随口一问，不像客服，不超过 25 个字。例如「和朋友吃饭是早约好的，还是临时起意？」
- 大多数情况下不需要追问，question 为 null。

输出严格为 JSON，不要多余文字：
{"draft": "日记正文", "question": null}
或
{"draft": "日记正文", "question": {"text": "问题", "options": ["选项一", "选项二", "选项三"]}}`

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${y}年${m}月${d}日 ${wd}`
}

function feelingsLine(input: EntryInput): string {
  if (!input.feelings.length) return '（没有选）'
  return input.feelings.map((f) => (f.intense ? `很${f.word}` : f.word)).join('、')
}

export function describeInput(input: EntryInput, answer?: string, question?: Entry['question']): string {
  const lines: string[] = []
  lines.push(`日期：${formatDate(input.date)}`)
  if (input.quiet) lines.push('今天：平淡的一天，没什么特别的事')
  lines.push(`感受：${feelingsLine(input)}`)
  if (input.activities.length) {
    lines.push(
      `做了什么：${input.activities.map((a) => (a === input.star ? `${a}（主角，今天主要是关于它）` : a)).join('、')}`,
    )
  }
  if (input.people.length) lines.push(`和谁：${input.people.join('、')}`)
  if (input.links.length) lines.push(`因为：${input.links.map((l) => `${l.feeling} ← ${l.cause}`).join('；')}`)
  if (input.note.trim()) lines.push(`用户留的一句话：「${input.note.trim()}」`)
  if (question && answer) lines.push(`追问「${question.text}」，用户答：「${answer}」`)
  return lines.join('\n')
}

function describeYesterday(y: Entry | null): string {
  if (!y) return ''
  const feel = feelingsLine(y)
  const acts = y.activities.slice(0, 4).join('、')
  return `\n\n昨天（仅供参考，通常忽略）：感受 ${feel}${acts ? `；做了 ${acts}` : ''}`
}

function describeExamples(examples: Entry[]): string {
  if (!examples.length) return ''
  return (
    '\n\n用户改过的往期日记（只学语气，不学内容）：\n' +
    examples.map((e, i) => `${i + 1}. ${e.text.trim()}`).join('\n')
  )
}

const ADJUSTS: Record<Adjust, string> = {
  shorter: '改得更短，2 到 3 句。',
  warmer: '改得温和一些，但不煽情。',
  plainer: '改得更平实克制，去掉多余的形容。',
  rewrite: '换一种写法重写一遍，句式和开头都换掉。',
}

export function buildMessages(opts: {
  tone: Tone
  input: EntryInput
  answer?: string
  question?: Entry['question']
  yesterday: Entry | null
  examples: Entry[]
  adjust?: Adjust
  previousText?: string
}): ChatMessage[] {
  const facts = describeInput(opts.input, opts.answer, opts.question)
  let user: string
  if (opts.adjust && opts.previousText) {
    user = `事实：\n${facts}\n\n上一稿：\n${opts.previousText}\n\n请${ADJUSTS[opts.adjust]}事实不变，不新增任何信息。question 一律为 null。`
  } else {
    user = `请根据下面的信息写日记。\n\n${facts}${describeYesterday(opts.yesterday)}${describeExamples(opts.examples)}`
  }
  return [
    { role: 'system', content: SYSTEM_PROMPT(opts.tone) },
    { role: 'user', content: user },
  ]
}

/** Defensive cleanup of whatever the model returned. */
export function normalizeResponse(r: Partial<GenerateResponse> | null | undefined): GenerateResponse {
  const draft = typeof r?.draft === 'string' ? r.draft.trim() : ''
  if (!draft) throw new Error('empty draft')
  let question: GenerateResponse['question'] = null
  const q = r?.question
  if (q && typeof q === 'object' && typeof q.text === 'string' && Array.isArray(q.options)) {
    const options = q.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 3)
    if (q.text.trim() && options.length >= 2) question = { text: q.text.trim(), options }
  }
  return { draft, question }
}
