<template>
  <div class="whiteboard-container">
    <div class="toolbar">
      <div class="tool-group">
        <button 
          v-for="tool in tools" 
          :key="tool.value"
          :class="['tool-btn', { active: currentTool === tool.value }]"
          :title="tool.label"
          @click="selectTool(tool.value)"
        >
          <span class="tool-icon">{{ tool.icon }}</span>
        </button>
      </div>
      
      <div class="separator"></div>
      
      <div class="tool-group">
        <div class="color-picker-wrapper">
          <label class="color-label" title="画笔颜色">
            <input 
              type="color" 
              v-model="currentColor" 
              class="color-picker"
            />
            <div class="color-preview" :style="{ background: currentColor }"></div>
          </label>
        </div>
        
        <div class="stroke-width-wrapper">
          <label class="stroke-label" title="画笔粗细">
            <span class="stroke-icon">✏️</span>
            <input 
              type="range" 
              min="1" 
              max="50" 
              v-model="strokeWidth"
              class="stroke-slider"
            />
            <span class="stroke-value">{{ strokeWidth }}</span>
          </label>
        </div>
      </div>
      
      <div class="separator"></div>
      
      <div class="tool-group">
        <button 
          class="tool-btn"
          :title="canUndo ? '撤销 (Ctrl+Z)' : '无法撤销'"
          :disabled="!canUndo"
          @click="undo"
        >
          <span class="tool-icon">↩️</span>
        </button>
        <button 
          class="tool-btn"
          :title="canRedo ? '重做 (Ctrl+Y)' : '无法重做'"
          :disabled="!canRedo"
          @click="redo"
        >
          <span class="tool-icon">↪️</span>
        </button>
      </div>
      
      <div class="separator"></div>
      
      <div class="tool-group">
        <button 
          class="tool-btn"
          title="清除画布"
          @click="clearCanvas"
        >
          <span class="tool-icon">🗑️</span>
        </button>
      </div>
      
      <div class="separator"></div>
      
      <div class="tool-group">
        <button 
          class="tool-btn"
          title="导出为图片"
          @click="exportAsImage"
        >
          <span class="tool-icon">🖼️</span>
        </button>
        <button 
          class="tool-btn"
          title="导出为PDF"
          @click="exportAsPDF"
        >
          <span class="tool-icon">📄</span>
        </button>
      </div>
      
      <div class="toolbar-right">
        <div class="collaboration-status" v-if="isCollaborating">
          <span class="status-dot online"></span>
          <span class="status-text">协作模式 ({{ collaborators.length }}人在线)</span>
        </div>
        <button 
          class="toggle-collab-btn"
          :class="{ active: isCollaborating }"
          @click="toggleCollaboration"
        >
          {{ isCollaborating ? '退出协作' : '开始协作' }}
        </button>
      </div>
    </div>

    <div class="canvas-container" ref="canvasContainer">
      <div 
        class="infinite-canvas" 
        :style="canvasStyle"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel="handleWheel"
      >
        <canvas 
          v-for="layer in layers" 
          :key="layer.id"
          :ref="el => setCanvasRef(el, layer.id)"
          :class="['layer-canvas', { active: currentLayerId === layer.id }]"
          :style="{ 
            zIndex: layer.zIndex,
            opacity: layer.opacity,
            display: layer.visible ? 'block' : 'none'
          }"
          :width="canvasSize.width"
          :height="canvasSize.height"
        ></canvas>
      </div>
    </div>

    <div class="sidebar">
      <div class="sidebar-tabs">
        <button 
          v-for="tab in sidebarTabs" 
          :key="tab.value"
          :class="['sidebar-tab', { active: currentSidebarTab === tab.value }]"
          @click="currentSidebarTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="sidebar-content">
        <div v-if="currentSidebarTab === 'layers'" class="layers-panel">
          <div class="panel-header">
            <h4>图层</h4>
            <div class="layer-actions">
              <button class="action-btn" title="添加图层" @click="addLayer">+</button>
              <button class="action-btn" title="删除当前图层" @click="deleteCurrentLayer" :disabled="layers.length <= 1">-</button>
            </div>
          </div>
          <div class="layers-list">
            <div 
              v-for="layer in [...layers].reverse()" 
              :key="layer.id"
              :class="['layer-item', { active: currentLayerId === layer.id }]"
              @click="selectLayer(layer.id)"
            >
              <div class="layer-preview">
                <canvas 
                  :ref="el => setLayerPreviewRef(el, layer.id)"
                  width="40" 
                  height="30"
                ></canvas>
              </div>
              <div class="layer-info">
                <input 
                  type="text" 
                  v-model="layer.name"
                  class="layer-name"
                  @click.stop
                />
              </div>
              <div class="layer-controls">
                <button 
                  class="control-btn"
                  :class="{ active: layer.visible }"
                  @click.stop="toggleLayerVisibility(layer.id)"
                  title="显示/隐藏"
                >
                  {{ layer.visible ? '👁️' : '👁️‍🗨️' }}
                </button>
                <button 
                  class="control-btn"
                  @click.stop="moveLayerUp(layer.id)"
                  title="上移"
                >
                  ▲
                </button>
                <button 
                  class="control-btn"
                  @click.stop="moveLayerDown(layer.id)"
                  title="下移"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'collaborators'" class="collaborators-panel">
          <div class="panel-header">
            <h4>协作者</h4>
          </div>
          <div class="collaborators-list" v-if="isCollaborating">
            <div 
              v-for="collaborator in collaborators" 
              :key="collaborator.id"
              class="collaborator-item"
            >
              <div 
                class="collaborator-avatar"
                :style="{ background: collaborator.color }"
              >
                {{ collaborator.name.charAt(0) }}
              </div>
              <div class="collaborator-info">
                <span class="collaborator-name">{{ collaborator.name }}</span>
                <span class="collaborator-status" :class="collaborator.isDrawing ? 'drawing' : 'idle'">
                  {{ collaborator.isDrawing ? '正在绘画...' : '在线' }}
                </span>
              </div>
              <div class="collaborator-cursor" v-if="collaborator.isDrawing">
                <span 
                  class="cursor-dot"
                  :style="{ background: collaborator.color }"
                ></span>
              </div>
            </div>
          </div>
          <div v-else class="no-collaboration">
            <p>点击"开始协作"按钮开始多人协作</p>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'shapes'" class="shapes-panel">
          <div class="panel-header">
            <h4>形状工具</h4>
          </div>
          <div class="shapes-grid">
            <button 
              v-for="shape in shapes" 
              :key="shape.value"
              :class="['shape-btn', { active: currentShape === shape.value }]"
              @click="selectShape(shape.value)"
            >
              <span class="shape-icon">{{ shape.icon }}</span>
              <span class="shape-name">{{ shape.name }}</span>
            </button>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'text'" class="text-panel">
          <div class="panel-header">
            <h4>文字工具</h4>
          </div>
          <div class="text-settings">
            <div class="setting-item">
              <label>字体大小</label>
              <input 
                type="number" 
                v-model="fontSize"
                min="8" 
                max="200"
                class="setting-input"
              />
            </div>
            <div class="setting-item">
              <label>字体</label>
              <select v-model="fontFamily" class="setting-select">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Microsoft YaHei">微软雅黑</option>
                <option value="SimSun">宋体</option>
              </select>
            </div>
            <div class="setting-item">
              <label>样式</label>
              <div class="style-buttons">
                <button 
                  :class="['style-btn', { active: isBold }]"
                  @click="isBold = !isBold"
                >
                  B
                </button>
                <button 
                  :class="['style-btn', { active: isItalic }]"
                  @click="isItalic = !isItalic"
                >
                  I
                </button>
              </div>
            </div>
            <div class="setting-item">
              <label>文字内容</label>
              <textarea 
                v-model="textContent"
                class="text-area"
                placeholder="输入文字..."
                rows="3"
              ></textarea>
            </div>
            <button class="add-text-btn" @click="addText">
              点击画布添加文字
            </button>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'images'" class="images-panel">
          <div class="panel-header">
            <h4>图片</h4>
          </div>
          <div class="upload-section">
            <div 
              class="upload-area"
              @click="triggerImageUpload"
              @dragover.prevent
              @drop.prevent="handleImageDrop"
            >
              <input 
                type="file" 
                ref="imageInput"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
              <span class="upload-icon">📤</span>
              <p>点击或拖拽上传图片</p>
            </div>
          </div>
          <div class="recent-images" v-if="recentImages.length > 0">
            <h5>最近使用</h5>
            <div class="images-grid">
              <div 
                v-for="(img, index) in recentImages" 
                :key="index"
                class="recent-image"
                @click="addImageToCanvas(img)"
              >
                <img :src="img" alt="Recent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-left">
        <span class="status-item">工具: {{ currentToolLabel }}</span>
        <span class="status-item">位置: ({{ mousePosition.x }}, {{ mousePosition.y }})</span>
        <span class="status-item">画布: {{ canvasSize.width }} x {{ canvasSize.height }}</span>
      </div>
      <div class="status-right">
        <span class="status-item">缩放: {{ Math.round(scale * 100) }}%</span>
        <button class="zoom-btn" @click="zoomIn">+</button>
        <button class="zoom-btn" @click="zoomOut">-</button>
        <button class="zoom-btn" @click="resetZoom">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
  zIndex: number
}

interface Collaborator {
  id: string
  name: string
  color: string
  isDrawing: boolean
  position: { x: number; y: number }
}

interface DrawPoint {
  x: number
  y: number
}

interface HistoryState {
  layerData: Map<string, ImageData>
  layers: Layer[]
  currentLayerId: string
}

const canvasContainer = ref<HTMLDivElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)

const canvasRefs = ref<Map<string, HTMLCanvasElement>>(new Map())
const layerPreviewRefs = ref<Map<string, HTMLCanvasElement>>(new Map())

const isDrawing = ref(false)
const currentTool = ref('pen')
const currentColor = ref('#000000')
const strokeWidth = ref(3)
const currentLayerId = ref('layer-1')

const offset = ref({ x: 0, y: 0 })
const scale = ref(1)
const canvasSize = ref({ width: 2000, height: 2000 })

const isCollaborating = ref(false)
const currentSidebarTab = ref('layers')
const currentShape = ref('rectangle')

const fontSize = ref(24)
const fontFamily = ref('Arial')
const isBold = ref(false)
const isItalic = ref(false)
const textContent = ref('')

const recentImages = ref<string[]>([])

const layers = ref<Layer[]>([
  { id: 'layer-1', name: '图层 1', visible: true, opacity: 1, zIndex: 1 }
])

const collaborators = ref<Collaborator[]>([
  { id: 'user-2', name: '用户A', color: '#ff6b6b', isDrawing: false, position: { x: 0, y: 0 } },
  { id: 'user-3', name: '用户B', color: '#4ecdc4', isDrawing: false, position: { x: 0, y: 0 } }
])

const historyStack = ref<HistoryState[]>([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50

let lastPoint: DrawPoint | null = null
let shapeStartPoint: DrawPoint | null = null
let mousePosition = ref({ x: 0, y: 0 })

const tools = [
  { value: 'pen', label: '画笔', icon: '✏️' },
  { value: 'eraser', label: '橡皮擦', icon: '🧽' },
  { value: 'line', label: '直线', icon: '📏' },
  { value: 'shape', label: '形状', icon: '⬜' },
  { value: 'text', label: '文字', icon: '📝' },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'pan', label: '平移', icon: '✋' }
]

const sidebarTabs = [
  { label: '图层', value: 'layers' },
  { label: '形状', value: 'shapes' },
  { label: '文字', value: 'text' },
  { label: '图片', value: 'images' },
  { label: '协作者', value: 'collaborators' }
]

const shapes = [
  { value: 'rectangle', name: '矩形', icon: '⬜' },
  { value: 'circle', name: '圆形', icon: '⭕' },
  { value: 'ellipse', name: '椭圆', icon: '🔵' },
  { value: 'triangle', name: '三角形', icon: '🔺' },
  { value: 'arrow', name: '箭头', icon: '➡️' },
  { value: 'star', name: '星形', icon: '⭐' }
]

const currentToolLabel = computed(() => {
  const tool = tools.find(t => t.value === currentTool.value)
  return tool ? tool.label : '画笔'
})

const canUndo = computed(() => historyIndex.value >= 0)
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

const canvasStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: canvasSize.value.width + 'px',
  height: canvasSize.value.height + 'px'
}))

function setCanvasRef(el: unknown, layerId: string) {
  if (el instanceof HTMLCanvasElement) {
    canvasRefs.value.set(layerId, el)
  }
}

function setLayerPreviewRef(el: unknown, layerId: string) {
  if (el instanceof HTMLCanvasElement) {
    layerPreviewRefs.value.set(layerId, el)
  }
}

function getCurrentCanvas(): HTMLCanvasElement | undefined {
  return canvasRefs.value.get(currentLayerId.value)
}

function getCurrentContext(): CanvasRenderingContext2D | null {
  const canvas = getCurrentCanvas()
  if (!canvas) return null
  return canvas.getContext('2d')
}

function saveState() {
  const layerData = new Map<string, ImageData>()
  
  canvasRefs.value.forEach((canvas, layerId) => {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      layerData.set(layerId, ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
  })
  
  const state: HistoryState = {
    layerData,
    layers: JSON.parse(JSON.stringify(layers.value)),
    currentLayerId: currentLayerId.value
  }
  
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
  }
  
  historyStack.value.push(state)
  
  if (historyStack.value.length > MAX_HISTORY) {
    historyStack.value.shift()
  } else {
    historyIndex.value++
  }
}

function undo() {
  if (!canUndo.value) return
  
  const state = historyStack.value[historyIndex.value]
  if (!state) return
  
  state.layerData.forEach((imageData, layerId) => {
    const canvas = canvasRefs.value.get(layerId)
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.putImageData(imageData, 0, 0)
      }
    }
  })
  
  layers.value = JSON.parse(JSON.stringify(state.layers))
  currentLayerId.value = state.currentLayerId
  
  historyIndex.value--
  updateLayerPreviews()
}

function redo() {
  if (!canRedo.value) return
  
  historyIndex.value++
  const state = historyStack.value[historyIndex.value]
  if (!state) return
  
  state.layerData.forEach((imageData, layerId) => {
    const canvas = canvasRefs.value.get(layerId)
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.putImageData(imageData, 0, 0)
      }
    }
  })
  
  layers.value = JSON.parse(JSON.stringify(state.layers))
  currentLayerId.value = state.currentLayerId
  updateLayerPreviews()
}

function selectTool(tool: string) {
  currentTool.value = tool
}

function selectShape(shape: string) {
  currentShape.value = shape
  currentTool.value = 'shape'
}

function getCanvasCoords(event: MouseEvent): DrawPoint {
  if (!canvasContainer.value) return { x: 0, y: 0 }
  
  const rect = canvasContainer.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - offset.value.x) / scale.value
  const y = (event.clientY - rect.top - offset.value.y) / scale.value
  
  return { x, y }
}

function handleMouseDown(event: MouseEvent) {
  const coords = getCanvasCoords(event)
  
  if (currentTool.value === 'pan') {
    isDrawing.value = true
    lastPoint = { x: event.clientX, y: event.clientY }
    return
  }
  
  if (currentTool.value === 'text') {
    addTextAtPosition(coords)
    return
  }
  
  saveState()
  
  isDrawing.value = true
  lastPoint = coords
  
  if (currentTool.value === 'line' || currentTool.value === 'shape') {
    shapeStartPoint = coords
  }
  
  if (isCollaborating.value) {
    simulateCollaboratorActivity()
  }
}

function handleMouseMove(event: MouseEvent) {
  const coords = getCanvasCoords(event)
  mousePosition.value = { x: Math.round(coords.x), y: Math.round(coords.y) }
  
  if (!isDrawing.value || !lastPoint) return
  
  if (currentTool.value === 'pan') {
    const dx = event.clientX - lastPoint.x
    const dy = event.clientY - lastPoint.y
    offset.value.x += dx
    offset.value.y += dy
    lastPoint = { x: event.clientX, y: event.clientY }
    return
  }
  
  const ctx = getCurrentContext()
  if (!ctx) return
  
  if (currentTool.value === 'pen') {
    drawLine(ctx, lastPoint, coords)
  } else if (currentTool.value === 'eraser') {
    erase(ctx, coords)
  }
  
  lastPoint = coords
  updateLayerPreviews()
}

function handleMouseUp(event: MouseEvent) {
  if (!isDrawing.value) return
  
  const coords = getCanvasCoords(event)
  
  if (currentTool.value === 'line' && shapeStartPoint) {
    const ctx = getCurrentContext()
    if (ctx) {
      drawSingleLine(ctx, shapeStartPoint, coords)
    }
  } else if (currentTool.value === 'shape' && shapeStartPoint) {
    const ctx = getCurrentContext()
    if (ctx) {
      drawShape(ctx, shapeStartPoint, coords)
    }
  }
  
  isDrawing.value = false
  lastPoint = null
  shapeStartPoint = null
  
  if (isCollaborating.value) {
    simulateCollaboratorDraw()
  }
}

function drawLine(ctx: CanvasRenderingContext2D, from: DrawPoint, to: DrawPoint) {
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = strokeWidth.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function drawSingleLine(ctx: CanvasRenderingContext2D, from: DrawPoint, to: DrawPoint) {
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = strokeWidth.value
  ctx.lineCap = 'round'
  ctx.stroke()
}

function erase(ctx: CanvasRenderingContext2D, point: DrawPoint) {
  const size = strokeWidth.value * 2
  ctx.clearRect(point.x - size / 2, point.y - size / 2, size, size)
}

function drawShape(ctx: CanvasRenderingContext2D, from: DrawPoint, to: DrawPoint) {
  const width = to.x - from.x
  const height = to.y - from.y
  
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = strokeWidth.value
  ctx.fillStyle = currentColor.value + '33'
  
  ctx.beginPath()
  
  switch (currentShape.value) {
    case 'rectangle':
      ctx.rect(from.x, from.y, width, height)
      break
    case 'circle':
      const radius = Math.sqrt(width * width + height * height) / 2
      ctx.arc(from.x + width / 2, from.y + height / 2, radius, 0, Math.PI * 2)
      break
    case 'ellipse':
      ctx.ellipse(from.x + width / 2, from.y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2)
      break
    case 'triangle':
      ctx.moveTo(from.x + width / 2, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.lineTo(from.x, to.y)
      ctx.closePath()
      break
    case 'arrow':
      const angle = Math.atan2(height, width)
      const arrowLength = Math.min(20, Math.sqrt(width * width + height * height) / 3)
      
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - arrowLength * Math.cos(angle - Math.PI / 6),
        to.y - arrowLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - arrowLength * Math.cos(angle + Math.PI / 6),
        to.y - arrowLength * Math.sin(angle + Math.PI / 6)
      )
      break
    case 'star':
      const starRadius = Math.min(Math.abs(width), Math.abs(height)) / 2
      const starCenterX = from.x + width / 2
      const starCenterY = from.y + height / 2
      
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180
        const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180
        
        const outerX = starCenterX + starRadius * Math.cos(outerAngle)
        const outerY = starCenterY + starRadius * Math.sin(outerAngle)
        const innerX = starCenterX + starRadius * 0.5 * Math.cos(innerAngle)
        const innerY = starCenterY + starRadius * 0.5 * Math.sin(innerAngle)
        
        if (i === 0) {
          ctx.moveTo(outerX, outerY)
        } else {
          ctx.lineTo(outerX, outerY)
        }
        ctx.lineTo(innerX, innerY)
      }
      ctx.closePath()
      break
  }
  
  ctx.fill()
  ctx.stroke()
}

function addTextAtPosition(position: DrawPoint) {
  if (!textContent.value.trim()) {
    textContent.value = '双击编辑文字'
  }
  
  saveState()
  
  const ctx = getCurrentContext()
  if (!ctx) return
  
  let fontStyle = ''
  if (isItalic.value) fontStyle += 'italic '
  if (isBold.value) fontStyle += 'bold '
  
  ctx.font = `${fontStyle}${fontSize.value}px ${fontFamily.value}`
  ctx.fillStyle = currentColor.value
  ctx.textBaseline = 'top'
  ctx.fillText(textContent.value, position.x, position.y)
  
  updateLayerPreviews()
}

function addText() {
  currentTool.value = 'text'
}

function triggerImageUpload() {
  imageInput.value?.click()
}

function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return
  
  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      recentImages.value.unshift(result)
      if (recentImages.value.length > 10) {
        recentImages.value.pop()
      }
      addImageToCanvas(result)
    }
    reader.readAsDataURL(file)
  })
}

function handleImageDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files) return
  
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        recentImages.value.unshift(result)
        addImageToCanvas(result)
      }
      reader.readAsDataURL(file)
    }
  })
}

function addImageToCanvas(imageSrc: string) {
  saveState()
  
  const img = new Image()
  img.onload = () => {
    const ctx = getCurrentContext()
    if (!ctx) return
    
    const maxWidth = 400
    const maxHeight = 300
    let width = img.width
    let height = img.height
    
    if (width > maxWidth) {
      height = (maxWidth / width) * height
      width = maxWidth
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width
      height = maxHeight
    }
    
    const x = (canvasSize.value.width - width) / 2
    const y = (canvasSize.value.height - height) / 2
    
    ctx.drawImage(img, x, y, width, height)
    updateLayerPreviews()
  }
  img.src = imageSrc
}

function addLayer() {
  saveState()
  
  const newId = `layer-${Date.now()}`
  const newLayer: Layer = {
    id: newId,
    name: `图层 ${layers.value.length + 1}`,
    visible: true,
    opacity: 1,
    zIndex: layers.value.length + 1
  }
  
  layers.value.push(newLayer)
  currentLayerId.value = newId
  
  nextTick(() => {
    const canvas = canvasRefs.value.get(newId)
    if (canvas) {
      canvas.width = canvasSize.value.width
      canvas.height = canvasSize.value.height
    }
  })
}

function deleteCurrentLayer() {
  if (layers.value.length <= 1) return
  
  saveState()
  
  const index = layers.value.findIndex(l => l.id === currentLayerId.value)
  if (index > -1) {
    layers.value.splice(index, 1)
    const newIndex = Math.max(0, index - 1)
    const newLayer = layers.value[newIndex]
    if (newLayer) {
      currentLayerId.value = newLayer.id
    }
  }
}

function selectLayer(layerId: string) {
  currentLayerId.value = layerId
}

function toggleLayerVisibility(layerId: string) {
  const layer = layers.value.find(l => l.id === layerId)
  if (layer) {
    layer.visible = !layer.visible
  }
}

function moveLayerUp(layerId: string) {
  const index = layers.value.findIndex(l => l.id === layerId)
  if (index < layers.value.length - 1 && index >= 0) {
    const currentLayer = layers.value[index]
    const nextLayer = layers.value[index + 1]
    if (currentLayer && nextLayer) {
      ;[currentLayer.zIndex, nextLayer.zIndex] = [nextLayer.zIndex, currentLayer.zIndex]
      ;[layers.value[index], layers.value[index + 1]] = [nextLayer, currentLayer]
    }
  }
}

function moveLayerDown(layerId: string) {
  const index = layers.value.findIndex(l => l.id === layerId)
  if (index > 0) {
    const currentLayer = layers.value[index]
    const prevLayer = layers.value[index - 1]
    if (currentLayer && prevLayer) {
      ;[currentLayer.zIndex, prevLayer.zIndex] = [prevLayer.zIndex, currentLayer.zIndex]
      ;[layers.value[index], layers.value[index - 1]] = [prevLayer, currentLayer]
    }
  }
}

function updateLayerPreviews() {
  layerPreviewRefs.value.forEach((previewCanvas, layerId) => {
    const sourceCanvas = canvasRefs.value.get(layerId)
    if (!sourceCanvas) return
    
    const previewCtx = previewCanvas.getContext('2d')
    if (!previewCtx) return
    
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    
    const scale = Math.min(
      previewCanvas.width / sourceCanvas.width,
      previewCanvas.height / sourceCanvas.height
    )
    
    previewCtx.scale(scale, scale)
    previewCtx.drawImage(sourceCanvas, 0, 0)
    previewCtx.setTransform(1, 0, 0, 1, 0, 0)
  })
}

function clearCanvas() {
  if (confirm('确定要清除当前图层吗？')) {
    saveState()
    
    const ctx = getCurrentContext()
    if (ctx) {
      ctx.clearRect(0, 0, canvasSize.value.width, canvasSize.value.height)
      updateLayerPreviews()
    }
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.1)
}

function resetZoom() {
  scale.value = 1
  offset.value = { x: 0, y: 0 }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  
  if (event.ctrlKey) {
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    scale.value = Math.max(0.1, Math.min(5, scale.value * delta))
  } else {
    offset.value.x -= event.deltaX
    offset.value.y -= event.deltaY
  }
}

function toggleCollaboration() {
  isCollaborating.value = !isCollaborating.value
  
  if (isCollaborating.value) {
    simulateCollaboratorJoin()
  }
}

function simulateCollaboratorJoin() {
  setTimeout(() => {
    const collaborator = collaborators.value[0]
    if (collaborator) {
      collaborator.isDrawing = false
    }
  }, 500)
}

function simulateCollaboratorActivity() {
  collaborators.value.forEach(c => {
    if (Math.random() > 0.5) {
      c.isDrawing = true
      c.position = {
        x: Math.random() * canvasSize.value.width,
        y: Math.random() * canvasSize.value.height
      }
    }
  })
}

function simulateCollaboratorDraw() {
  setTimeout(() => {
    collaborators.value.forEach(c => {
      c.isDrawing = false
    })
  }, 1000)
}

function exportAsImage() {
  const mergedCanvas = document.createElement('canvas')
  mergedCanvas.width = canvasSize.value.width
  mergedCanvas.height = canvasSize.value.height
  const mergedCtx = mergedCanvas.getContext('2d')
  
  if (!mergedCtx) return
  
  mergedCtx.fillStyle = '#ffffff'
  mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height)
  
  const sortedLayers = [...layers.value].sort((a, b) => a.zIndex - b.zIndex)
  
  sortedLayers.forEach(layer => {
    if (!layer.visible) return
    
    const canvas = canvasRefs.value.get(layer.id)
    if (canvas) {
      mergedCtx.globalAlpha = layer.opacity
      mergedCtx.drawImage(canvas, 0, 0)
    }
  })
  
  mergedCtx.globalAlpha = 1
  
  const link = document.createElement('a')
  link.download = `whiteboard-${Date.now()}.png`
  link.href = mergedCanvas.toDataURL('image/png')
  link.click()
}

function exportAsPDF() {
  const mergedCanvas = document.createElement('canvas')
  mergedCanvas.width = canvasSize.value.width
  mergedCanvas.height = canvasSize.value.height
  const mergedCtx = mergedCanvas.getContext('2d')
  
  if (!mergedCtx) return
  
  mergedCtx.fillStyle = '#ffffff'
  mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height)
  
  const sortedLayers = [...layers.value].sort((a, b) => a.zIndex - b.zIndex)
  
  sortedLayers.forEach(layer => {
    if (!layer.visible) return
    
    const canvas = canvasRefs.value.get(layer.id)
    if (canvas) {
      mergedCtx.globalAlpha = layer.opacity
      mergedCtx.drawImage(canvas, 0, 0)
    }
  })
  
  mergedCtx.globalAlpha = 1
  
  const imgData = mergedCanvas.toDataURL('image/png')
  
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Whiteboard PDF</title>
        <style>
          body { margin: 0; padding: 0; }
          img { max-width: 100%; height: auto; }
          @media print {
            body { margin: 0; }
            img { width: 100%; }
          }
        </style>
      </head>
      <body>
        <img src="${imgData}" alt="Whiteboard" />
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }
}

function resetView() {
  offset.value = { x: 0, y: 0 }
  scale.value = 1
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        redo()
      } else {
        undo()
      }
    } else if (event.key === 'y') {
      event.preventDefault()
      redo()
    }
  }
  
  if (event.key === 'Escape') {
    currentTool.value = 'pen'
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  
  nextTick(() => {
    canvasRefs.value.forEach(canvas => {
      canvas.width = canvasSize.value.width
      canvas.height = canvasSize.value.height
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.whiteboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 15px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.tool-btn.active {
  background: #667eea;
  border-color: #667eea;
}

.tool-btn.active .tool-icon {
  filter: brightness(0) invert(1);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 18px;
}

.separator {
  width: 1px;
  height: 30px;
  background: #e0e0e0;
  margin: 0 5px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
}

.color-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.color-picker {
  width: 0;
  height: 0;
  opacity: 0;
  padding: 0;
  border: none;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.color-preview:hover {
  transform: scale(1.1);
}

.stroke-width-wrapper {
  display: flex;
  align-items: center;
}

.stroke-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stroke-icon {
  font-size: 16px;
}

.stroke-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
}

.stroke-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #667eea;
  border-radius: 50%;
  cursor: pointer;
}

.stroke-value {
  font-size: 12px;
  color: #666;
  min-width: 20px;
  text-align: center;
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 15px;
}

.collaboration-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #4caf50;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.toggle-collab-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
}

.toggle-collab-btn:hover {
  background: #e0e0e0;
}

.toggle-collab-btn.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 50% / 20px 20px;
}

.infinite-canvas {
  position: absolute;
  background: white;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.layer-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
}

.layer-canvas.active {
  z-index: 100;
}

.sidebar {
  position: absolute;
  right: 0;
  top: 61px;
  bottom: 40px;
  width: 280px;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-tab {
  flex: 1;
  padding: 12px 8px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.sidebar-tab:hover {
  color: #333;
  background: #f9f9f9;
}

.sidebar-tab.active {
  color: #667eea;
  font-weight: 600;
}

.sidebar-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #667eea;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h4,
.panel-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.layer-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f9f9f9;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-item:hover {
  background: #f0f0f0;
}

.layer-item.active {
  background: #f0f4ff;
  border-color: #667eea;
}

.layer-preview {
  width: 50px;
  height: 38px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.layer-preview canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13px;
  color: #333;
  border-radius: 4px;
  outline: none;
}

.layer-name:focus {
  border-color: #667eea;
  background: white;
}

.layer-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  color: #999;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.control-btn.active {
  color: #667eea;
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.collaborator-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
}

.collaborator-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.collaborator-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.collaborator-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.collaborator-status {
  font-size: 11px;
  color: #999;
}

.collaborator-status.drawing {
  color: #4caf50;
}

.collaborator-cursor {
  display: flex;
  align-items: center;
}

.cursor-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: blink 0.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.no-collaboration {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 13px;
}

.shapes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.shape-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 15px 10px;
  background: #f9f9f9;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shape-btn:hover {
  background: #f0f0f0;
}

.shape-btn.active {
  background: #f0f4ff;
  border-color: #667eea;
}

.shape-icon {
  font-size: 24px;
}

.shape-name {
  font-size: 12px;
  color: #666;
}

.text-settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
}

.setting-input:focus {
  border-color: #667eea;
}

.setting-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: white;
  cursor: pointer;
}

.style-buttons {
  display: flex;
  gap: 5px;
}

.style-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.style-btn:hover {
  background: #f0f0f0;
}

.style-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.text-area {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.text-area:focus {
  border-color: #667eea;
}

.add-text-btn {
  padding: 12px;
  background: #667eea;
  border: none;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-text-btn:hover {
  background: #5a6fd6;
}

.upload-section {
  margin-bottom: 20px;
}

.upload-area {
  padding: 30px 20px;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 10px;
}

.upload-area p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.recent-images h5 {
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.recent-image {
  aspect-ratio: 1;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-image:hover {
  border-color: #667eea;
  transform: scale(1.05);
}

.recent-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  background: white;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.zoom-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }
  
  .toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .toolbar-right {
    display: none;
  }
}
</style>
