<template>
  <div class="blog-home">
    <!-- 背景粒子效果 -->
    <div class="background-particles">
      <div class="particle" v-for="i in 50" :key="i" :style="{ '--delay': i * 0.05 + 's' }"></div>
    </div>

    <!-- 欢迎内容 -->
    <div class="content-wrapper">
      <div class="content">
        <!-- 标题动画 -->
        <h1 class="title">
          <span
            class="title-char"
            v-for="(char, index) in titleChars"
            :key="`title-${index}`"
            :style="{ '--char-delay': index * 0.1 + 's' }"
          >
            {{ char }}
          </span>
        </h1>

        <!-- 副标题 -->
        <p class="subtitle">
          <span
            v-for="(char, index) in subtitleChars"
            :key="`sub-${index}`"
            :style="{ '--char-delay': titleChars.length * 0.1 + index * 0.05 + 's' }"
          >
            {{ char }}
          </span>
        </p>

        <!-- 装饰线 -->
        <div class="divider"></div>

        <!-- 描述文本 -->
        <p class="description">在这里，我分享关于前端开发、技术探索与生活思考的文章</p>

        <!-- 交互按钮 -->
        <div class="action-buttons">
          <button class="btn btn-primary" @click="goToExplore">深入探索</button>
          <button class="btn btn-secondary" @click="goToAbout">关于我</button>
        </div>
      </div>

      <!-- 右侧装饰元素 -->
      <div class="decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>

    <!-- 向下滚动提示 -->
    <div class="scroll-hint" @click="goToAbout">
      <div class="scroll-indicator">
        <div class="wheel"></div>
      </div>
      <p>向下滚动</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import '@/styles/BlogHome.css'
import { transitionName, canTransition, recordTransition } from '@/utils/transition'

const router = useRouter()
const title = '欢迎来到我的博客'
const subtitle = '探索技术的无限可能'

const titleChars = computed(() => title.split(''))
const subtitleChars = computed(() => subtitle.split(''))

const navigated = ref(false)
let touchStartY = 0

function goToExplore() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: 'Explore' })
}

function goToAbout() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-up'
  router.push({ name: 'About' })
}

function onWheel(e: WheelEvent) {
  if (navigated.value || !canTransition()) return
  if (e.deltaY > 60) {
    goToAbout()
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY || 0
}

function onTouchEnd(e: TouchEvent) {
  if (navigated.value || !canTransition()) return
  const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || 0
  if (touchStartY - endY > 80) {
    goToAbout()
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
