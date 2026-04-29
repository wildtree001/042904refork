<template>
  <div class="card-gallery" ref="galleryRef">
    <div class="parallax-background" :style="parallaxStyle"></div>
    
    <div class="gallery-header">
      <h1 class="gallery-title">项目画廊</h1>
      <p class="gallery-subtitle">探索我的精选项目</p>
      <div class="controls">
        <button class="control-btn" @click="resetView">重置视图</button>
        <span class="zoom-indicator">缩放: {{ Math.round(scale * 100) }}%</span>
      </div>
    </div>

    <div class="gallery-container" ref="containerRef">
      <div 
        class="card-wrapper"
        v-for="(card, index) in cards" 
        :key="card.id"
        :style="getCardStyle(index)"
        @mouseenter="onCardHover(index)"
        @mouseleave="onCardLeave(index)"
        @click="flipCard(index)"
      >
        <div 
          class="card" 
          :class="{ 'flipped': flippedCards.includes(index), 'hovered': hoveredCards.includes(index) }"
          :style="{ '--index': index }"
        >
          <div class="card-face card-front">
            <div class="card-image" :style="{ background: card.gradient }"></div>
            <div class="card-content">
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-description">{{ card.description }}</p>
              <div class="card-tags">
                <span class="tag" v-for="tag in card.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="card-layer layer-1"></div>
            <div class="card-layer layer-2"></div>
            <div class="card-layer layer-3"></div>
          </div>
          
          <div class="card-face card-back">
            <div class="back-content">
              <h3 class="back-title">{{ card.title }}</h3>
              <div class="back-details">
                <div class="detail-item">
                  <span class="detail-label">技术栈</span>
                  <div class="detail-value">{{ card.techStack }}</div>
                </div>
                <div class="detail-item">
                  <span class="detail-label">完成时间</span>
                  <div class="detail-value">{{ card.date }}</div>
                </div>
                <div class="detail-item">
                  <span class="detail-label">项目描述</span>
                  <div class="detail-value full-description">{{ card.fullDescription }}</div>
                </div>
              </div>
              <button class="back-button" @click.stop="flipCard(index)">返回</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="interaction-hint">
      <span class="hint-text">🖱️ 拖拽旋转 | 🔍 滚轮缩放 | 👆 点击卡片翻转</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import '@/styles/CardGallery.css'

interface Card {
  id: number
  title: string
  description: string
  fullDescription: string
  tags: string[]
  techStack: string
  date: string
  gradient: string
}

const galleryRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const rotationX = ref(0)
const rotationY = ref(0)
const scale = ref(1)
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const flippedCards = ref<number[]>([])
const hoveredCards = ref<number[]>([])
const mouseX = ref(0)
const mouseY = ref(0)

const cards = reactive<Card[]>([
  {
    id: 1,
    title: '智能数据分析平台',
    description: '基于AI的企业级数据分析解决方案',
    fullDescription: '这是一个功能强大的数据分析平台，集成了机器学习算法，能够自动识别数据模式并生成可视化报告。支持实时数据流处理，可处理PB级别的数据量。',
    tags: ['Vue', 'AI', 'Chart'],
    techStack: 'Vue 3 + TypeScript + ECharts + Python',
    date: '2024-01',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 2,
    title: '电商管理系统',
    description: '全栈电商解决方案，支持多端适配',
    fullDescription: '完整的电商平台管理系统，包含商品管理、订单处理、用户管理、支付集成等功能模块。采用微服务架构，支持高并发场景。',
    tags: ['Vue', 'Node', 'MongoDB'],
    techStack: 'Vue 3 + Element Plus + Node.js + MongoDB',
    date: '2023-11',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    id: 3,
    title: '实时协作白板',
    description: '多人实时协作的在线白板工具',
    fullDescription: '基于WebSocket的实时协作平台，支持多人同时编辑、画笔、形状、文字等多种工具。集成了版本历史和回滚功能。',
    tags: ['Canvas', 'WebRTC', 'Socket'],
    techStack: 'Vue 3 + Canvas API + Socket.io + WebRTC',
    date: '2023-09',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    id: 4,
    title: '健康监测App',
    description: '智能健康数据追踪与分析应用',
    fullDescription: '移动健康管理应用，集成智能穿戴设备数据，实时监测心率、血压、睡眠质量等健康指标。提供个性化健康建议和预警机制。',
    tags: ['Mobile', 'Health', 'IoT'],
    techStack: 'React Native + TypeScript + Firebase',
    date: '2023-07',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  },
  {
    id: 5,
    title: '区块链钱包',
    description: '安全的多链数字资产管理工具',
    fullDescription: '去中心化数字资产管理钱包，支持比特币、以太坊等多种主流区块链。提供助记词备份、硬件钱包支持、多重签名等安全功能。',
    tags: ['Web3', 'Security', 'Crypto'],
    techStack: 'React + ethers.js + Web3Modal + Solidity',
    date: '2023-05',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  },
  {
    id: 6,
    title: '3D游戏引擎',
    description: '轻量级WebGL游戏开发框架',
    fullDescription: '基于WebGL的3D游戏引擎，提供场景管理、材质系统、物理引擎、动画系统等核心功能。支持GLTF模型加载和粒子效果。',
    tags: ['WebGL', '3D', 'Game'],
    techStack: 'TypeScript + WebGL + glMatrix + Cannon.js',
    date: '2023-03',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
  }
])

const parallaxStyle = computed(() => ({
  transform: `translate(${mouseX.value * 0.02}px, ${mouseY.value * 0.02}px)`
}))

function getCardStyle(index: number) {
  const baseRotationY = (index - cards.length / 2) * 30
  const baseX = (index - cards.length / 2) * 250
  const baseZ = Math.abs(index - cards.length / 2) * -50
  
  return {
    transform: `translateX(${baseX}px) translateZ(${baseZ}px) rotateY(${baseRotationY + rotationY.value}deg) rotateX(${rotationX.value}deg) scale(${scale.value})`,
    zIndex: hoveredCards.value.includes(index) ? 100 : 50 - Math.abs(index - cards.length / 2)
  }
}

function onMouseMove(e: MouseEvent) {
  const rect = galleryRef.value?.getBoundingClientRect()
  if (rect) {
    mouseX.value = e.clientX - rect.width / 2
    mouseY.value = e.clientY - rect.height / 2
  }
  
  if (isDragging.value) {
    const deltaX = e.clientX - lastMouseX.value
    const deltaY = e.clientY - lastMouseY.value
    
    rotationY.value += deltaX * 0.5
    rotationX.value -= deltaY * 0.5
    
    rotationX.value = Math.max(-45, Math.min(45, rotationX.value))
    
    lastMouseX.value = e.clientX
    lastMouseY.value = e.clientY
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
  if (galleryRef.value) {
    galleryRef.value.style.cursor = 'grabbing'
  }
}

function onMouseUp() {
  isDragging.value = false
  if (galleryRef.value) {
    galleryRef.value.style.cursor = 'grab'
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  scale.value = Math.max(0.5, Math.min(2, scale.value + delta))
}

function onCardHover(index: number) {
  if (!hoveredCards.value.includes(index)) {
    hoveredCards.value.push(index)
  }
}

function onCardLeave(index: number) {
  hoveredCards.value = hoveredCards.value.filter(i => i !== index)
}

function flipCard(index: number) {
  if (flippedCards.value.includes(index)) {
    flippedCards.value = flippedCards.value.filter(i => i !== index)
  } else {
    flippedCards.value = [index]
  }
}

function resetView() {
  rotationX.value = 0
  rotationY.value = 0
  scale.value = 1
  flippedCards.value = []
  hoveredCards.value = []
}

onMounted(() => {
  const gallery = galleryRef.value
  if (gallery) {
    gallery.addEventListener('mousemove', onMouseMove)
    gallery.addEventListener('mousedown', onMouseDown)
    gallery.addEventListener('mouseup', onMouseUp)
    gallery.addEventListener('mouseleave', onMouseUp)
    gallery.addEventListener('wheel', onWheel, { passive: false })
  }
})

onBeforeUnmount(() => {
  const gallery = galleryRef.value
  if (gallery) {
    gallery.removeEventListener('mousemove', onMouseMove)
    gallery.removeEventListener('mousedown', onMouseDown)
    gallery.removeEventListener('mouseup', onMouseUp)
    gallery.removeEventListener('mouseleave', onMouseUp)
    gallery.removeEventListener('wheel', onWheel)
  }
})
</script>
