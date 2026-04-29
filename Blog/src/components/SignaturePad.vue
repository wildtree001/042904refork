<template>
  <div class="signature-pad">
    <div class="pad-header">
      <h1 class="pad-title">手写签名板</h1>
      <p class="pad-subtitle">创作您的专属签名</p>
    </div>

    <div class="pad-container">
      <div class="tool-sidebar">
        <div class="tool-section">
          <h3 class="section-title">画笔类型</h3>
          <div class="brush-types">
            <button 
              v-for="brush in brushTypes" 
              :key="brush.id"
              class="brush-btn"
              :class="{ active: currentBrush === brush.id }"
              @click="selectBrush(brush.id)"
            >
              <span class="brush-icon">{{ brush.icon }}</span>
              <span class="brush-name">{{ brush.name }}</span>
            </button>
          </div>
        </div>

        <div class="tool-section">
          <h3 class="section-title">颜色</h3>
          <div class="color-palette">
            <button 
              v-for="color in colors" 
              :key="color"
              class="color-btn"
              :class="{ active: currentColor === color }"
              :style="{ background: color }"
              @click="selectColor(color)"
            ></button>
            <input 
              type="color" 
              class="color-picker"
              :value="currentColor"
              @input="onColorPickerInput($event)"
            />
          </div>
        </div>

        <div class="tool-section">
          <h3 class="section-title">粗细: {{ brushSize }}</h3>
          <div class="size-slider">
            <input 
              type="range" 
              min="1" 
              max="50" 
              :value="brushSize"
              @input="onBrushSizeInput($event)"
            />
            <div class="size-preview" :style="{ width: brushSize + 'px', height: brushSize + 'px', background: currentColor }"></div>
          </div>
        </div>

        <div class="tool-section">
          <h3 class="section-title">操作</h3>
          <div class="action-buttons">
            <button class="action-btn undo" @click="undo" :disabled="historyIndex <= 0">
              <span class="action-icon">↩</span>
              <span>撤销</span>
            </button>
            <button class="action-btn redo" @click="redo" :disabled="historyIndex >= history.length - 1">
              <span class="action-icon">↪</span>
              <span>重做</span>
            </button>
            <button class="action-btn eraser" :class="{ active: isEraser }" @click="toggleEraser">
              <span class="action-icon">{{ isEraser ? '✏️' : '🧽' }}</span>
              <span>{{ isEraser ? '画笔' : '橡皮' }}</span>
            </button>
            <button class="action-btn clear" @click="clearCanvas">
              <span class="action-icon">🗑️</span>
              <span>清空</span>
            </button>
          </div>
        </div>

        <div class="tool-section">
          <h3 class="section-title">保存</h3>
          <div class="save-buttons">
            <button class="save-btn png" @click="saveAsPNG">
              <span>💾</span>
              <span>保存为 PNG</span>
            </button>
            <button class="save-btn svg" @click="saveAsSVG">
              <span>📄</span>
              <span>保存为 SVG</span>
            </button>
          </div>
        </div>
      </div>

      <div class="canvas-wrapper" ref="canvasWrapperRef">
        <canvas 
          ref="canvasRef" 
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="stopDrawing"
        ></canvas>
        <div class="recognition-hint" v-if="showRecognition">
          <div class="hint-content">
            <span class="hint-icon">💡</span>
            <span class="hint-text">手写识别提示: 您的签名已识别为 "{{ recognizedText }}"</span>
            <button class="hint-close" @click="showRecognition = false">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div class="pad-footer">
      <p class="footer-text">提示: 按住鼠标或触摸屏幕开始绘制 | 支持鼠标和触摸设备</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import '@/styles/SignaturePad.css'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWrapperRef = ref<HTMLElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)

const currentBrush = ref('pen')
const currentColor = ref('#000000')
const brushSize = ref(3)
const isEraser = ref(false)
const showRecognition = ref(false)
const recognizedText = ref('')

const history = ref<ImageData[]>([])
const historyIndex = ref(-1)

const brushTypes = reactive([
  { id: 'pen', name: '钢笔', icon: '✏️' },
  { id: 'brush', name: '毛笔', icon: '🖌️' },
  { id: 'marker', name: '马克笔', icon: '🖍️' }
])

const colors = reactive([
  '#000000', '#e74c3c', '#3498db', '#2ecc71', 
  '#f39c12', '#9b59b6', '#1abc9c', '#34495e'
])

const brushSettings = computed(() => {
  switch (currentBrush.value) {
    case 'pen':
      return {
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin,
        opacity: 1,
        pressure: false
      }
    case 'brush':
      return {
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin,
        opacity: 0.8,
        pressure: true
      }
    case 'marker':
      return {
        lineCap: 'square' as CanvasLineCap,
        lineJoin: 'bevel' as CanvasLineJoin,
        opacity: 0.6,
        pressure: false
      }
    default:
      return {
        lineCap: 'round' as CanvasLineCap,
        lineJoin: 'round' as CanvasLineJoin,
        opacity: 1,
        pressure: false
      }
  }
})

function initCanvas() {
  const canvas = canvasRef.value
  const wrapper = canvasWrapperRef.value
  if (!canvas || !wrapper) return
  
  const dpr = window.devicePixelRatio || 1
  const rect = wrapper.getBoundingClientRect()
  
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  
  const context = canvas.getContext('2d')
  if (!context) return
  
  context.scale(dpr, dpr)
  ctx.value = context
  
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, rect.width, rect.height)
  
  saveToHistory()
}

function saveToHistory() {
  const canvas = canvasRef.value
  const context = ctx.value
  if (!canvas || !context) return
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  
  while (historyIndex.value < history.value.length - 1) {
    history.value.pop()
  }
  
  history.value.push(imageData)
  historyIndex.value = history.value.length - 1
  
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

function undo() {
  if (historyIndex.value <= 0) return
  
  historyIndex.value--
  const imageData = history.value[historyIndex.value]
  
  const context = ctx.value
  if (context && imageData) {
    context.putImageData(imageData, 0, 0)
  }
}

function redo() {
  if (historyIndex.value >= history.value.length - 1) return
  
  historyIndex.value++
  const imageData = history.value[historyIndex.value]
  
  const context = ctx.value
  if (context && imageData) {
    context.putImageData(imageData, 0, 0)
  }
}

function getMousePos(e: MouseEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function getTouchPos(e: TouchEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas || !e.touches[0]) return { x: 0, y: 0 }
  
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.touches[0].clientX - rect.left,
    y: e.touches[0].clientY - rect.top
  }
}

function startDrawing(e: MouseEvent) {
  const context = ctx.value
  if (!context) return
  
  isDrawing.value = true
  const pos = getMousePos(e)
  lastX.value = pos.x
  lastY.value = pos.y
  
  context.beginPath()
  context.moveTo(pos.x, pos.y)
  
  if (!isEraser.value) {
    context.strokeStyle = currentColor.value
    context.lineWidth = brushSize.value
    context.lineCap = brushSettings.value.lineCap
    context.lineJoin = brushSettings.value.lineJoin
    context.globalAlpha = brushSettings.value.opacity
  } else {
    context.strokeStyle = '#ffffff'
    context.lineWidth = brushSize.value * 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.globalAlpha = 1
  }
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  
  const context = ctx.value
  if (!context) return
  
  const pos = getMousePos(e)
  const settings = brushSettings.value
  
  if (settings.pressure && !isEraser.value) {
    const dx = pos.x - lastX.value
    const dy = pos.y - lastY.value
    const distance = Math.sqrt(dx * dx + dy * dy)
    const pressureFactor = Math.max(0.3, 1 - distance / 50)
    
    context.lineWidth = brushSize.value * pressureFactor
  }
  
  context.lineTo(pos.x, pos.y)
  context.stroke()
  
  lastX.value = pos.x
  lastY.value = pos.y
}

function stopDrawing() {
  if (isDrawing.value) {
    isDrawing.value = false
    saveToHistory()
    simulateRecognition()
  }
}

function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  const context = ctx.value
  if (!context) return
  
  isDrawing.value = true
  const pos = getTouchPos(e)
  lastX.value = pos.x
  lastY.value = pos.y
  
  context.beginPath()
  context.moveTo(pos.x, pos.y)
  
  if (!isEraser.value) {
    context.strokeStyle = currentColor.value
    context.lineWidth = brushSize.value
    context.lineCap = brushSettings.value.lineCap
    context.lineJoin = brushSettings.value.lineJoin
    context.globalAlpha = brushSettings.value.opacity
  } else {
    context.strokeStyle = '#ffffff'
    context.lineWidth = brushSize.value * 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.globalAlpha = 1
  }
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!isDrawing.value) return
  
  const context = ctx.value
  if (!context) return
  
  const pos = getTouchPos(e)
  
  context.lineTo(pos.x, pos.y)
  context.stroke()
  
  lastX.value = pos.x
  lastY.value = pos.y
}

function selectBrush(brushId: string) {
  currentBrush.value = brushId
  isEraser.value = false
}

function selectColor(color: string) {
  currentColor.value = color
  isEraser.value = false
}

function onColorPickerInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target && target.value) {
    selectColor(target.value)
  }
}

function onBrushSizeInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target && target.value) {
    brushSize.value = Number(target.value)
  }
}

function toggleEraser() {
  isEraser.value = !isEraser.value
}

function clearCanvas() {
  const canvas = canvasRef.value
  const context = ctx.value
  const wrapper = canvasWrapperRef.value
  
  if (!canvas || !context || !wrapper) return
  
  const rect = wrapper.getBoundingClientRect()
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, rect.width, rect.height)
  
  saveToHistory()
}

function simulateRecognition() {
  const texts = ['签名', '张三', '李四', '王二', '用户', '测试']
  const randomIndex = Math.floor(Math.random() * texts.length)
  const randomText = texts[randomIndex] ?? '签名'
  recognizedText.value = randomText
  showRecognition.value = true
  
  setTimeout(() => {
    showRecognition.value = false
  }, 5000)
}

function saveAsPNG() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const link = document.createElement('a')
  link.download = 'signature.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function saveAsSVG() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" 
         width="${canvas.width}" 
         height="${canvas.height}"
         viewBox="0 0 ${canvas.width} ${canvas.height}">
      <rect width="100%" height="100%" fill="white"/>
      <image href="${canvas.toDataURL('image/png')}" 
             width="100%" 
             height="100%"/>
    </svg>
  `
  
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.download = 'signature.svg'
  link.href = URL.createObjectURL(blob)
  link.click()
}

onMounted(() => {
  initCanvas()
  
  window.addEventListener('resize', () => {
    const currentData = history.value[historyIndex.value]
    initCanvas()
    if (currentData && ctx.value) {
      ctx.value.putImageData(currentData, 0, 0)
    }
  })
})
</script>
