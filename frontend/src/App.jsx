import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Upload, BarChart, TrendingUp, Lightbulb, X, Send, FileText,
  Download, Bot, Settings, Database, Activity, MessageCircle,
  HelpCircle, Sparkles, Zap, ChevronRight,
  Mic, MicOff, Image, Paperclip, FileSpreadsheet, RefreshCw, Pencil, Minus,
  /* ═══ PRO: Nuevos íconos ═══ */
  Copy, Check, Search, Clock, Moon, Sun, Shield, Keyboard, Hash, Type, Calendar,
  Share2, Mail, ExternalLink, Heart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const API = "http://127.0.0.1:8000"
const MODELS = [
  "ChatGPT (GPT-4o)",
  "Google Gemini 1.5 Flash",
  "Llama-3 70B (Groq)",
  "Copilot (Azure/OpenAI)",
  "Cohere (Command R)",
  "OpenRouter (Llama Free)"
]
/* ── ChatBot de Ayuda (offline, predefinido) ─────────────────── */
const HELP_ANSWERS = {
  "¿Qué formatos puedo subir?": "Puedes subir archivos en formato CSV (.csv), Excel (.xlsx, .xls) y JSON (.json). El sistema los procesará automáticamente.",
  "¿Cómo funciona el Agente IA?": "El Agente IA usa modelos avanzados como GPT-4o, Gemini o Llama 3 para analizar tus datos. Sube un archivo, selecciona un modelo en el header, y haz preguntas libres o usa los botones del Centro de Comandos.",
  "¿Puedo exportar reportes?": "¡Sí! Después de tu primer análisis, se habilitan tres botones de exportación: Word (.docx), PDF y PPTX con notas de orador para presentaciones ejecutivas.",
  "¿Cómo cambio el modelo de IA?": "En la barra superior (header) verás un selector desplegable con los modelos disponibles. Cámbialo antes de enviar tu consulta al Agente.",
  "¿Mis datos están seguros?": "Tus datos se procesan localmente en tu máquina. No se envían a servidores externos. Solo las consultas de análisis se envían al modelo de IA seleccionado."
}
/* ── Sugerencias rápidas para el agente ── */
const QUICK_ACTIONS = [
  { label: '📊 Resumen Estadístico', query: 'Haz un resumen estadístico general detallado y profesional de estos datos: medias, modas, desviación estándar, cuartiles y distribución.' },
  { label: '📈 Generar Gráficos', query: 'Describe qué gráficos serían más útiles para visualizar estos datos. Incluye: tipo de gráfico recomendado, variables a cruzar, y qué conclusiones se podrían extraer.' },
  { label: '🔍 Análisis Exhaustivo', query: 'Realiza un análisis exhaustivo y profundo de estos datos: estadísticas descriptivas completas, correlaciones entre variables, patrones clave, segmentación y recomendaciones estratégicas.' },
  { label: '🎯 Detectar Anomalías', query: 'Identifica todos los valores atípicos, anomalías y datos erróneos significativos en el dataset, indicando en qué columnas están y por qué son atípicos.' },
  { label: '📉 Tendencias', query: 'Extrae las tendencias principales, patrones temporales y predicciones lógicas de esta data.' },
  { label: '🔗 Correlaciones', query: 'Analiza las correlaciones entre todas las variables numéricas. ¿Cuáles tienen correlación fuerte positiva o negativa? ¿Qué implicaciones tienen?' }
]
function App() {
  // ── State ──
  const [fileData, setFileData] = useState(null)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const [modelChoice, setModelChoice] = useState(MODELS[0])
  // Agent chat
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const [agentMsgs, setAgentMsgs] = useState([
    { role: 'assistant', text: '¡Hola! Soy el Agente de Análisis Nexus. Sube un dataset y hazme cualquier pregunta sobre tus datos.' }
  ])
  const [agentPrompt, setAgentPrompt] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reports, setReports] = useState(false)
  const agentEndRef = useRef(null)
  // Toast notifications
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  // Status indicator for agent
  const [statusText, setStatusText] = useState('')
  const STATUS_PHASES = ['Analizando registros...', 'Calculando tendencias...', 'Generando visualizaciones...', 'Preparando respuesta...']
  /* ═══ PRO: Estado para chat multimodal (audio/imagen) ═══ */
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const imageInputRef = useRef(null)
  /* ═══ PRO: Nuevos estados ═══ */
  const [theme, setTheme] = useState('dark')
  const [isDragging, setIsDragging] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [historyMinimized, setHistoryMinimized] = useState(false)
  const [searchMinimized, setSearchMinimized] = useState(false)
  const searchInputRef = useRef(null)
  const canvasRef = useRef(null)
  const dragCounterRef = useRef(0)
  // Help chatbot
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [helpMsgs, setHelpMsgs] = useState([
    { role: 'bot', text: '¡Bienvenido! Soy NexusBot, tu guía. Selecciona una pregunta frecuente o escribe tu duda.' }
  ])
  const [helpInput, setHelpInput] = useState('')
  const helpEndRef = useRef(null)
  useEffect(() => { agentEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [agentMsgs, isAgentOpen])
  useEffect(() => { helpEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [helpMsgs, isHelpOpen])
  /* ═══ PRO: Theme toggle ═══ */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  /* ═══ PRO: Particle Background Effect ═══ */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const particles = []
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const color = theme === 'dark' ? '0,229,255' : '0,151,167'
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color},0.5)`
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x, dy = p.y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(${color},${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [theme])
  /* ═══ PRO: Keyboard shortcuts ═══ */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s) }
      if (e.key === 'Escape') { setSearchOpen(false); setShowHistory(false) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); setShowHistory(s => !s) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus() }, [searchOpen])
  /* ═══ PRO: Notification sound ═══ */
  const playNotification = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.frequency.setValueAtTime(880, audioCtx.currentTime)
      osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.3)
    } catch {}
  }, [])
  /* ═══ PRO: Copy to clipboard ═══ */
  const copyToClipboard = useCallback((text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      showToast('📋 Copiado al portapapeles')
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }, [showToast])
  /* ═══ PRO: Drag & Drop handlers ═══ */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current++
    setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }, [])
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation() }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const fakeEvent = { target: { files: [files[0]] } }
      handleUploadFromDrop(files[0])
    }
  }, [])
  /* ═══ PRO: Dataset column classification ═══ */
  const classifyColumns = useCallback(() => {
    if (!fileData?.preview || !fileData?.columns) return { numeric: [], categorical: [], datetime: [] }
    const numeric = [], categorical = [], datetime = []
    fileData.columns.forEach(col => {
      const sample = fileData.preview[0]?.[col]
      if (sample === null || sample === undefined) { categorical.push(col); return }
      if (!isNaN(Number(sample))) numeric.push(col)
      else if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(String(sample))) datetime.push(col)
      else categorical.push(col)
    })
    return { numeric, categorical, datetime }
  }, [fileData])
  /* ═══ Funciones para reiniciar chats y editar mensajes ═══ */
  const clearAgentChat = () => setAgentMsgs([{ role: 'assistant', text: '¡Chat reiniciado! Dime, ¿en qué más te ayudo?' }])
  const clearHelpChat = () => setHelpMsgs([{ role: 'bot', text: '¡Chat reiniciado! Soy NexusBot, ¿en qué te ayudo?' }])
  const editHelpMsg = (text, index) => {
    setHelpInput(text)
    setHelpMsgs(p => p.slice(0, index))
  }
  const editAgentMsg = (text, index) => {
    setAgentPrompt(text)
    setAgentMsgs(p => p.slice(0, index))
    setAgentLoading(false)
    setStatusText('')
  }
  /* ═══ PRO: Función para reiniciar TODO el sistema ═══ */
  const resetSystem = () => {
    setFileData(null)
    setReports(false)
    setAgentMsgs([{ role: 'assistant', text: '¡Hola! Soy el Agente de Análisis Nexus. Sube un dataset y hazme cualquier pregunta sobre tus datos.' }])
    setProgressPercent(0)
    setStatusText('')
    setAnalysisHistory(prev => [{ type: 'upload', label: 'Sesión reiniciada', timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50))
    showToast('🔄 Sistema reiniciado. Listo para nuevo archivo.')
  }
  // ── Handlers ──
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('session_id', sessionId)
    try {
      setUploading(true)
      const res = await axios.post(`${API}/upload`, fd)
      setFileData(res.data)
      setAgentMsgs(p => [...p, {
        role: 'assistant',
        text: `✅ Archivo "${res.data.filename}" cargado exitosamente.\n\n📋 ${res.data.rows.toLocaleString()} filas Ã— ${res.data.cols} columnas\n\n🔒 Tus datos están protegidos con cifrado de extremo a extremo. El procesamiento se realiza localmente en tu servidor y ningún archivo se almacena en la nube.\n\nSelecciona una acción rápida abajo o escríbeme tu consulta personalizada:`
      }])
      setIsAgentOpen(true)
      showToast(`✅ ${res.data.filename} cargado (${res.data.rows.toLocaleString()} filas)`, 'success')
    } catch (err) {
      console.error(err)
      const detail = err?.response?.data?.detail || 'Error al conectar con el servidor'
      showToast(`âŒ ${detail}`, 'error')
    } finally { setUploading(false) }
  }
  /* ═══ PRO: Upload desde Drag & Drop ═══ */
  const handleUploadFromDrop = async (file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('session_id', sessionId)
    try {
      setUploading(true)
      const res = await axios.post(`${API}/upload`, fd)
      setFileData(res.data)
      setAgentMsgs(p => [...p, {
        role: 'assistant',
        text: `✅ Archivo "${res.data.filename}" cargado exitosamente.\n\n📋 ${res.data.rows.toLocaleString()} filas Ã— ${res.data.cols} columnas\n\n🔒 Tus datos están protegidos con cifrado de extremo a extremo.\n\nSelecciona una acción rápida abajo o escríbeme tu consulta personalizada:`
      }])
      setIsAgentOpen(true)
      playNotification()
      showToast(`✅ ${res.data.filename} cargado (${res.data.rows.toLocaleString()} filas)`, 'success')
    } catch (err) {
      console.error(err)
      const detail = err?.response?.data?.detail || 'Error al conectar con el servidor'
      showToast(`âŒ ${detail}`, 'error')
    } finally { setUploading(false) }
  }
  /* ═══ [INYECCIÃ“N] sendToAgent con STREAMING SSE (letra por letra) ═══ */
  const sendToAgent = async (query) => {
    if (!query?.trim()) return
    if (!fileData) {
      setAgentMsgs(p => [...p, { role: 'assistant', text: 'âš ï¸ Primero sube un archivo de datos desde el Panel de Control.' }])
      setAgentPrompt('')
      setIsAgentOpen(true)
      return
    }
    setAgentMsgs(p => [...p, { role: 'user', text: query }])
    setAgentPrompt('')
    setIsAgentOpen(true)
    setAgentLoading(true)
    /* PRO: Progress bar animation */
    setProgressPercent(0)
    const progressInterval = setInterval(() => {
      setProgressPercent(p => p >= 90 ? 90 : p + Math.random() * 8)
    }, 400)
    let phase = 0
    setStatusText(STATUS_PHASES[0])
    const statusInterval = setInterval(() => { phase = (phase + 1) % STATUS_PHASES.length; setStatusText(STATUS_PHASES[phase]) }, 2200)
    try {
      // Usar endpoint de streaming SSE
      const response = await fetch(`${API}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, prompt: query, model_choice: modelChoice })
      })
      if (!response.ok) throw new Error('Stream failed')
      // Crear mensaje vacío del asistente para ir llenando
      setAgentMsgs(p => [...p, { role: 'assistant', text: '' }])
      setAgentLoading(false)
      setStatusText('')
      clearInterval(statusInterval)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // Parsear líneas SSE
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.slice(5).trim())
              if (payload.done) {
                setReports(true)
                if (payload.images && payload.images.length > 0) {
                     setAgentMsgs(p => {
                       const updated = [...p]
                       updated[updated.length - 1] = {
                         ...updated[updated.length - 1],
                         images: payload.images
                       }
                       return updated
                     })
                }
                break
              }
              if (payload.char !== undefined) {
                // Actualizar el último mensaje del asistente caracter por caracter
                setAgentMsgs(p => {
                  const updated = [...p]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    text: updated[updated.length - 1].text + payload.char
                  }
                  return updated
                })
              }
            } catch { /* ignorar JSON malformado */ }
          }
        }
      }
      setReports(true)
      /* PRO: Add to analysis history */
      setAnalysisHistory(prev => [{ type: 'analysis', label: query.slice(0, 80), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50))
      clearInterval(progressInterval)
      setProgressPercent(100)
      playNotification()
      setTimeout(() => setProgressPercent(0), 1000)
    } catch {
      setAgentLoading(false)
      setStatusText('')
      clearInterval(statusInterval)
      clearInterval(progressInterval)
      setProgressPercent(0)
      setAgentMsgs(p => [...p, { role: 'assistant', text: 'âŒ Error al conectar con el modelo. Verifica tus API Keys y el modelo seleccionado.' }])
    }
  }
  /* ═══ [INYECCIÃ“N] Envío de archivos multimedia (imagen) al backend ═══ */
  const sendMediaToAgent = async (file) => {
    if (!file || !fileData) return
    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    const localUrl = URL.createObjectURL(file)
    setAgentMsgs(p => [...p, {
      role: 'user',
      text: isImage ? '' : (isAudio ? '🎤 Nota de voz' : `📎 ${file.name}`),
      ...(isImage ? { media_type: 'image', media_url: localUrl } : {}),
      ...(isAudio ? { media_type: 'audio', media_url: localUrl } : {})
    }])
    setIsAgentOpen(true)
    setAgentLoading(true)
    setStatusText('Procesando archivo multimedia...')
    try {
      const fd = new FormData()
      fd.append('session_id', sessionId)
      fd.append('model_choice', modelChoice)
      fd.append('prompt', `Analiza este archivo adjunto: ${file.name}`)
      fd.append('media', file)
      const res = await axios.post(`${API}/chat/multimedia`, fd)
      setAgentMsgs(p => [...p, { role: 'assistant', text: res.data.response, images: res.data.images }])
      setReports(true)
      showToast('✅ Archivo multimedia procesado', 'success')
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Error desconocido'
      setAgentMsgs(p => [...p, { role: 'assistant', text: `âŒ Error al procesar multimedia: ${detail}` }])
    } finally { setAgentLoading(false); setStatusText('') }
  }
  /* ═══ [INYECCIÃ“N] Grabación de nota de voz ═══ */
  const toggleRecording = async () => {
    if (isRecording) {
      // Detener grabación
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      // Iniciar grabación
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const audioFile = new File([audioBlob], 'nota_de_voz.webm', { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
          sendMediaToAgent(audioFile)
        }
        mediaRecorder.start()
        setIsRecording(true)
      } catch {
        setAgentMsgs(p => [...p, { role: 'assistant', text: 'âš ï¸ No se pudo acceder al micrófono. Verifica los permisos del navegador.' }])
      }
    }
  }
  const sendHelpMsg = async (question) => {
    if (!question?.trim()) return
    setHelpMsgs(p => [...p, { role: 'user', text: question }])
    setHelpInput('')
    // Fallback rápido si coincide
    if (HELP_ANSWERS[question]) {
        setTimeout(() => setHelpMsgs(p => [...p, { role: 'bot', text: HELP_ANSWERS[question] }]), 400)
        return
    }
    try {
        setHelpMsgs(p => [...p, { role: 'bot', text: '...' }])
        const response = await fetch(`${API}/chat/help`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, prompt: question, model_choice: modelChoice })
        })
        const data = await response.json()
        setHelpMsgs(p => {
            const updated = [...p]
            updated[updated.length - 1] = { role: 'bot', text: data.response }
            return updated
        })
    } catch {
       setHelpMsgs(p => {
            const updated = [...p]
            updated[updated.length - 1] = { role: 'bot', text: "Error de conexión con el Asistente Bot." }
            return updated
       })
    }
  }
  /* ═══ Función para descargas Nativas + historial ═══ */
  const handleDownload = (url, filename) => {
    window.location.href = url
    const label = filename || url.split('/').pop()
    setAnalysisHistory(prev => [{ type: 'download', label: `ðŸ“ Descarga: ${label}`, timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50))
  }
  // ── Render ──
  const colTypes = classifyColumns()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
    >
      {/* PRO: Particle Background */}
      <canvas ref={canvasRef} id="particle-canvas" />
      {/* PRO: Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div className="drag-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="drag-overlay-content">
              <Upload size={56} color="var(--accent)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Suelta tu archivo aquí</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>CSV, Excel, JSON, PDF, Word o TXT</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* PRO: Progress Bar (fixed top) */}
      {progressPercent > 0 && (
        <div className="analysis-progress" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999 }}>
          <div className="analysis-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
      {/* ═══════════════ HEADER ═══════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--header-bg)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.4s, border-color 0.4s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #00E5FF, #7C4DFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0B0F19', fontWeight: 900, fontSize: 20,
            boxShadow: '0 0 20px rgba(0,229,255,0.3)'
          }}>N</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Nexus <span style={{ color: '#00E5FF', fontWeight: 300 }}>Analytic</span>
          </h1>
          {/* ═══ [INYECCIÃ“N] Badges indicadores "En línea" — clickeables para abrir paneles ═══ */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <div className="badge-online" onClick={() => setIsHelpOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              background: 'rgba(179,136,255,0.12)', border: '1px solid rgba(179,136,255,0.3)',
              borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#B388FF',
              transition: 'all 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(179,136,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(179,136,255,0.12)'}
            >
              <span className="badge-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E676', display: 'inline-block' }} />
              NexusBot
            </div>
            <div className="badge-online" onClick={() => setIsAgentOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#00E5FF',
              transition: 'all 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.10)'}
            >
              <span className="badge-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E676', display: 'inline-block' }} />
              Agente IA
            </div>
          </div>
        </div>
        {/* Model Selector + PRO controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* PRO: History button - closes search when opening */}
          <button onClick={() => { setShowHistory(s => !s); setSearchOpen(false); setHistoryMinimized(false) }}
            style={{ background: showHistory ? 'rgba(0,229,255,0.15)' : 'var(--bg-secondary)', border: `1px solid ${showHistory ? 'rgba(0,229,255,0.3)' : 'var(--border-color)'}`, borderRadius: 10, width: 38, height: 38, cursor: 'pointer', color: showHistory ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!showHistory) e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { if (!showHistory) e.currentTarget.style.color = 'var(--text-secondary)' }}>
            <Clock size={17} />
          </button>
          {/* PRO: Search button - closes history when opening */}
          <button onClick={() => { setSearchOpen(s => !s); setShowHistory(false); setSearchMinimized(false) }}
            style={{ background: searchOpen ? 'rgba(0,229,255,0.15)' : 'var(--bg-secondary)', border: `1px solid ${searchOpen ? 'rgba(0,229,255,0.3)' : 'var(--border-color)'}`, borderRadius: 10, width: 38, height: 38, cursor: 'pointer', color: searchOpen ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!searchOpen) e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { if (!searchOpen) e.currentTarget.style.color = 'var(--text-secondary)' }}>
            <Search size={17} />
          </button>
          {/* PRO: Theme Toggle */}
          <div className="theme-toggle" data-active={theme === 'light' ? 'true' : 'false'}
            onClick={() => { setTheme(t => t === 'dark' ? 'light' : 'dark'); showToast(theme === 'dark' ? 'â˜€ï¸ Modo claro activado' : '🌙 Modo oscuro activado') }}>
            <div className="theme-toggle-knob">
              {theme === 'dark' ? <Moon size={12} color="#7C4DFF" /> : <Sun size={12} color="#FF9800" />}
            </div>
          </div>
          {/* Model Selector */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12,
            padding: '8px 16px', cursor: 'pointer', transition: 'all 0.4s'
          }}>
            <Settings size={16} color="var(--text-secondary)" />
            <select value={modelChoice}
              onChange={e => { setModelChoice(e.target.value); showToast(`âš™ï¸ Modelo cambiado a ${e.target.value}`) }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
              {MODELS.map(m => <option key={m} value={m} style={{ background: 'var(--bg-primary)' }}>{m}</option>)}
            </select>
          </div>
          {/* PRO: Reset Button in Header */}
          {fileData && (
            <button onClick={resetSystem} title="Nuevo Análisis / Cargar otro archivo"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <RefreshCw size={14} /> Nuevo
            </button>
          )}
        </div>
      </header>
      {/* PRO: History Panel - premium design */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{ position: 'fixed', top: 62, right: 32, width: historyMinimized ? 'auto' : 420, maxWidth: '92vw',
              background: 'var(--bg-secondary)', borderRadius: historyMinimized ? 14 : 20, border: '1px solid var(--border-color)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,229,255,0.08)', zIndex: 45, overflow: 'hidden',
              backdropFilter: 'blur(20px)' }}>
            {historyMinimized ? (
              /* Minimized: small pill */
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setHistoryMinimized(false)}>
                <Clock size={16} color="var(--accent)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Historial ({analysisHistory.length})</span>
                <ChevronRight size={14} color="var(--text-secondary)" style={{ transform: 'rotate(90deg)' }} />
                <button onClick={e => { e.stopPropagation(); setShowHistory(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: 4, padding: 2, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}><X size={14} /></button>
              </div>
            ) : (
              /* Expanded */
              <>
                <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(124,77,255,0.08))',
                  borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #00E5FF, #7C4DFF)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,229,255,0.3)' }}>
                      <Clock size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Historial</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{analysisHistory.length} actividades</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setHistoryMinimized(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#eab308'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <Minus size={14} />
                    </button>
                    <button onClick={() => setShowHistory(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 12px' }}>
                  {analysisHistory.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <Clock size={40} color="var(--border-color)" style={{ marginBottom: 12 }} />
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Sin actividad</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4, opacity: 0.6 }}>Tus acciones se registran aqui</div>
                    </div>
                  ) : analysisHistory.map((item, i) => {
                    const iconMap = { analysis: <Sparkles size={15} color="#00E5FF" />, download: <Download size={15} color="#60a5fa" />, share: <Share2 size={15} color="#25D366" />, upload: <Upload size={15} color="#00E676" /> }
                    const bgMap = { analysis: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,229,255,0.04))', download: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))', share: 'linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.04))', upload: 'linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,230,118,0.04))' }
                    const bdrMap = { analysis: 'rgba(0,229,255,0.2)', download: 'rgba(96,165,250,0.2)', share: 'rgba(37,211,102,0.2)', upload: 'rgba(0,230,118,0.2)' }
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => { if (item.type === 'analysis') { sendToAgent(item.label); setShowHistory(false) } }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 4,
                          borderRadius: 12, cursor: item.type === 'analysis' ? 'pointer' : 'default',
                          background: 'transparent', border: '1px solid transparent', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = bgMap[item.type]; e.currentTarget.style.borderColor = bdrMap[item.type] }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: bgMap[item.type], border: `1px solid ${bdrMap[item.type]}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {iconMap[item.type] || iconMap.analysis}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>{item.date} &bull; {item.timestamp}</div>
                        </div>
                        {item.type === 'analysis' && <ChevronRight size={14} color="var(--text-secondary)" />}
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* PRO: Search - chat-like dropdown from search button */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{ position: 'fixed', top: 62, right: 90, width: searchMinimized ? 'auto' : 440, maxWidth: '92vw', maxHeight: searchMinimized ? 'auto' : '70vh',
              background: 'var(--bg-secondary)', borderRadius: searchMinimized ? 14 : 20, border: '1px solid var(--border-color)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,229,255,0.08)', zIndex: 45,
              display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            {searchMinimized ? (
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setSearchMinimized(false)}>
                <Search size={16} color="var(--accent)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Buscar</span>
                <ChevronRight size={14} color="var(--text-secondary)" style={{ transform: 'rotate(90deg)' }} />
                <button onClick={e => { e.stopPropagation(); setSearchOpen(false); setSearchQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: 4, padding: 2, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}><X size={14} /></button>
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(124,77,255,0.05))',
                  borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00E5FF, #0097A7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,229,255,0.3)' }}>
                      <Search size={16} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Buscar</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSearchMinimized(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#eab308'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <Minus size={12} />
                    </button>
                    <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-primary)', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                    <Search size={16} color="var(--accent)" />
                    <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Escribe para buscar..."
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }} />
                    {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}><X size={14} /></button>}
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {!searchQuery ? (
                    <div style={{ padding: 36, textAlign: 'center' }}>
                      <Search size={36} color="var(--border-color)" style={{ marginBottom: 10 }} />
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>Busca en chats, columnas e historial</div>
                    </div>
                  ) : (() => {
                    const q = searchQuery.toLowerCase()
                    const agentResults = agentMsgs.filter(m => m.text?.toLowerCase().includes(q))
                    const helpResults = helpMsgs.filter(m => m.text?.toLowerCase().includes(q))
                    const colResults = fileData?.columns?.filter(c => c.toLowerCase().includes(q)) || []
                    const histResults = analysisHistory.filter(h => h.label?.toLowerCase().includes(q))
                    const total = agentResults.length + helpResults.length + colResults.length + histResults.length
                    return (
                      <>
                        {total === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin resultados para &quot;{searchQuery}&quot;</div>}
                        {agentResults.length > 0 && (
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={12} /> Agente IA ({agentResults.length})</div>
                            {agentResults.slice(0, 5).map((m, i) => (
                              <div key={`a${i}`} style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'rgba(0,229,255,0.04)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.04)'}
                                onClick={() => { setIsAgentOpen(true); setSearchOpen(false) }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: m.role === 'user' ? 'var(--accent)' : 'var(--accent-purple)' }}>{m.role === 'user' ? 'TÃš' : 'AGENTE'}</span>
                                <div style={{ marginTop: 2 }}>{m.text?.slice(0, 120)}{m.text?.length > 120 ? '...' : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {helpResults.length > 0 && (
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={12} /> NexusBot ({helpResults.length})</div>
                            {helpResults.slice(0, 3).map((m, i) => (
                              <div key={`h${i}`} style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'rgba(179,136,255,0.04)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(179,136,255,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(179,136,255,0.04)'}
                                onClick={() => { setIsHelpOpen(true); setSearchOpen(false) }}>
                                <div>{m.text?.slice(0, 120)}{m.text?.length > 120 ? '...' : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {colResults.length > 0 && (
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Database size={12} /> Columnas ({colResults.length})</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {colResults.map((c, i) => <span key={i} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>{c}</span>)}
                            </div>
                          </div>
                        )}
                        {histResults.length > 0 && (
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#eab308', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> Historial ({histResults.length})</div>
                            {histResults.slice(0, 4).map((h, i) => (
                              <div key={`hi${i}`} style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'rgba(234,179,8,0.04)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(234,179,8,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(234,179,8,0.04)'}
                                onClick={() => { if (h.type === 'analysis') sendToAgent(h.label); setSearchOpen(false) }}>
                                {h.label?.slice(0, 100)}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* ═══════════════ MAIN ═══════════════ */}
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '48px 24px', width: '100%', position: 'relative', zIndex: 1 }}>
        {!fileData ? (
          /* ── Upload Hero ── */
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 48 }}>
            <div style={{
              display: 'inline-block', padding: '6px 18px', borderRadius: 20,
              border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)',
              color: '#00E5FF', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              marginBottom: 28
            }}>AI Analytics Platform</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1, marginBottom: 20 }}>
              Decisiones Impulsadas<br />
              <span style={{
                background: 'linear-gradient(90deg, #00E5FF, #B388FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>por Inteligencia Artificial</span>
            </h2>
            <p style={{ fontSize: 17, color: '#8B949E', textAlign: 'center', maxWidth: 620, lineHeight: 1.7, marginBottom: 48 }}>
              Sube tu dataset empresarial y deja que Nexus extraiga patrones, limpie datos atípicos y genere reportes ejecutivos listos para presentar.
            </p>
            <label style={{ cursor: 'pointer', position: 'relative' }}>
              <div className="animate-glow" style={{
                background: '#151A2D', border: '1px solid #2d3748', width: 320, padding: '44px 0',
                borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
                transition: 'all 0.3s', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}>
                <Upload size={44} color="#00E5FF" style={{ marginBottom: 16 }} />
                <span style={{ fontWeight: 800, fontSize: 19, color: '#fff', marginBottom: 4 }}>Cargar Dataset</span>
                <span style={{ fontSize: 13, color: '#8B949E' }}>Excel, CSV, JSON, PDF, Word o TXT</span>
              </div>
              <input type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.docx" onChange={handleUpload} />
            </label>
            {uploading && (
              <p style={{ marginTop: 28, color: '#00E5FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} className="animate-spin" /> Procesando dataset...
              </p>
            )}
          </motion.div>
        ) : (
          /* ── Dashboard ── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Title */}
            <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: 24, marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Database size={28} color="#00E5FF" /> Panel de Control
              </h2>
              <p style={{ color: '#8B949E', marginTop: 8 }}>Dataset activo: <span style={{ color: '#00E5FF', fontWeight: 700 }}>{fileData.filename}</span></p>
            </div>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
              {/* Registros */}
              <div className="animate-shimmer" style={{
                background: '#151A2D', borderRadius: 18, padding: 28,
                border: '1px solid #1e293b', position: 'relative', overflow: 'hidden'
              }}>
                <Database size={80} color="#1e293b" style={{ position: 'absolute', right: -10, bottom: -10 }} />
                <span style={{ color: '#8B949E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Total Registros</span>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginTop: 8 }}>{fileData.rows.toLocaleString()}</div>
              </div>
              {/* Dimensiones */}
              <div className="animate-shimmer" style={{
                background: '#151A2D', borderRadius: 18, padding: 28,
                border: '1px solid #1e293b', position: 'relative', overflow: 'hidden'
              }}>
                <BarChart size={80} color="#1e293b" style={{ position: 'absolute', right: -10, bottom: -10 }} />
                <span style={{ color: '#8B949E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Columnas</span>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginTop: 8 }}>{fileData.cols}</div>
              </div>
              {/* Modelo Activo */}
              <div className="animate-shimmer" style={{
                background: '#151A2D', borderRadius: 18, padding: 28,
                border: '1px solid #1e293b', position: 'relative', overflow: 'hidden'
              }}>
                <Sparkles size={80} color="#1e293b" style={{ position: 'absolute', right: -10, bottom: -10 }} />
                <span style={{ color: '#8B949E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Modelo IA</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#00E5FF', marginTop: 12 }}>{modelChoice.split(' ')[0]}</div>
              </div>
              {/* Estado */}
              <div className="animate-shimmer" style={{
                background: '#151A2D', borderRadius: 18, padding: 28,
                border: '1px solid #1e293b', position: 'relative', overflow: 'hidden'
              }}>
                <Zap size={80} color="#1e293b" style={{ position: 'absolute', right: -10, bottom: -10 }} />
                <span style={{ color: '#8B949E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Estado</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#00E676', marginTop: 12 }}>â— Conectado</div>
              </div>
            </div>
            {/* Data Preview Table */}
            {fileData?.preview && fileData.preview.length > 0 && (
              <div style={{ background: '#151A2D', borderRadius: 18, padding: 24, border: '1px solid #1e293b', marginBottom: 40, overflow: 'auto' }}>
                <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 14, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Database size={18} color="#00E5FF" /> Vista Previa de Datos
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {fileData.columns?.map((col, idx) => (
                          <th key={idx} style={{ padding: '10px 14px', borderBottom: '2px solid #00E5FF', color: '#00E5FF', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.preview.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid #1e293b' }}>
                          {fileData.columns?.map((col, ci) => (
                            <td key={ci} style={{ padding: '8px 14px', color: '#cbd5e1', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(row[col] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 10 }}>Mostrando primeras 5 filas de {fileData.rows.toLocaleString()}</p>
              </div>
            )}
            {/* PRO: Dataset Intelligence - Column Classification */}
            {fileData?.columns && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 18, padding: 24, border: '1px solid var(--border-color)', marginBottom: 40 }}>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={18} color="var(--accent)" /> Inteligencia del Dataset
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div style={{ background: 'rgba(0,229,255,0.06)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,229,255,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Hash size={16} color="var(--accent)" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>Numéricas</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{colTypes.numeric.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {colTypes.numeric.slice(0, 4).map((c, i) => <span key={i} className="type-badge numeric">{c}</span>)}
                      {colTypes.numeric.length > 4 && <span className="type-badge numeric">+{colTypes.numeric.length - 4}</span>}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(179,136,255,0.06)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(179,136,255,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Type size={16} color="var(--accent-purple)" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: 1 }}>Categóricas</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{colTypes.categorical.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {colTypes.categorical.slice(0, 4).map((c, i) => <span key={i} className="type-badge categorical">{c}</span>)}
                      {colTypes.categorical.length > 4 && <span className="type-badge categorical">+{colTypes.categorical.length - 4}</span>}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,230,118,0.06)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(0,230,118,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Calendar size={16} color="var(--accent-green)" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 1 }}>Temporales</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{colTypes.datetime.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {colTypes.datetime.slice(0, 4).map((c, i) => <span key={i} className="type-badge datetime">{c}</span>)}
                      {colTypes.datetime.length > 4 && <span className="type-badge datetime">+{colTypes.datetime.length - 4}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Exportación */}
            <div style={{
              background: 'linear-gradient(135deg, #151A2D, #0f1629)', borderRadius: 18, padding: 28,
              border: '1px solid #1e293b', marginBottom: 40, position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'radial-gradient(circle, rgba(0,229,255,0.1), transparent)', borderRadius: '50%' }} />
              <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
                <Download size={20} color="#00E5FF" /> Exportación de Informes
              </h3>
              {reports ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  {[
                    { href: `${API}/export/word/${sessionId}/Nexus_Report.docx`, filename: 'Nexus_Report.docx', label: 'Documento Word', sub: 'Informe Completo', icon: <FileText size={24} />, color: '#2b579a', bg: 'rgba(43,87,154,0.08)', bdr: 'rgba(43,87,154,0.3)' },
                    { href: `${API}/export/pdf/${sessionId}/Nexus_Report.pdf`, filename: 'Nexus_Report.pdf', label: 'Archivo PDF', sub: 'Formato Ejecutivo', icon: <FileText size={24} />, color: '#e0443e', bg: 'rgba(224,68,62,0.08)', bdr: 'rgba(224,68,62,0.3)' },
                    { href: `${API}/export/pptx/${sessionId}/Nexus_Presentation.pptx`, filename: 'Nexus_Presentation.pptx', label: 'PowerPoint', sub: 'Presentación IA', icon: <BarChart size={24} />, color: '#d24726', bg: 'rgba(210,71,38,0.08)', bdr: 'rgba(210,71,38,0.3)' },
                    { href: `${API}/export/excel/${sessionId}/Nexus_Data.xlsx`, filename: 'Nexus_Data.xlsx', label: 'Estructura Excel', sub: 'Dataset Crudo', icon: <FileSpreadsheet size={24} />, color: '#217346', bg: 'rgba(33,115,70,0.08)', bdr: 'rgba(33,115,70,0.3)' }
                  ].map((b, i) => (
                    <button key={i} onClick={() => handleDownload(b.href, b.filename)} style={{
                      padding: '20px 16px', borderRadius: 20, textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      cursor: 'pointer', transition: 'all 0.3s',
                      background: b.bg, border: `1px solid ${b.bdr}`,
                      color: 'var(--text-primary)', position: 'relative'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 10px 20px ${b.bdr}` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ color: b.color, background: 'var(--bg-primary)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)' }}>
                        {b.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{b.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase' }}>{b.sub}</div>
                      </div>
                      <Download size={14} style={{ position: 'absolute', top: 20, right: 20, opacity: 0.4 }} />
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 14, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid #1e293b' }}>
                  Realiza tu primer análisis con el Agente IA para generar reportes descargables.
                </p>
              )}
              {/* PRO: Compartir resultados */}
              {reports && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, color: '#8B949E', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Share2 size={16} color="#00E5FF" /> Compartir Informe
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => { const url = `${API}/export/pdf/${sessionId}/Nexus_Report.pdf`; window.open(`https://wa.me/?text=${encodeURIComponent('📊 Informe Nexus Analytic - Descarga el reporte: ' + url)}`, '_blank'); setAnalysisHistory(prev => [{ type: 'share', label: 'Compartido por WhatsApp', timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50)) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#25D366', color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                    <button onClick={() => { const url = `${API}/export/pdf/${sessionId}/Nexus_Report.pdf`; window.open(`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent('Informe Nexus Analytic')}&body=${encodeURIComponent('Hola,\n\nTe comparto el informe generado por Nexus Analytic:\n' + url + '\n\nSaludos.')}`, '_blank'); setAnalysisHistory(prev => [{ type: 'share', label: 'Compartido por Gmail', timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50)) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#EA4335', color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(234,67,53,0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <Mail size={18} />
                      Gmail
                    </button>
                    <button onClick={() => { const url = `${API}/export/pdf/${sessionId}/Nexus_Report.pdf`; window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent('Informe Nexus Analytic')}&body=${encodeURIComponent('Hola,\n\nTe comparto el informe generado por Nexus Analytic:\n' + url + '\n\nSaludos.')}`, '_blank'); setAnalysisHistory(prev => [{ type: 'share', label: 'Compartido por Outlook', timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() }, ...prev].slice(0, 50)) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#0078D4', color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,120,212,0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <Mail size={18} />
                      Outlook
                    </button>
                  </div>
                </div>
              )}
              {/* Botón Volver al Princio (Anclado al Export) */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={resetSystem} style={{
                  width: '100%', padding: '16px', borderRadius: 16, background: 'rgba(0,229,255,0.05)',
                  border: '1px solid rgba(0,229,255,0.2)', color: '#00E5FF', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.3s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; e.currentTarget.style.borderColor = '#00E5FF' }}>
                  <RefreshCw size={18} /> Volver al Inicio / Cargar Nuevo Dataset
                </button>
              </div>
            </div>
            {/* Centro de Comandos */}
            <h3 style={{ fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 20 }}>Centro de Comandos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, paddingBottom: 100 }}>
              {[
                { icon: <BarChart size={32} />, title: 'Resumen Estadístico', desc: 'Panorama general descriptivo con medias, modas y desviaciones.', query: 'Haz un resumen estadístico general detallado y profesional de los datos.' },
                { icon: <Sparkles size={32} />, title: 'Análisis Exhaustivo', desc: 'Análisis profundo: correlaciones, segmentación, patrones y recomendaciones.', query: 'Realiza un análisis exhaustivo y profundo: estadísticas descriptivas completas, correlaciones entre variables, patrones clave, segmentación y recomendaciones estratégicas.' },
                { icon: <BarChart size={32} />, title: 'Generar Gráficos', desc: 'Describe los gráficos ideales para visualizar los datos: barras, líneas, dispersión.', query: 'Describe qué gráficos serían más útiles para visualizar estos datos. Incluye: tipo de gráfico recomendado, variables a cruzar, y qué conclusiones se podrían extraer.' },
                { icon: <TrendingUp size={32} />, title: 'Análisis de Tendencias', desc: 'Detecta vectores de crecimiento y correlaciones clave ocultas.', query: 'Extrae tendencias principales, patrones y predicciones lógicas de esta data.' },
                { icon: <Lightbulb size={32} />, title: 'Detección de Anomalías', desc: 'Aísla valores atípicos, fraudes potenciales o errores en los datos.', query: 'Identifica valores atípicos, anomalías y datos erróneos significativos.' },
                { icon: <Zap size={32} />, title: 'Correlaciones', desc: 'Cruza todas las variables numéricas y detecta relaciones fuertes o inversas.', query: 'Analiza las correlaciones entre todas las variables numéricas y explica cuáles son significativas.' }
              ].map((card, i) => (
                <button key={i} onClick={() => sendToAgent(card.query)} style={{
                  background: '#151A2D', padding: 32, borderRadius: 18, border: '1px solid #1e293b',
                  textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00E5FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ color: '#00E5FF', marginBottom: 18 }}>{card.icon}</div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{card.title}</h4>
                  <p style={{ fontSize: 13, color: '#8B949E', lineHeight: 1.6 }}>{card.desc}</p>
                  <ChevronRight size={18} color="#2d3748" style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      {/* ═══════════════ CHATBOT DE AYUDA (izquierda) ═══════════════ */}
      <div style={{ position: 'fixed', bottom: 28, left: 28, zIndex: 50 }}>
        <AnimatePresence>
          {isHelpOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{
                width: 360, height: '480px', maxHeight: '80vh',
                background: '#151A2D', borderRadius: 24,
                border: '1px solid #2d3748', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', marginBottom: 16,
                boxShadow: '0 0 40px rgba(179,136,255,0.12)'
              }}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #1A2038, #151A2D)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #B388FF, #7C4DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={22} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>NexusBot</div>
                    <div style={{ fontSize: 11, color: '#B388FF' }}>Asistente de Ayuda</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={clearHelpChat} title="Reiniciar chat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 8 }}>
                    <RefreshCw size={18} />
                  </button>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => setIsHelpOpen(false)} title="Minimizar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#eab308', padding: '6px 8px' }}>
                      <Minus size={20} />
                    </button>
                    <button onClick={() => setIsHelpOpen(false)} title="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '6px 8px' }}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {helpMsgs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 6 }}>
                    {m.role === 'user' && (
                       <button onClick={() => editHelpMsg(m.text, i)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2d3748', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }} title="Editar mensaje">
                         <Pencil size={10}/> Editar
                       </button>
                    )}
                    <div style={{
                      maxWidth: '85%', padding: '12px 16px', borderRadius: 16, fontSize: 13, lineHeight: 1.6,
                      ...(m.role === 'user'
                        ? { background: 'linear-gradient(135deg, #B388FF, #7C4DFF)', color: '#fff', fontWeight: 600, borderBottomRightRadius: 4 }
                        : { background: '#1A2038', color: '#cbd5e1', border: '1px solid #2d3748', borderBottomLeftRadius: 4 })
                    }}>{m.text}</div>
                  </div>
                ))}
                <div ref={helpEndRef} />
              </div>
              {/* Quick Questions */}
              <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Preguntas Frecuentes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.keys(HELP_ANSWERS).slice(0, 3).map((q, i) => (
                    <button key={i} onClick={() => sendHelpMsg(q)} style={{
                      background: 'rgba(179,136,255,0.08)', border: '1px solid rgba(179,136,255,0.2)', borderRadius: 8,
                      padding: '6px 10px', fontSize: 11, color: '#B388FF', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap'
                    }}>{q}</button>
                  ))}
                </div>
              </div>
              {/* Input */}
              <div style={{ padding: 14, borderTop: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', gap: 8, background: '#0B0F19', borderRadius: 12, padding: 6, border: '1px solid #2d3748' }}>
                  <input
                    value={helpInput} onChange={e => setHelpInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendHelpMsg(helpInput)}
                    placeholder="Escribe tu duda..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, padding: '8px 10px' }}
                  />
                  <button onClick={() => sendHelpMsg(helpInput)} disabled={!helpInput.trim()} style={{
                    background: '#7C4DFF', color: '#fff', border: 'none', borderRadius: 10, width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    opacity: helpInput.trim() ? 1 : 0.3
                  }}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Help Floating Button */}
        {!isHelpOpen && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            style={{ position: 'relative' }}
            onMouseEnter={e => { const l = e.currentTarget.querySelector('.floating-label'); if (l) l.style.opacity = 1 }}
            onMouseLeave={e => { const l = e.currentTarget.querySelector('.floating-label'); if (l) l.style.opacity = 0 }}>
            <button onClick={() => setIsHelpOpen(true)} style={{
              width: 62, height: 62, borderRadius: 20, border: 'none',
              background: 'linear-gradient(135deg, #7C4DFF, #B388FF)', cursor: 'pointer', position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(179,136,255,0.4), 0 0 30px rgba(124,77,255,0.15)',
              transition: 'all 0.3s'
            }}>
              <div style={{ position: 'absolute', inset: 2, background: 'rgba(11,15,25,0.85)', borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                <Bot size={28} color="#B388FF" style={{ filter: 'drop-shadow(0 0 8px rgba(179,136,255,0.7))' }} />
              </div>
            </button>
            <div className="floating-label" style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10,
              padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>ChatBot Soporte</div>
          </motion.div>
        )}
      </div>
      {/* ═══════════════ AGENTE IA (derecha) ═══════════════ */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50 }}>
        <AnimatePresence>
          {isAgentOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={{
                width: 380, maxWidth: '90vw', height: '520px', maxHeight: '80vh',
                background: '#0B0F19',
                borderRadius: 24, border: '1px solid #1e293b',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 16,
                boxShadow: '0 0 50px rgba(0,229,255,0.12)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '18px 20px', borderBottom: '1px solid #1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#151A2D', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'radial-gradient(circle, rgba(0,229,255,0.15), transparent)', borderRadius: '50%' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: 'linear-gradient(135deg, #0B0F19, #1A2038)',
                    border: '1px solid rgba(0,229,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(0,229,255,0.25)'
                  }}>
                    <Sparkles size={26} color="#00E5FF" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Agente IA</div>
                    <div style={{ fontSize: 11, color: '#00E5FF', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontWeight: 600 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E676', display: 'inline-block', boxShadow: '0 0 8px #00E676' }} />
                      En línea • {modelChoice.split(' (')[0]}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
                  <button onClick={clearAgentChat} title="Reiniciar chat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 8 }}>
                    <RefreshCw size={18} />
                  </button>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => setIsAgentOpen(false)} title="Minimizar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#eab308', padding: '6px 8px' }}>
                      <Minus size={20} />
                    </button>
                    <button onClick={() => setIsAgentOpen(false)} title="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '6px 8px' }}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, background: '#0B0F19' }}>
                {agentMsgs.map((m, i) => (
                  <div key={i} className="msg-wrapper" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                    {m.role === 'user' && (
                       <button onClick={() => editAgentMsg(m.text, i)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2d3748', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, marginBottom: 4 }} title="Editar mensaje">
                         <Pencil size={10}/> Editar
                       </button>
                    )}
                    {m.role === 'assistant' && (
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', background: '#151A2D', border: '1px solid #2d3748',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: '0 0 10px rgba(0,229,255,0.15)'
                      }}>
                        <Sparkles size={15} color="#00E5FF" />
                      </div>
                    )}
                    <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                      {/* Inline image for user uploads */}
                      {m.media_type === 'image' && m.media_url && (
                        <div style={{ padding: 4, background: '#0d2a3a', borderRadius: 14, border: '1px solid rgba(0,229,255,0.3)' }}>
                          <img src={m.media_url} alt="Imagen adjunta" style={{ width: '100%', maxWidth: 260, borderRadius: 10, display: 'block' }} />
                        </div>
                      )}
                      {/* Inline audio for user voice notes */}
                      {m.media_type === 'audio' && m.media_url && (
                        <div style={{ padding: '10px 14px', background: m.role === 'user' ? 'linear-gradient(135deg, #00E5FF, #0097A7)' : '#151A2D', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Mic size={16} color={m.role === 'user' ? '#0B0F19' : '#00E5FF'} />
                          <audio controls src={m.media_url} style={{ height: 36, width: '100%', filter: 'invert(0.85) hue-rotate(180deg)' }} />
                        </div>
                      )}
                      {m.text && (
                        <div style={{
                          padding: '14px 18px', borderRadius: 18, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                          ...(m.role === 'user'
                            ? { background: 'linear-gradient(135deg, #00E5FF, #0097A7)', color: '#0B0F19', fontWeight: 700, borderBottomRightRadius: 4, boxShadow: '0 0 15px rgba(0,229,255,0.2)' }
                            : { background: '#151A2D', color: '#e2e8f0', border: '1px solid #1e293b', borderBottomLeftRadius: 4 })
                        }}>{m.text}</div>
                      )}
                      {/* PRO: Copy button for assistant messages */}
                      {m.role === 'assistant' && m.text && (
                        <button className="copy-btn" onClick={() => copyToClipboard(m.text, i)}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                            border: '1px solid #2d3748', borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600,
                            color: copiedIdx === i ? '#00E676' : '#94a3b8', transition: 'all 0.2s' }}>
                          {copiedIdx === i ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                        </button>
                      )}
                      {m.images && m.images.map((imgb64, idx) => (
                        <div key={idx} style={{ padding: 4, background: '#151A2D', border: '1px solid #1e293b', borderRadius: 12 }}>
                          <img src={`data:image/png;base64,${imgb64}`} alt="Gráfico del análisis" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Sugerencias rápidas cuando hay archivo y no está cargando */}
                {fileData && !agentLoading && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
                    {QUICK_ACTIONS.map((action, i) => (
                      <button key={i} onClick={() => sendToAgent(action.query)} style={{
                        background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
                        borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#00E5FF',
                        cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.borderColor = '#00E5FF' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)' }}
                      >{action.label}</button>
                    ))}
                  </div>
                )}
                {agentLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#151A2D', border: '1px solid #2d3748', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bot size={15} color="#00E5FF" />
                      </div>
                      <div style={{ padding: '14px 22px', background: '#151A2D', border: '1px solid #1e293b', borderRadius: 18, borderBottomLeftRadius: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF' }} />
                        <div className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF', animationDelay: '0.15s' }} />
                        <div className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF', animationDelay: '0.3s' }} />
                      </div>
                    </div>
                    {statusText && (
                      <div style={{ fontSize: 11, color: '#00E5FF', fontWeight: 600, paddingLeft: 42, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.3s' }}>
                        <Activity size={12} className="animate-spin" /> {statusText}
                      </div>
                    )}
                  </div>
                )}
                <div ref={agentEndRef} />
              </div>
              {/* ═══ [INYECCIÃ“N] Input ANCLADO al fondo con botones multimodal ═══ */}
              <div style={{ padding: 14, background: '#151A2D', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6, background: '#0B0F19', borderRadius: 14, padding: 6, border: '1px solid #2d3748', alignItems: 'center' }}>
                  {/* Botón adjuntar imagen */}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={agentLoading || !fileData}
                    title="Adjuntar imagen"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8,
                      color: '#64748b', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: (agentLoading || !fileData) ? 0.3 : 1
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#00E5FF'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                  >
                    <Image size={18} />
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) sendMediaToAgent(e.target.files[0]); e.target.value = '' }} />
                  {/* Botón nota de voz */}
                  <button
                    onClick={toggleRecording}
                    disabled={agentLoading || !fileData}
                    title={isRecording ? 'Detener grabación' : 'Enviar nota de voz'}
                    className={isRecording ? 'recording-active' : ''}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8,
                      color: isRecording ? '#fff' : '#64748b', transition: 'color 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: (agentLoading || !fileData) ? 0.3 : 1
                    }}
                    onMouseEnter={e => { if (!isRecording) e.currentTarget.style.color = '#F44336' }}
                    onMouseLeave={e => { if (!isRecording) e.currentTarget.style.color = '#64748b' }}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  {/* Input de texto */}
                  <input
                    value={agentPrompt} onChange={e => setAgentPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendToAgent(agentPrompt)}
                    placeholder={fileData ? "Pregunta sobre tus datos..." : "Sube un archivo primero..."}
                    disabled={agentLoading}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, padding: '10px 8px' }}
                  />
                  {/* Botón enviar */}
                  <button onClick={() => sendToAgent(agentPrompt)} disabled={agentLoading || !agentPrompt.trim()} style={{
                    background: '#00E5FF', color: '#0B0F19', border: 'none', borderRadius: 10,
                    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 800, opacity: (agentLoading || !agentPrompt.trim()) ? 0.3 : 1,
                    transition: 'all 0.2s', boxShadow: '0 0 10px rgba(0,229,255,0.3)', flexShrink: 0
                  }}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Agent Floating Robot Button */}
        {!isAgentOpen && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            style={{ position: 'relative' }}
            onMouseEnter={e => e.currentTarget.querySelector('.floating-label').style.opacity = 1}
            onMouseLeave={e => e.currentTarget.querySelector('.floating-label').style.opacity = 0}>
            <button onClick={() => setIsAgentOpen(true)} className="animate-glow" style={{
              width: 68, height: 68, borderRadius: 22, border: '1px solid rgba(0,229,255,0.35)',
              background: '#151A2D', cursor: 'pointer', position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s'
            }}>
              <div style={{ position: 'absolute', inset: 3, background: '#0B0F19', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={34} color="#00E5FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.7))' }} />
              </div>
              {/* Notification */}
              {!fileData && (
                <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#00E5FF', border: '2px solid #0B0F19', zIndex: 10 }}>
                  <span className="animate-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E5FF' }} />
                </span>
              )}
            </button>
            {/* Hover label */}
            <div className="floating-label" style={{ position: 'absolute', bottom: 78, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10,
              padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>Agente IA</div>
          </motion.div>
        )}
      </div>
      {/* ═══ Toast Notifications ═══ */}
      <div style={{ position: 'fixed', top: 80, right: 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              style={{
                background: 'rgba(21,26,45,0.95)', backdropFilter: 'blur(12px)',
                border: t.type === 'error' ? '1px solid #f87171' : '1px solid rgba(0,229,255,0.4)',
                borderRadius: 14, padding: '14px 22px', fontSize: 13, fontWeight: 700,
                color: t.type === 'error' ? '#fca5a5' : '#00E5FF',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 340
              }}
            >{t.msg}</motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* ═══ Footer ═══ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)', padding: '14px 24px',
        background: 'transparent', position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5,
            background: 'linear-gradient(135deg, #00E5FF, #7C4DFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0B0F19', fontWeight: 900, fontSize: 9
          }}>N</div>
          <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)' }}>
            Nexus <span style={{ color: 'rgba(0,229,255,0.6)', fontWeight: 400 }}>Analytic</span>
          </span>
        </div>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)', display: 'inline-block' }} />
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>
          Darien Garcia &nbsp;·&nbsp; Johan Rubiano
        </span>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)', display: 'inline-block' }} />
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.35 }}>
          © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}
export default App;