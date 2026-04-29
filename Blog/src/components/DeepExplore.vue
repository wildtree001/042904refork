<template>
  <div class="deep-explore">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <!-- 主内容 -->
    <div class="explore-content">
      <h1 class="title">深入探索</h1>
      <div class="features-grid">
        <div class="feature-card music-card" @click="goToMusicPlayer">
          <div class="feature-icon">🎵</div>
          <h3 class="feature-name">音乐可视化播放器</h3>
          <p class="feature-desc">集成Web Audio API，支持频谱分析、动态可视化效果、播放列表管理、自定义主题、歌词同步显示</p>
          <div class="feature-tags">
            <span class="tag">Web Audio API</span>
            <span class="tag">频谱分析</span>
            <span class="tag">歌词同步</span>
          </div>
        </div>

        <div class="feature-card globe-card" @click="goToGlobe3D">
          <div class="feature-icon">🌍</div>
          <h3 class="feature-name">3D地球仪展示</h3>
          <p class="feature-desc">使用Three.js实现3D地球，支持旋转缩放、国家高亮显示信息、时区显示、天气信息展示</p>
          <div class="feature-tags">
            <span class="tag">Three.js</span>
            <span class="tag">3D渲染</span>
            <span class="tag">时区天气</span>
          </div>
        </div>

        <div class="feature-card whiteboard-card" @click="goToWhiteboard">
          <div class="feature-icon">🎨</div>
          <h3 class="feature-name">在线白板协作</h3>
          <p class="feature-desc">Canvas白板，支持多人实时绘画、画笔/形状/文字/图片工具、图层管理、撤销/重做、导出PDF/图片</p>
          <div class="feature-tags">
            <span class="tag">Canvas</span>
            <span class="tag">图层管理</span>
            <span class="tag">PDF导出</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { transitionName, canTransition, recordTransition } from '@/utils/transition'
import '@/styles/DeepExplore.css'

const router = useRouter()
const navigated = ref(false)
let touchStartY = 0

const featuresTitle = '功能展示'
const featuresTitleChars = computed(() => featuresTitle.split(''))

function goBack() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-down'
  router.push({ name: 'About' })
}

function goToMusicPlayer() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: 'MusicPlayer' })
}

function goToGlobe3D() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: 'Globe3D' })
}

function goToWhiteboard() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: 'Whiteboard' })
}

function onWheel(e: WheelEvent) {
  if (navigated.value || !canTransition()) return
  if (e.deltaY < -60) {
    goBack()
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY || 0
}

function onTouchEnd(e: TouchEvent) {
  if (navigated.value || !canTransition()) return
  const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || 0
  if (endY - touchStartY > 80) {
    goBack()
  }
}

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
})
</script>
