<template>
  <div class="features-hub">
    <div class="parallax-bg" :style="parallaxStyle"></div>
    
    <div class="floating-particles">
      <div 
        class="particle" 
        v-for="i in 30" 
        :key="i"
        :style="{
          '--delay': i * 0.2 + 's',
          '--size': (Math.random() * 6 + 2) + 'px',
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%'
        }"
      ></div>
    </div>

    <div class="hub-header">
      <h1 class="hub-title">
        <span class="title-part" v-for="(part, index) in titleParts" :key="index" :style="{ '--delay': index * 0.15 + 's' }">
          {{ part }}
        </span>
      </h1>
      <p class="hub-subtitle">
        <span class="subtitle-text">探索三个精心打造的交互组件</span>
      </p>
      <div class="header-divider">
        <div class="divider-line"></div>
        <div class="divider-dot"></div>
        <div class="divider-line"></div>
      </div>
    </div>

    <div class="features-grid">
      <div 
        class="feature-card" 
        v-for="(feature, index) in features" 
        :key="feature.id"
        :style="{ '--index': index }"
        @click="navigateTo(feature.route)"
        @mouseenter="onCardHover(index)"
        @mouseleave="onCardLeave(index)"
        :class="{ 'hovered': hoveredCards.includes(index) }"
      >
        <div class="card-bg" :style="{ background: feature.gradient }"></div>
        
        <div class="card-content">
          <div class="card-icon-wrapper">
            <span class="card-icon">{{ feature.icon }}</span>
            <div class="icon-glow" :style="{ background: feature.glowColor }"></div>
          </div>
          
          <h3 class="card-title">{{ feature.title }}</h3>
          <p class="card-description">{{ feature.description }}</p>
          
          <div class="card-features">
            <div class="feature-tag" v-for="tag in feature.features" :key="tag">
              <span class="tag-check">✓</span>
              <span class="tag-text">{{ tag }}</span>
            </div>
          </div>
          
          <div class="card-cta">
            <span class="cta-text">开始体验</span>
            <span class="cta-arrow">→</span>
          </div>
        </div>
        
        <div class="card-corner top-left"></div>
        <div class="card-corner top-right"></div>
        <div class="card-corner bottom-left"></div>
        <div class="card-corner bottom-right"></div>
      </div>
    </div>

    <div class="hub-footer">
      <p class="footer-text">💡 提示: 点击任意卡片进入对应的功能页面</p>
      <button class="back-home-btn" @click="goToHome">
        <span class="back-icon">🏠</span>
        <span>返回主页</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { transitionName, recordTransition } from '@/utils/transition'
import '@/styles/FeaturesHub.css'

const router = useRouter()
const mouseX = ref(0)
const mouseY = ref(0)
const hoveredCards = ref<number[]>([])

const titleParts = ['交互', '组件', '展示']

const parallaxStyle = computed(() => ({
  transform: `translate(${mouseX.value * 0.03}px, ${mouseY.value * 0.03}px)`
}))

interface Feature {
  id: number
  title: string
  description: string
  icon: string
  route: string
  gradient: string
  glowColor: string
  features: string[]
}

const features = reactive<Feature[]>([
  {
    id: 1,
    title: '3D旋转卡片画廊',
    description: '沉浸式3D项目展示，支持拖拽旋转、滚轮缩放、点击翻转查看详情',
    icon: '🎴',
    route: 'Gallery',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glowColor: 'rgba(102, 126, 234, 0.6)',
    features: ['CSS 3D变换', '鼠标拖拽旋转', '滚轮缩放', '卡片翻转效果', '视差滚动背景', '分层悬停动画']
  },
  {
    id: 2,
    title: '手写签名板',
    description: 'Canvas实现的专业签名工具，支持多种画笔效果和导出格式',
    icon: '✍️',
    route: 'Signature',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    glowColor: 'rgba(17, 153, 142, 0.6)',
    features: ['钢笔/毛笔/马克笔', '自定义颜色粗细', '橡皮擦功能', '撤销/重做', 'PNG/SVG导出', '手写识别提示']
  },
  {
    id: 3,
    title: '动态时间轴',
    description: '记录成长历程的垂直时间轴，支持拖拽浏览和年份筛选',
    icon: '📅',
    route: 'Timeline',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glowColor: 'rgba(240, 147, 251, 0.6)',
    features: ['拖拽滑动浏览', '年份筛选', '节点展开详情', '进入动画效果', '进度条指示', '交替布局设计']
  }
])

function onMouseMove(e: MouseEvent) {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  mouseX.value = e.clientX - centerX
  mouseY.value = e.clientY - centerY
}

function onCardHover(index: number) {
  if (!hoveredCards.value.includes(index)) {
    hoveredCards.value.push(index)
  }
}

function onCardLeave(index: number) {
  hoveredCards.value = hoveredCards.value.filter(i => i !== index)
}

function navigateTo(routeName: string) {
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: routeName })
}

function goToHome() {
  recordTransition()
  transitionName.value = 'slide-down'
  router.push({ name: 'Home' })
}
</script>
