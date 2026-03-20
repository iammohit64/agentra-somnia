import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import {
  ArrowLeft, Zap, Star, Activity, TrendingUp,
  Shield, Send, ThumbsUp,
  ExternalLink, Copy, CheckCircle, Clock, Cpu, Terminal,
  Gauge, Sparkles, MessageSquare, Network, FileText, AlertCircle,
  Table, Lock, ShoppingCart, Loader2, FileCode, FileJson, ChevronDown, ChevronUp
} from 'lucide-react'
import NeonButton from '../components/ui/NeonButton'
import TerminalBox from '../components/ui/TerminalBox'
import MetricBadge from '../components/ui/MetricBadge'
import LoadingPulse from '../components/ui/LoadingPulse'
import ReviewSection from '../components/ui/ReviewSection'
import AgentCommsPanel from '../components/ui/AgentcommsPanel'
import OutputRenderer from '../components/ui/OutputRenderer'
import { useInteractionStore } from '../stores/interactionStore'
import { agentsAPI } from '../api/agents'
import { CHAIN_CONFIG } from '../config/chains.config'

function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const TABS = [
  { id: 'execute', label: 'EXECUTE', icon: Terminal },
  { id: 'comms', label: 'AGENT COMMS', icon: Network },
  { id: 'reviews', label: 'REVIEWS', icon: MessageSquare },
]

// ─────────────────────────────────────────────────────────────
// VS CODE SYNTAX HIGHLIGHTER
// ─────────────────────────────────────────────────────────────

function highlightSyntax(text) {
  if (!text) return ''
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const tokens = []
  let idx = 0

  // 1. Extract comments first so they aren't re-highlighted
  escaped = escaped.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, (match) => {
    const t = `__T${idx++}__`
    tokens.push({ t, html: `<span style="color:#6A9955;font-style:italic">${match}</span>` })
    return t
  })

  // 2. Extract strings
  escaped = escaped.replace(/(`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (match) => {
    const t = `__T${idx++}__`
    tokens.push({ t, html: `<span style="color:#ce9178">${match}</span>` })
    return t
  })

  // 3. Keywords
  escaped = escaped
    .replace(/\b(if|else|while|for|return|break|continue|switch|case|default|try|catch|finally|throw|await|async|yield|typeof|instanceof|in|of|new|delete|void)\b/g,
      '<span style="color:#c586c0">$1</span>')
    .replace(/\b(function|const|let|var|class|interface|enum|extends|implements|import|export|from|default|type|namespace|module|declare|abstract|override|readonly|static|public|private|protected|final)\b/g,
      '<span style="color:#569cd6">$1</span>')
    .replace(/\b(def|lambda|with|as|pass|raise|except|elif|print|True|False|None|self|cls|super)\b/g,
      '<span style="color:#569cd6">$1</span>')
    .replace(/\b(string|number|boolean|any|void|never|unknown|object|Symbol|null|undefined|int|float|double|char|bool|byte|long|short)\b/g,
      '<span style="color:#4ec9b0">$1</span>')
    .replace(/\b(console|Math|Object|Array|String|Number|Boolean|Promise|Error|Map|Set|Date|JSON|RegExp|Symbol|Reflect|Proxy|window|document|process|module|require|exports|__dirname|__filename)\b/g,
      '<span style="color:#4ec9b0">$1</span>')
    // Numbers
    .replace(/\b(0x[0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      '<span style="color:#b5cea8">$1</span>')
    // Decorators
    .replace(/(@[a-zA-Z_]\w*)/g,
      '<span style="color:#dcdcaa">$1</span>')
    // Function/method calls
    .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g,
      '<span style="color:#dcdcaa">$1</span>')
    // Object keys
    .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/g,
      '<span style="color:#9cdcfe">$1</span>')

  // 4. Restore tokens
  tokens.forEach(({ t, html }) => {
    escaped = escaped.split(t).join(html)
  })

  return escaped
}

function detectLang(code) {
  if (/^\s*(def |import |from .+ import|class .+:|print\(|if __name__)/.test(code)) return 'python'
  if (/pragma solidity|contract |mapping\(|uint256|address public/.test(code)) return 'solidity'
  if (/<\/?[a-z][\s\S]*>/i.test(code) && !/{/.test(code)) return 'html'
  if (/^\s*<\?php/.test(code)) return 'php'
  if (/SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|FROM|WHERE/i.test(code)) return 'sql'
  if (/^\s*{[\s\S]*}$/.test(code.trim()) || /"[^"]+"\s*:/.test(code)) return 'json'
  if (/fn |let mut|impl |use std::|println!/.test(code)) return 'rust'
  if (/func |package main|fmt\.Print|:= /.test(code)) return 'go'
  if (/const |let |var |=>|console\.|require\(|import .+ from/.test(code)) return 'javascript'
  if (/public (class|static|void)|System\.out|throws |@Override/.test(code)) return 'java'
  if (/#include|std::|cout|cin|int main/.test(code)) return 'cpp'
  return 'code'
}

// ─────────────────────────────────────────────────────────────
// CODE BLOCK — VS Code Dark+ theme
// ─────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  const detectedLang = lang || detectLang(code)

  const langColors = {
    python: '#3572A5', javascript: '#f1e05a', typescript: '#3178c6',
    solidity: '#AA6746', html: '#e34c26', css: '#563d7c', sql: '#e38c00',
    rust: '#dea584', go: '#00ADD8', java: '#b07219', cpp: '#f34b7d',
    json: '#40c4ff', php: '#4F5D95', code: '#9e9e9e',
  }
  const dotColor = langColors[detectedLang] || '#9e9e9e'

  return (
    <div className="my-4 rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid #2d2d2d' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1e1e1e', borderBottom: '1px solid #2d2d2d' }}>
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28ca41' }} />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#858585' }}>
              {detectedLang}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
          style={{ color: copied ? '#4ec9b0' : '#858585', background: copied ? 'rgba(78,201,176,0.1)' : 'transparent' }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#cccccc' }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = '#858585' }}
        >
          {copied
            ? <><CheckCircle size={12} /> COPIED</>
            : <><Copy size={12} /> COPY CODE</>
          }
        </button>
      </div>

      {/* Line numbers + code */}
      <div className="overflow-x-auto" style={{ background: '#1e1e1e' }}>
        <table className="w-full border-collapse">
          <tbody>
            {code.split('\n').map((line, i) => (
              <tr key={i} className="group" style={{ lineHeight: '1.6' }}>
                <td
                  className="select-none text-right pr-4 pl-3 text-[12px] font-mono"
                  style={{ color: '#4a4a4a', minWidth: '2.8rem', userSelect: 'none', borderRight: '1px solid #2d2d2d', verticalAlign: 'top' }}
                >
                  {i + 1}
                </td>
                <td className="pl-4 pr-4 text-[13px] font-mono" style={{ color: '#d4d4d4', whiteSpace: 'pre' }}>
                  <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line) || '&nbsp;' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TABLE BLOCK
// ─────────────────────────────────────────────────────────────

function TableBlock({ rows, isMarkdown }) {
  const [copied, setCopied] = useState(false)

  if (!rows || rows.length === 0) return null

  // Parse rows into cells
  const parseRow = (row) => {
    if (isMarkdown) {
      return row.split('|').map(c => c.trim()).filter((_, i, a) => i !== 0 && i !== a.length - 1)
    }
    return row.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
  }

  const headers = parseRow(rows[0])
  // For markdown, skip the separator row (---)
  const dataRows = isMarkdown
    ? rows.slice(1).filter(r => !r.replace(/[|\-: ]/g, '').trim() === '')
        .filter(r => !/^\s*\|[\s\-:|]+\|\s*$/.test(r))
    : rows.slice(1)

  const csvText = [rows[0], ...dataRows].join('\n')

  return (
    <div className="my-4 rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid #2d2d2d' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1e1e1e', borderBottom: '1px solid #2d2d2d' }}>
        <div className="flex items-center gap-2">
          <Table size={13} style={{ color: '#4ec9b0' }} />
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#858585' }}>
            DATA TABLE — {dataRows.length} {dataRows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(csvText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
          style={{ color: copied ? '#4ec9b0' : '#858585', background: copied ? 'rgba(78,201,176,0.1)' : 'transparent' }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = '#cccccc' }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = '#858585' }}
        >
          {copied
            ? <><CheckCircle size={12} /> COPIED</>
            : <><Copy size={12} /> COPY CSV</>
          }
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto" style={{ background: '#1e1e1e' }}>
        <table className="w-full text-[12px] font-mono">
          <thead style={{ position: 'sticky', top: 0, background: '#252526', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #2d2d2d' }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left px-4 py-2.5 whitespace-nowrap font-bold"
                  style={{ color: '#4ec9b0', borderRight: i < headers.length - 1 ? '1px solid #2d2d2d' : 'none' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => {
              const cells = parseRow(row)
              return (
                <tr
                  key={ri}
                  style={{ borderBottom: '1px solid #2a2a2a' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-2 whitespace-nowrap"
                      style={{
                        color: '#d4d4d4',
                        borderRight: ci < cells.length - 1 ? '1px solid #2a2a2a' : 'none',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// READABLE OUTPUT — main parser
// Parses text into blocks: paragraph | code | table | heading | list
// ─────────────────────────────────────────────────────────────

function inlineFormat(text) {
  const parts = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index} className="text-[var(--color-text-primary)] font-semibold">{match[2]}</strong>)
    } else if (match[0].startsWith('*')) {
      parts.push(<em key={match.index} className="italic text-[var(--color-text-muted)]">{match[3]}</em>)
    } else {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded font-mono text-[11px]"
          style={{ background: 'rgba(124,58,237,0.15)', color: '#c084fc' }}>
          {match[4]}
        </code>
      )
    }
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
}

function parseOutputToBlocks(raw) {
  if (!raw) return []

  // Unescape
  const text = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '')
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── Empty line
    if (!trimmed) { blocks.push({ type: 'spacer' }); i++; continue }

    // ── Fenced code block  ```lang
    const fenceMatch = trimmed.match(/^```(\w*)$/)
    if (fenceMatch) {
      const lang = fenceMatch[1] || ''
      const codeLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') })
      continue
    }

    // ── Markdown table  | col | col |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableRows.push(lines[i])
        i++
      }
      // Filter out separator rows like |---|---|
      const meaningful = tableRows.filter(r => !/^\s*\|[\s\-:|]+\|\s*$/.test(r))
      if (meaningful.length >= 1) {
        blocks.push({ type: 'table', rows: meaningful, isMarkdown: true })
      }
      continue
    }

    // ── CSV-style table (3+ lines, consistent comma count ≥ 2)
    const commas = (trimmed.match(/,/g) || []).length
    if (commas >= 2) {
      let j = i + 1
      while (
        j < lines.length &&
        lines[j].trim() !== '' &&
        (lines[j].match(/,/g) || []).length === commas
      ) { j++ }
      if (j - i >= 3) {
        blocks.push({ type: 'table', rows: lines.slice(i, j), isMarkdown: false })
        i = j
        continue
      }
    }

    // ── Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] })
      i++; continue
    }

    // ── Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++; continue
    }

    // ── Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', text: trimmed.slice(2) })
      i++; continue
    }

    // ── Unordered list item
    if (/^[-*•]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // ── Ordered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // ── Regular paragraph
    blocks.push({ type: 'paragraph', text: trimmed })
    i++
  }

  return blocks
}

function extractText(response) {
  if (!response) return ''
  if (typeof response === 'string') {
    const trimmed = response.trim()
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null) {
        const field = parsed.response ?? parsed.message ?? parsed.output ??
          parsed.text ?? parsed.content ?? parsed.result ?? parsed.answer ??
          parsed.summary ?? parsed.data
        if (field && typeof field === 'string') return field.trim()
        return Object.entries(parsed)
          .map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}:** ${typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`)
          .join('\n')
      }
    } catch { /* not json */ }
    return trimmed
  }
  if (typeof response === 'object' && response !== null) {
    const field = response.response ?? response.message ?? response.output ?? response.text ?? response.content
    if (field && typeof field === 'string') return field.trim()
    return JSON.stringify(response, null, 2)
  }
  return String(response)
}

function ReadableOutput({ response, success }) {
  const [copied, setCopied] = useState(false)
  const raw = extractText(response)
  if (!raw) return null

  const blocks = parseOutputToBlocks(raw)

  const plainText = raw
    .replace(/\\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/```$/gm, '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-xl border overflow-hidden ${
        success !== false
          ? 'border-[rgba(147,197,253,0.2)] bg-[rgba(147,197,253,0.02)]'
          : 'border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.02)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[rgba(0,0,0,0.35)]">
        <FileText size={13} className="text-[var(--color-star-blue)]" />
        <span className="text-[10px] font-mono font-bold text-[var(--color-star-blue)] tracking-widest">
          READABLE OUTPUT
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(plainText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer"
        >
          {copied
            ? <><CheckCircle size={12} className="text-[var(--color-success)]" /> COPIED</>
            : <><Copy size={12} /> COPY ALL</>
          }
        </button>
      </div>

      {/* Rendered blocks */}
      <div className="p-5 space-y-1">
        {blocks.map((block, i) => {
          switch (block.type) {

            case 'spacer':
              return <div key={i} className="h-2" />

            case 'hr':
              return <div key={i} className="my-4 h-px" style={{ background: 'rgba(124,58,237,0.2)' }} />

            case 'heading': {
              const sizeMap = {
                1: 'text-xl font-extrabold mt-6 mb-3',
                2: 'text-lg font-bold mt-5 mb-2',
                3: 'text-base font-bold mt-4 mb-1.5',
                4: 'text-[13px] font-bold mt-3 mb-1',
              }
              const colorMap = {
                1: 'text-[var(--color-text-primary)]',
                2: 'text-[var(--color-text-primary)]',
                3: 'text-[var(--color-purple-bright)]',
                4: 'text-[var(--color-purple-pale)]',
              }
              return (
                <div key={i} className={`font-display ${sizeMap[block.level] || sizeMap[3]} ${colorMap[block.level] || colorMap[3]}`}>
                  {inlineFormat(block.text)}
                </div>
              )
            }

            case 'paragraph':
              return (
                <p key={i} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {inlineFormat(block.text)}
                </p>
              )

            case 'quote':
              return (
                <blockquote key={i} className="border-l-2 pl-4 my-3 text-sm italic text-[var(--color-text-muted)]"
                  style={{ borderColor: 'rgba(124,58,237,0.5)' }}>
                  {inlineFormat(block.text)}
                </blockquote>
              )

            case 'ul':
              return (
                <ul key={i} className="my-2 space-y-1.5 ml-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      <span className="text-[var(--color-purple-bright)] mt-0.5 shrink-0 text-xs">❖</span>
                      <span>{inlineFormat(item)}</span>
                    </li>
                  ))}
                </ul>
              )

            case 'ol':
              return (
                <ol key={i} className="my-2 space-y-1.5 ml-1 list-none">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      <span className="font-mono text-[11px] text-[var(--color-purple-bright)] mt-0.5 shrink-0 min-w-[1.2rem]">
                        {j + 1}.
                      </span>
                      <span>{inlineFormat(item)}</span>
                    </li>
                  ))}
                </ol>
              )

            case 'code':
              return <CodeBlock key={i} code={block.content} lang={block.lang} />

            case 'table':
              return <TableBlock key={i} rows={block.rows} isMarkdown={block.isMarkdown} />

            default:
              return null
          }
        })}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// PURCHASE PANELS
// ─────────────────────────────────────────────────────────────

function DbPurchasePanel({ agent, onSuccess }) {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseType, setPurchaseType] = useState('monthly')
  const [error, setError] = useState('')

  const multiplier = agent.lifetimeMultiplier ?? 12
  const monthlyEth = agent.pricing ? parseFloat(formatUnits(BigInt(agent.pricing), 18)).toFixed(4) : '0'
  const lifetimeEth = agent.pricing ? parseFloat(formatUnits(BigInt(agent.pricing) * BigInt(multiplier), 18)).toFixed(4) : '0'

  const handlePurchase = async () => {
    setIsPurchasing(true)
    setError('')
    try {
      await agentsAPI.purchaseAccess(agent.agentId, purchaseType === 'lifetime', null)
      onSuccess()
    } catch (e) {
      setError(e?.response?.data?.error || 'Purchase failed')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <PurchasePanelUI
      purchaseType={purchaseType} setPurchaseType={setPurchaseType}
      monthlyEth={monthlyEth} lifetimeEth={lifetimeEth} multiplier={multiplier}
      onPurchase={handlePurchase} isPurchasing={isPurchasing} error={error} isBlockchain={false}
    />
  )
}

function BlockchainPurchasePanel({ agent, onSuccess }) {
  const { chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseType, setPurchaseType] = useState('monthly')
  const [error, setError] = useState('')

  const multiplier = BigInt(agent.lifetimeMultiplier ?? 12)
  const monthlyWei = BigInt(agent.pricing || '0')
  const lifetimeWei = monthlyWei * multiplier
  const monthlyEth = parseFloat(formatUnits(monthlyWei, 18)).toFixed(4)
  const lifetimeEth = parseFloat(formatUnits(lifetimeWei, 18)).toFixed(4)

  const currentNetwork = chain?.id ? CHAIN_CONFIG[chain.id] : null
  const contracts = currentNetwork?.contracts

  const handlePurchase = async () => {
    if (!contracts?.Agentra || !contracts?.AgentToken) { setError('Smart contracts not found for current network'); return }
    if (!agent.contractAgentId) { setError('Agent not registered on-chain'); return }
    setIsPurchasing(true)
    setError('')
    try {
      const isLifetime = purchaseType === 'lifetime'
      const totalCost = isLifetime ? lifetimeWei : monthlyWei
      const approveTx = await writeContractAsync({
        address: contracts.AgentToken.address, abi: contracts.AgentToken.abi,
        functionName: 'approve', args: [contracts.Agentra.address, totalCost],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      const purchaseTx = await writeContractAsync({
        address: contracts.Agentra.address, abi: contracts.Agentra.abi,
        functionName: 'purchaseAccess', args: [BigInt(agent.contractAgentId), isLifetime],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: purchaseTx })
      await agentsAPI.purchaseAccess(agent.agentId, isLifetime, receipt.transactionHash)
      onSuccess()
    } catch (e) {
      setError(e?.shortMessage || e?.response?.data?.error || e.message || 'Transaction failed')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <PurchasePanelUI
      purchaseType={purchaseType} setPurchaseType={setPurchaseType}
      monthlyEth={monthlyEth} lifetimeEth={lifetimeEth} multiplier={Number(multiplier)}
      onPurchase={handlePurchase} isPurchasing={isPurchasing} error={error} isBlockchain={true}
    />
  )
}

function PurchasePanelUI({ purchaseType, setPurchaseType, monthlyEth, lifetimeEth, multiplier, onPurchase, isPurchasing, error, isBlockchain }) {
  const { isConnected } = useAccount()
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-6">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center mb-6">
        <Lock size={32} className="text-[var(--color-purple-bright)]" />
      </div>
      <h2 className="font-display font-bold text-2xl text-[var(--color-text-primary)] mb-2">ACCESS REQUIRED</h2>
      <p className="text-[var(--color-text-muted)] text-sm max-w-sm mb-2">
        {isBlockchain ? 'Purchase a license to unlock. 80% goes to creator, 20% to platform.' : 'Purchase to unlock this off-chain agent. No crypto needed.'}
      </p>
      <div className="grid grid-cols-2 gap-4 w-full mb-6 mt-4">
        {[
          { id: 'monthly', label: '30 DAYS', price: monthlyEth, color: 'purple' },
          { id: 'lifetime', label: `LIFETIME ×${multiplier}`, price: lifetimeEth, color: 'success' },
        ].map(opt => (
          <motion.button key={opt.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setPurchaseType(opt.id)}
            className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
              purchaseType === opt.id
                ? opt.color === 'purple'
                  ? 'bg-[rgba(124,58,237,0.15)] border-[var(--color-purple-bright)]'
                  : 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)]'
                : 'border-[var(--color-border)] bg-black/20'
            }`}>
            <div className="text-[10px] font-mono tracking-widest text-[var(--color-text-dim)] mb-2">{opt.label}</div>
            <div className={`text-xl font-bold font-display ${opt.color === 'purple' ? 'text-[var(--color-purple-bright)]' : 'text-[var(--color-success)]'}`}>
              {opt.price} <span className="text-xs">AGT</span>
            </div>
          </motion.button>
        ))}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-[var(--color-danger)] text-xs p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] mb-4 w-full text-left">
          <AlertCircle size={13} className="shrink-0" /> {error}
        </div>
      )}
      <NeonButton icon={ShoppingCart} onClick={onPurchase} loading={isPurchasing} disabled={!isConnected} className="w-full justify-center">
        {!isConnected ? 'CONNECT WALLET' : isPurchasing ? (isBlockchain ? 'AWAITING WALLET...' : 'PROCESSING...') : `PURCHASE ${purchaseType.toUpperCase()} ACCESS`}
      </NeonButton>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// UPVOTE BUTTON
// ─────────────────────────────────────────────────────────────

function UpvoteButton({ agent, walletAddress, isConnected, isOwner }) {
  const { chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [hasUpvoted, setHasUpvoted] = useState(false)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [upvoteCount, setUpvoteCount] = useState(agent?.upvotes || 0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const isBlockchainAgent = agent?.contractAgentId !== null && agent?.contractAgentId !== undefined
  const currentNetwork = chain?.id ? CHAIN_CONFIG[chain.id] : null
  const contracts = currentNetwork?.contracts

  useEffect(() => {
    if (!walletAddress || !agent?.agentId) { setLoading(false); return }
    agentsAPI.checkUpvoteStatus(agent.agentId)
      .then(r => setHasUpvoted(r.data.hasUpvoted))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddress, agent?.agentId])

  const handleUpvote = async () => {
    if (!isConnected || isOwner || hasUpvoted || isUpvoting) return
    setIsUpvoting(true)
    setError('')
    try {
      let txHash = null
      if (isBlockchainAgent) {
        if (!contracts?.Agentra || !contracts?.AgentToken) throw new Error('Smart contracts not found')
        const upvoteCost = parseUnits('1', 18)
        const approveTx = await writeContractAsync({
          address: contracts.AgentToken.address, abi: contracts.AgentToken.abi,
          functionName: 'approve', args: [contracts.Agentra.address, upvoteCost],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTx })
        const upvoteTx = await writeContractAsync({
          address: contracts.Agentra.address, abi: contracts.Agentra.abi,
          functionName: 'upvote', args: [BigInt(agent.contractAgentId)],
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: upvoteTx })
        txHash = receipt.transactionHash
      }
      await agentsAPI.upvote(agent.agentId, txHash)
      setHasUpvoted(true)
      setUpvoteCount(prev => prev + 1)
    } catch (e) {
      setError(e?.shortMessage || e?.response?.data?.error || e.message || 'Upvote failed')
    } finally {
      setIsUpvoting(false)
    }
  }

  if (loading) return null

  return (
    <div className="glass-card-landing rounded-xl p-5 sm:p-6">
      <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-3">UPVOTE AGENT</h3>
      <p className="text-[9px] font-mono text-[var(--color-text-dim)] mb-3 leading-relaxed">
        {isBlockchainAgent ? '* Upvoting transfers 1 AGT directly to the creator.' : '* Free upvote — one per wallet. Helps with ranking.'}
      </p>
      {error && (
        <div className="flex items-center gap-2 text-[var(--color-danger)] text-xs p-2 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] mb-3">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}
      <motion.button
        whileHover={!hasUpvoted && !isOwner ? { scale: 1.02 } : {}}
        whileTap={!hasUpvoted && !isOwner ? { scale: 0.98 } : {}}
        onClick={handleUpvote}
        disabled={isUpvoting || hasUpvoted || isOwner || !isConnected}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-mono text-xs cursor-pointer disabled:cursor-not-allowed ${
          hasUpvoted ? 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)] text-[var(--color-success)]'
          : isOwner ? 'border-[var(--color-border)] text-[var(--color-text-dim)] opacity-40'
          : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[rgba(52,211,153,0.4)] hover:text-[var(--color-success)]'
        }`}
      >
        {isUpvoting ? <><Loader2 size={15} className="animate-spin" /> UPVOTING...</>
          : hasUpvoted ? <><CheckCircle size={15} /> UPVOTED ({upvoteCount})</>
          : <><ThumbsUp size={15} /> UPVOTE ({upvoteCount})</>}
      </motion.button>
      {isOwner && <p className="text-[9px] font-mono text-[var(--color-text-dim)] text-center mt-2">You own this agent</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function AgentDetail() {
  const { id } = useParams()
  const { logs, addLog, clearLogs, isExecuting, setExecuting, executionResult, setResult } = useInteractionStore()
  const { address, isConnected } = useAccount()

  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('execute')
  const [toastMessage, setToastMessage] = useState(null)
  const [hasValidAccess, setHasValidAccess] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)

  const isOwner = agent?.ownerWallet?.toLowerCase() === address?.toLowerCase()
  const isBlockchainAgent = agent?.contractAgentId !== null && agent?.contractAgentId !== undefined
  const userHasAccess = hasValidAccess || isOwner

  const showToast = (msg, type = 'error') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchAgentDetails = async () => {
    try {
      const response = await agentsAPI.getById(id)
      const agentData = response.data.agent || response.data
      setAgent(agentData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const checkAccessForWallet = async (agentData, walletAddr) => {
    if (!agentData || !walletAddr) return
    if (agentData.ownerWallet?.toLowerCase() === walletAddr.toLowerCase()) { setHasValidAccess(true); return }
    setAccessLoading(true)
    try {
      const res = await agentsAPI.checkAccess(agentData.agentId)
      setHasValidAccess(res.data?.hasAccess || false)
    } catch { setHasValidAccess(false) }
    finally { setAccessLoading(false) }
  }

  useEffect(() => {
    clearLogs(); setResult(null); setTask(''); setLoading(true); setAgent(null); setHasValidAccess(false)
    fetchAgentDetails()
  }, [id])

  useEffect(() => {
    if (agent && address) checkAccessForWallet(agent, address)
  }, [agent, address])

  const handlePurchaseSuccess = async () => {
    showToast('Access Unlocked Successfully!', 'success')
    await checkAccessForWallet(agent, address)
  }

  const handleExecute = async () => {
    if (!task.trim() || !isConnected) return
    setExecuting(true); setResult(null)
    addLog({ level: 'system', message: `Initiating execution: ${agent.name}` })
    addLog({ level: 'info', message: `Task: ${task}` })
    try {
      addLog({ level: 'info', message: 'Routing to agent endpoint...' })
      const response = await agentsAPI.execute(agent.agentId || agent.id, task)
      addLog({ level: 'success', message: 'Agent responded successfully' })
      const data = response.data
      setResult({
        output: data.response || data.output || data.result || data || `Task completed.\n\n${new Date().toISOString()}`,
        latency: data.latency || Math.floor(Math.random() * 500) + 100,
        success: true,
      })
    } catch (error) {
      addLog({ level: 'error', message: `Failed: ${error.message}` })
      setResult({ output: `Error: ${error.message}`, latency: 0, success: false })
    } finally {
      setExecuting(false); setTask('')
    }
  }

  const copyEndpoint = () => {
    navigator.clipboard.writeText(agent?.endpoint || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const monthlyEth = agent?.pricing ? parseFloat(formatUnits(BigInt(agent.pricing), 18)).toFixed(4) : '0'

  if (loading) return <div className="p-6 max-w-6xl mx-auto"><LoadingPulse rows={8} /></div>
  if (!agent) return (
    <div className="relative min-h-[60vh] flex items-center justify-center p-6">
      <div className="glass-card-landing rounded-2xl p-10 text-center">
        <Zap size={40} className="mx-auto mb-4 text-[var(--color-purple-bright)] opacity-40" />
        <div className="text-[var(--color-text-muted)] text-lg font-display font-bold mb-2">AGENT NOT FOUND</div>
        <Link to="/marketplace" className="text-[var(--color-purple-bright)] text-xs font-mono hover:underline">← BACK TO MARKETPLACE</Link>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen">
      {toastMessage && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-lg backdrop-blur-md ${
            toastMessage.type === 'success'
              ? 'bg-[rgba(52,211,153,0.15)] border border-[var(--color-success)] text-[var(--color-success)]'
              : 'bg-[rgba(248,113,113,0.15)] border border-[var(--color-danger)] text-[var(--color-danger)]'
          }`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toastMessage.msg}
        </motion.div>
      )}

      <div className="fixed top-20 right-10 w-[500px] h-[400px] rounded-full pointer-events-none opacity-25"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 p-5 lg:p-8 max-w-6xl mx-auto">
        <Link to="/marketplace">
          <motion.div whileHover={{ x: -4 }} className="inline-flex items-center gap-2 text-[var(--color-text-dim)] hover:text-[var(--color-purple-bright)] text-[11px] font-mono tracking-widest mb-6 transition-colors cursor-pointer group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            BACK TO MARKETPLACE
          </motion.div>
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="glass-card-landing rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(124,58,237,0.2)]">
            <div className="absolute top-0 right-0 w-[300px] h-[200px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
            <div className="relative z-10 flex flex-col lg:flex-row items-start gap-6">
              <motion.div whileHover={{ scale: 1.05 }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[rgba(124,58,237,0.2)] to-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.3)] flex items-center justify-center shrink-0">
                <Cpu size={32} className="text-[var(--color-purple-bright)]" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-primary)] tracking-tight">{agent.name}</h1>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] pulse-dot" />
                    <span className="text-[10px] font-mono text-[var(--color-success)] tracking-widest font-bold">{(agent.status || 'ACTIVE').toUpperCase()}</span>
                  </div>
                  {isBlockchainAgent && (
                    <span className="px-2 py-1 rounded text-[9px] font-mono bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[var(--color-purple-bright)]">ON-CHAIN</span>
                  )}
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm sm:text-base mb-4 leading-relaxed max-w-2xl">{agent.description}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(agent.tags || []).map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-lg text-[10px] font-mono bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.15)] text-[var(--color-purple-pale)]">#{tag}</span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-[var(--color-text-dim)]">
                  <span>OWNER: <span className="text-[var(--color-purple-bright)]">{agent.ownerWallet?.slice(0, 12) || '0xUNKNOWN'}...</span></span>
                  <span>CATEGORY: <span className="text-[var(--color-text-muted)]">{agent.category || 'N/A'}</span></span>
                  <span>MONTHLY: <span className="text-[var(--color-purple-bright)]">{monthlyEth} AGT</span></span>
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-6 flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[var(--color-border)] font-mono text-[11px]">
              <ExternalLink size={13} className="text-[var(--color-text-dim)] shrink-0" />
              <span className="text-[var(--color-text-muted)] flex-1 truncate">
                {userHasAccess ? agent.endpoint : '****** (LOCKED — purchase access to reveal) ******'}
              </span>
              {userHasAccess && (
                <button onClick={copyEndpoint} className="text-[var(--color-text-dim)] hover:text-[var(--color-purple-bright)] transition-colors cursor-pointer p-1">
                  {copied ? <CheckCircle size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        <FadeInSection className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'RATING', value: `${agent.rating || 0}/5.0`, color: 'yellow', icon: Star },
              { label: 'TOTAL CALLS', value: (agent.calls || 0).toLocaleString(), color: 'blue', icon: Activity },
              { label: 'SUCCESS RATE', value: `${agent.successRate || 0}%`, color: 'green', icon: TrendingUp },
              { label: 'MONTHLY PRICE', value: `${monthlyEth} AGT`, color: 'purple', icon: Shield },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <div className="glass-card-landing rounded-xl p-4 sm:p-5"><MetricBadge {...m} /></div>
              </motion.div>
            ))}
          </div>
        </FadeInSection>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 glass-card-landing rounded-xl overflow-hidden border border-[var(--color-border)]">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-mono text-[10px] tracking-widest border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[var(--color-purple-bright)] text-[var(--color-purple-bright)] bg-[rgba(124,58,237,0.08)]'
                    : 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Execute Tab */}
        {activeTab === 'execute' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
            <div className="lg:col-span-3 space-y-5">
              <FadeInSection>
                <div className="glass-card-landing rounded-xl p-5 sm:p-6 min-h-[300px]">
                  <AnimatePresence mode="wait">
                    {accessLoading ? (
                      <motion.div key="loading" className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[var(--color-purple-bright)]" />
                      </motion.div>
                    ) : userHasAccess ? (
                      <motion.div key="execute" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <h2 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-primary)] mb-5 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
                            <Terminal size={16} className="text-[var(--color-purple-bright)]" />
                          </div>
                          EXECUTION CONSOLE
                        </h2>
                        <div className="mb-5">
                          <label className="text-[9px] font-mono text-[var(--color-text-dim)] tracking-[0.2em] uppercase block mb-2">TASK INPUT</label>
                          <textarea value={task} onChange={e => setTask(e.target.value)}
                            placeholder="Describe the task for this agent..." rows={4}
                            className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-[10px] font-mono text-[var(--color-text-dim)]">
                            STATUS: <span className="text-[var(--color-success)] font-bold text-sm">UNLOCKED</span>
                            {isOwner && <span className="ml-2 text-[var(--color-purple-bright)]">(OWNER)</span>}
                          </div>
                          <NeonButton icon={Send} onClick={handleExecute} loading={isExecuting} disabled={!isConnected || !task.trim()}>
                            {isConnected ? 'EXECUTE' : 'CONNECT WALLET'}
                          </NeonButton>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="paywall" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        {isBlockchainAgent
                          ? <BlockchainPurchasePanel agent={agent} onSuccess={handlePurchaseSuccess} />
                          : <DbPurchasePanel agent={agent} onSuccess={handlePurchaseSuccess} />
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeInSection>

              {userHasAccess && executionResult && (
                <FadeInSection delay={0.1}>
                  <div className="space-y-4">
                    <OutputRenderer response={executionResult.output} latency={executionResult.latency} success={executionResult.success} agentName={agent.name} />
                    <ReadableOutput response={executionResult.output} success={executionResult.success} />
                  </div>
                </FadeInSection>
              )}

              <FadeInSection delay={0.15}>
                <TerminalBox logs={logs} title={userHasAccess ? 'EXECUTION LOG' : 'SYSTEM LOGS'} />
              </FadeInSection>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <FadeInSection delay={0.1}>
                <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-4 flex items-center gap-2">
                    <Sparkles size={12} className="text-[var(--color-purple-bright)]" /> CAPABILITIES
                  </h3>
                  <div className="space-y-2.5">
                    {['Natural Language Processing', 'Real-time Analysis', 'Multi-format Input', 'Streaming Output', 'Context Window 128K', 'Agent Composition'].map((cap, i) => (
                      <motion.div key={cap} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-center gap-2.5 text-xs text-[var(--color-text-muted)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-bright)] shrink-0" />
                        {cap}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection delay={0.15}>
                <UpvoteButton agent={agent} walletAddress={address} isConnected={isConnected} isOwner={isOwner} />
              </FadeInSection>

              <FadeInSection delay={0.2}>
                <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-5 flex items-center gap-2">
                    <Gauge size={12} className="text-[var(--color-star-blue)]" /> PERFORMANCE
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Avg Latency', value: `${agent.metrics?.avgLatency || 234}ms`, bar: 80, color: 'from-blue-500 to-blue-400' },
                      { label: 'Uptime', value: '99.9%', bar: 99, color: 'from-emerald-500 to-emerald-400' },
                      { label: 'Success Rate', value: `${agent.successRate || 0}%`, bar: agent.successRate || 0, color: 'from-purple-500 to-purple-400' },
                    ].map((stat, i) => (
                      <div key={stat.label}>
                        <div className="flex justify-between text-[10px] font-mono mb-1.5">
                          <span className="text-[var(--color-text-dim)]">{stat.label}</span>
                          <span className="text-[var(--color-text-muted)] font-bold">{stat.value}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-nebula-deep)] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${stat.bar}%` }}
                            transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                            className={`h-full rounded-full bg-gradient-to-r ${stat.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </div>
        )}

        {activeTab === 'comms' && (
          <FadeInSection>
            <AgentCommsPanel agentId={agent.agentId || agent.id} agentName={agent.name} />
          </FadeInSection>
        )}

        {activeTab === 'reviews' && (
          <FadeInSection>
            <div className="glass-card-landing rounded-xl p-5 sm:p-6">
              <ReviewSection agentId={agent.agentId || agent.id} />
            </div>
          </FadeInSection>
        )}
      </div>
    </div>
  )
}