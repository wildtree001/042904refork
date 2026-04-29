<template>
  <div class="deep-explore">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <!-- 主内容 -->
    <div class="explore-content">
      <h1 class="title">功能探索</h1>

      <!-- 功能导航标签 -->
      <div class="feature-tabs">
        <div
          class="tab"
          :class="{ active: activeTab === 'radar' }"
          @click="activeTab = 'radar'"
        >
          <span class="tab-icon">📊</span>
          <span class="tab-label">技能雷达图</span>
        </div>
        <div
          class="tab"
          :class="{ active: activeTab === 'editor' }"
          @click="activeTab = 'editor'"
        >
          <span class="tab-icon">💻</span>
          <span class="tab-label">代码编辑器</span>
        </div>
        <div
          class="tab"
          :class="{ active: activeTab === 'puzzle' }"
          @click="activeTab = 'puzzle'"
        >
          <span class="tab-icon">🧩</span>
          <span class="tab-label">拼图游戏</span>
        </div>
      </div>

      <!-- 功能内容区域 -->
      <div class="feature-content">
        <transition name="fade" mode="out-in">
          <component :is="currentComponent" :key="activeTab" />
        </transition>
      </div>

      <!-- 返回按钮 -->
      <div class="back-section">
        <button class="btn back-btn" @click="goBack">
          <span class="btn-icon">←</span>
          返回
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { transitionName, canTransition, recordTransition } from '@/utils/transition'
import SkillRadar from '@/components/SkillRadar.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import PuzzleGame from '@/components/PuzzleGame.vue'
import '@/styles/DeepExplore.css'

const router = useRouter()
const navigated = ref(false)
const activeTab = ref<'radar' | 'editor' | 'puzzle'>('radar')

const currentComponent = computed(() => {
  switch (activeTab.value) {
    case 'radar':
      return SkillRadar
    case 'editor':
      return CodeEditor
    case 'puzzle':
      return PuzzleGame
    default:
      return SkillRadar
  }
})

function goBack() {
  if (navigated.value || !canTransition()) return
  navigated.value = true
  recordTransition()
  transitionName.value = 'slide-down'
  router.push({ name: 'About' })
}
</script>

<style scoped>
.deep-explore {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  filter: blur(80px);
  opacity: 0.2;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle at 30% 30%, rgba(138, 43, 226, 0.5), transparent 50%);
  top: -100px;
  right: -50px;
}

.blob-2 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle at 70% 70%, rgba(75, 0, 130, 0.4), transparent 50%);
  bottom: -80px;
  left: -80px;
}

/* 主内容 */
.explore-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44ae0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 15px;
  animation: gradientShift 6s ease infinite;
  flex-shrink: 0;
}

/* 功能导航标签 */
.feature-tabs {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.tab.active {
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.2) 0%, rgba(196, 74, 224, 0.2) 100%);
  border-color: rgba(255, 107, 157, 0.5);
  box-shadow: 0 4px 20px rgba(196, 74, 224, 0.3);
}

.tab-icon {
  font-size: 1.3rem;
}

.tab-label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 1rem;
}

.tab.active .tab-label {
  color: #ff6b9d;
}

/* 功能内容区域 */
.feature-content {
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 返回按钮 */
.back-section {
  display: flex;
  justify-content: center;
  padding: 15px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.back-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transform: scale(1.02);
}

.btn-icon {
  font-size: 1.1rem;
}

/* 动画 */
@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .explore-content {
    padding: 10px;
  }

  .title {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }

  .feature-tabs {
    gap: 8px;
    margin-bottom: 10px;
  }

  .tab {
    padding: 10px 16px;
  }

  .tab-label {
    font-size: 0.9rem;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .feature-content {
    border-radius: 12px;
  }

  .back-section {
    padding: 10px;
  }

  .back-btn {
    padding: 10px 24px;
  }
}
</style>
