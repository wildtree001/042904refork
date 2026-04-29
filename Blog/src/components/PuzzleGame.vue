<template>
  <div class="puzzle-game-container">
    <div class="header">
      <h2 class="title">图片拼图游戏</h2>
      <div class="controls">
        <div class="control-group">
          <label>难度：</label>
          <el-select v-model="difficulty" placeholder="选择难度" size="small" @change="changeDifficulty">
            <el-option label="简单 (3×3)" :value="3" />
            <el-option label="中等 (4×4)" :value="4" />
            <el-option label="困难 (5×5)" :value="5" />
          </el-select>
        </div>
        <div class="control-group">
          <label>图片：</label>
          <el-select v-model="selectedImageIndex" placeholder="选择图片" size="small" @change="changeImage">
            <el-option
              v-for="(img, index) in availableImages"
              :key="index"
              :label="img.name"
              :value="index"
            />
          </el-select>
        </div>
        <div class="control-group">
          <el-upload
            class="upload-btn"
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleImageUpload"
          >
            <el-button size="small">
              <el-icon><Upload /></el-icon>
              上传图片
            </el-button>
          </el-upload>
        </div>
      </div>
    </div>

    <div class="game-info">
      <div class="info-item">
        <span class="info-label">用时</span>
        <span class="info-value">{{ formatTime(elapsedTime) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">步数</span>
        <span class="info-value">{{ moves }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">状态</span>
        <span class="info-value" :class="gameStatus">{{ statusText }}</span>
      </div>
    </div>

    <div class="game-main">
      <div class="puzzle-area">
        <div
          class="puzzle-grid"
          :style="gridStyle"
        >
          <div
            v-for="(tile, index) in tiles"
            :key="tile.originalIndex"
            class="puzzle-tile"
            :class="{
              'is-empty': tile.isEmpty,
              'is-correct': isTileCorrect(tile, index),
              'is-animating': tile.isAnimating,
            }"
            :style="getTileStyle(tile, index)"
            @click="moveTile(tile, index)"
          >
            <template v-if="!tile.isEmpty">
              <div
                class="tile-image"
                :style="getTileImageStyle(tile.originalIndex)"
              ></div>
              <div class="tile-number">{{ tile.originalIndex + 1 }}</div>
            </template>
          </div>
        </div>
      </div>

      <div class="preview-area">
        <h3 class="preview-title">原图预览</h3>
        <div class="preview-image" :style="previewImageStyle"></div>
        <div class="preview-info">
          <span>{{ currentImageName }}</span>
          <span>{{ difficulty }}×{{ difficulty }}</span>
        </div>
      </div>
    </div>

    <div class="game-controls">
      <el-button type="primary" size="large" @click="startGame" :disabled="isPlaying && !isCompleted">
        <el-icon><VideoPlay /></el-icon>
        {{ isCompleted ? '重新开始' : '开始游戏' }}
      </el-button>
      <el-button size="large" @click="shuffleTiles" :disabled="!isPlaying || isCompleted">
        <el-icon><Refresh /></el-icon>
        重新打乱
      </el-button>
      <el-button size="large" @click="resetGame" :disabled="!isPlaying">
        <el-icon><Warning /></el-icon>
        重置
      </el-button>
      <el-button size="large" @click="showLeaderboard = true">
        <el-icon><Trophy /></el-icon>
        排行榜
      </el-button>
    </div>

    <el-dialog
      v-model="showVictoryDialog"
      title="🎉 恭喜完成！"
      width="450px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <div class="victory-content">
        <div class="victory-icon">🏆</div>
        <p class="victory-text">太棒了！你完成了拼图！</p>
        <div class="victory-stats">
          <div class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ formatTime(elapsedTime) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">步数</span>
            <span class="stat-value">{{ moves }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">难度</span>
            <span class="stat-value">{{ difficulty }}×{{ difficulty }}</span>
          </div>
        </div>
        <el-form :model="playerForm" label-width="80px" class="player-form">
          <el-form-item label="玩家姓名">
            <el-input v-model="playerForm.name" placeholder="请输入你的姓名" maxlength="10" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="saveScoreAndContinue">保存成绩</el-button>
        <el-button type="primary" @click="playAgain">再玩一次</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showLeaderboard"
      title="🏆 排行榜"
      width="600px"
    >
      <div class="leaderboard-tabs">
        <div
          v-for="d in [3, 4, 5]"
          :key="d"
          class="tab"
          :class="{ active: leaderboardDifficulty === d }"
          @click="leaderboardDifficulty = d"
        >
          {{ d }}×{{ d }}
        </div>
      </div>
      <div class="leaderboard-list">
        <div
          v-for="(entry, index) in currentLeaderboard"
          :key="index"
          class="leaderboard-item"
          :class="{ 'top-three': index < 3 }"
        >
          <div class="rank">
            <span v-if="index === 0" class="medal gold">🥇</span>
            <span v-else-if="index === 1" class="medal silver">🥈</span>
            <span v-else-if="index === 2" class="medal bronze">🥉</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="player-info">
            <div class="player-name">{{ entry.name }}</div>
            <div class="player-date">{{ formatDate(entry.date) }}</div>
          </div>
          <div class="player-stats">
            <span class="stat-time">{{ formatTime(entry.time) }}</span>
            <span class="stat-moves">{{ entry.moves }} 步</span>
          </div>
        </div>
        <div v-if="currentLeaderboard.length === 0" class="leaderboard-empty">
          暂无记录，快来挑战吧！
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, VideoPlay, Refresh, Warning, Trophy } from '@element-plus/icons-vue'

interface Tile {
  originalIndex: number
  currentPosition: number
  isEmpty: boolean
  isAnimating: boolean
}

interface LeaderboardEntry {
  name: string
  time: number
  moves: number
  difficulty: number
  date: string
}

interface AvailableImage {
  name: string
  url: string
}

const difficulty = ref(3)
const selectedImageIndex = ref(0)
const isPlaying = ref(false)
const isCompleted = ref(false)
const moves = ref(0)
const elapsedTime = ref(0)
const showVictoryDialog = ref(false)
const showLeaderboard = ref(false)
const leaderboardDifficulty = ref(3)
const uploadedImageUrl = ref<string | null>(null)

const tiles = ref<Tile[]>([])
let timerInterval: number | null = null

const playerForm = ref({
  name: '匿名玩家',
})

const availableImages = ref<AvailableImage[]>([
  { name: '风景 1', url: 'https://picsum.photos/seed/landscape1/400/400' },
  { name: '风景 2', url: 'https://picsum.photos/seed/landscape2/400/400' },
  { name: '建筑 1', url: 'https://picsum.photos/seed/architecture1/400/400' },
  { name: '自然 1', url: 'https://picsum.photos/seed/nature1/400/400' },
  { name: '城市 1', url: 'https://picsum.photos/seed/city1/400/400' },
])

const leaderboard = ref<LeaderboardEntry[]>([])

const currentImageName = computed(() => {
  if (uploadedImageUrl.value) {
    return '自定义图片'
  }
  return availableImages.value[selectedImageIndex.value]?.name || '未知'
})

const currentImageUrl = computed(() => {
  if (uploadedImageUrl.value) {
    return uploadedImageUrl.value
  }
  return availableImages.value[selectedImageIndex.value]?.url || ''
})

const previewImageStyle = computed(() => ({
  backgroundImage: `url(${currentImageUrl.value})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}))

const gridStyle = computed(() => {
  const size = difficulty.value
  return {
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gridTemplateRows: `repeat(${size}, 1fr)`,
  }
})

const gameStatus = computed(() => {
  if (isCompleted.value) return 'completed'
  if (isPlaying.value) return 'playing'
  return 'idle'
})

const statusText = computed(() => {
  if (isCompleted.value) return '已完成'
  if (isPlaying.value) return '游戏中'
  return '未开始'
})

const currentLeaderboard = computed(() => {
  return leaderboard.value
    .filter((entry) => entry.difficulty === leaderboardDifficulty.value)
    .sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time
      return a.moves - b.moves
    })
    .slice(0, 10)
})

function initTiles() {
  const size = difficulty.value
  const total = size * size
  tiles.value = []

  for (let i = 0; i < total; i++) {
    tiles.value.push({
      originalIndex: i,
      currentPosition: i,
      isEmpty: i === total - 1,
      isAnimating: false,
    })
  }
}

function isTileCorrect(tile: Tile, currentIndex: number): boolean {
  return tile.originalIndex === currentIndex && !tile.isEmpty
}

function getTileStyle(tile: Tile, index: number) {
  return {}
}

function getTileImageStyle(originalIndex: number) {
  const size = difficulty.value
  const row = Math.floor(originalIndex / size)
  const col = originalIndex % size
  const percent = 100 * (size - 1)

  return {
    backgroundImage: `url(${currentImageUrl.value})`,
    backgroundSize: `${percent}% ${percent}%`,
    backgroundPosition: `${(col / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`,
  }
}

function getEmptyTileIndex(): number {
  return tiles.value.findIndex((t) => t.isEmpty)
}

function getAdjacentIndices(index: number): number[] {
  const size = difficulty.value
  const row = Math.floor(index / size)
  const col = index % size
  const adjacent: number[] = []

  if (row > 0) adjacent.push(index - size)
  if (row < size - 1) adjacent.push(index + size)
  if (col > 0) adjacent.push(index - 1)
  if (col < size - 1) adjacent.push(index + 1)

  return adjacent
}

function isAdjacent(index1: number, index2: number): boolean {
  return getAdjacentIndices(index1).includes(index2)
}

function swapTiles(index1: number, index2: number) {
  const temp = tiles.value[index1]
  const tile1 = tiles.value[index1]
  const tile2 = tiles.value[index2]

  if (temp && tile1 && tile2) {
    tiles.value[index1] = tile2
    tiles.value[index2] = temp
    tiles.value[index1].currentPosition = index1
    tiles.value[index2].currentPosition = index2
  }
}

function moveTile(tile: Tile, index: number) {
  if (!isPlaying.value || isCompleted.value || tile.isEmpty) return

  const emptyIndex = getEmptyTileIndex()

  if (!isAdjacent(index, emptyIndex)) return

  const currentTile = tiles.value[index]
  if (currentTile) {
    currentTile.isAnimating = true

    setTimeout(() => {
      const t = tiles.value[index]
      if (t) {
        t.isAnimating = false
      }
    }, 300)
  }

  swapTiles(index, emptyIndex)
  moves.value++

  checkWin()
}

function checkWin() {
  const isWin = tiles.value.every((tile, index) => {
    if (tile.isEmpty) return index === tiles.value.length - 1
    return tile.originalIndex === index
  })

  if (isWin && isPlaying.value) {
    isCompleted.value = true
    stopTimer()
    showVictoryDialog.value = true
    ElMessage.success('🎉 恭喜完成！')
  }
}

function shuffleTiles() {
  if (!isPlaying.value) return

  const size = difficulty.value
  const total = size * size
  let shuffleCount = total * 100
  let lastEmptyIndex = getEmptyTileIndex()

  while (shuffleCount > 0) {
    const emptyIndex = getEmptyTileIndex()
    const adjacent = getAdjacentIndices(emptyIndex).filter((i) => i !== lastEmptyIndex)

    if (adjacent.length > 0) {
      const randomIndex = adjacent[Math.floor(Math.random() * adjacent.length)]
      if (randomIndex !== undefined) {
        swapTiles(emptyIndex, randomIndex)
        lastEmptyIndex = emptyIndex
        shuffleCount--
      }
    }
  }

  moves.value = 0
  isCompleted.value = false
  elapsedTime.value = 0
  startTimer()

  ElMessage.info('拼图已打乱，开始游戏吧！')
}

function startGame() {
  if (isCompleted.value) {
    resetGame()
  }

  isPlaying.value = true
  isCompleted.value = false
  initTiles()
  shuffleTiles()
}

function resetGame() {
  isPlaying.value = false
  isCompleted.value = false
  moves.value = 0
  elapsedTime.value = 0
  stopTimer()
  initTiles()
  ElMessage.info('游戏已重置')
}

function startTimer() {
  stopTimer()
  timerInterval = window.setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function changeDifficulty() {
  resetGame()
  ElMessage.info(`难度已切换为 ${difficulty.value}×${difficulty.value}`)
}

function changeImage() {
  uploadedImageUrl.value = null
  resetGame()
}

function handleImageUpload(file: any) {
  if (!file.raw) return

  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedImageUrl.value = e.target?.result as string
    resetGame()
    ElMessage.success('图片上传成功！')
  }
  reader.readAsDataURL(file.raw)
}

function saveScoreAndContinue() {
  const entry: LeaderboardEntry = {
    name: playerForm.value.name || '匿名玩家',
    time: elapsedTime.value,
    moves: moves.value,
    difficulty: difficulty.value,
    date: new Date().toISOString(),
  }

  leaderboard.value.push(entry)
  localStorage.setItem('puzzleLeaderboard', JSON.stringify(leaderboard.value))

  showVictoryDialog.value = false
  showLeaderboard.value = true
  leaderboardDifficulty.value = difficulty.value

  ElMessage.success('成绩已保存到排行榜！')
}

function playAgain() {
  showVictoryDialog.value = false
  startGame()
}

function loadLeaderboard() {
  try {
    const saved = localStorage.getItem('puzzleLeaderboard')
    if (saved) {
      leaderboard.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load leaderboard:', e)
  }
}

watch(difficulty, () => {
  resetGame()
})

onMounted(() => {
  initTiles()
  loadLeaderboard()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped>
.puzzle-game-container {
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.title {
  font-size: 1.8rem;
  font-weight: bold;
  color: #ffffff;
  background: linear-gradient(135deg, #f59e0b 0%, #d946ef 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.upload-btn {
  display: inline-block;
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffffff;
}

.info-value.completed {
  color: #10b981;
}

.info-value.playing {
  color: #f59e0b;
}

.info-value.idle {
  color: #6b7280;
}

.game-main {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.puzzle-area {
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.puzzle-grid {
  display: grid;
  gap: 4px;
  width: 350px;
  height: 350px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 8px;
}

.puzzle-tile {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
}

.puzzle-tile:not(.is-empty):hover {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.puzzle-tile.is-empty {
  background: transparent;
  cursor: default;
}

.puzzle-tile.is-correct {
  box-shadow: inset 0 0 0 2px #10b981;
}

.puzzle-tile.is-animating {
  transform: scale(0.95);
  opacity: 0.8;
}

.tile-image {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.tile-number {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-title {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1rem;
}

.preview-image {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-info {
  display: flex;
  gap: 15px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.victory-content {
  text-align: center;
  padding: 20px 0;
}

.victory-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.victory-text {
  font-size: 1.3rem;
  color: #374151;
  margin-bottom: 24px;
}

.victory-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #374151;
}

.player-form {
  margin-top: 20px;
}

.leaderboard-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 24px;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #6b7280;
}

.tab:hover {
  background: #e5e7eb;
}

.tab.active {
  background: linear-gradient(135deg, #f59e0b 0%, #d946ef 100%);
  color: white;
}

.leaderboard-list {
  max-height: 400px;
  overflow-y: auto;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.leaderboard-item:hover {
  background: #f3f4f6;
}

.leaderboard-item.top-three {
  background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%);
}

.rank {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: #6b7280;
}

.medal {
  font-size: 1.5rem;
}

.player-info {
  flex: 1;
  margin-left: 12px;
}

.player-name {
  font-weight: 500;
  color: #374151;
}

.player-date {
  font-size: 12px;
  color: #9ca3af;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.stat-time {
  font-weight: bold;
  color: #374151;
}

.stat-moves {
  font-size: 12px;
  color: #6b7280;
}

.leaderboard-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .puzzle-game-container {
    padding: 15px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .title {
    font-size: 1.5rem;
  }

  .controls {
    width: 100%;
    justify-content: flex-start;
  }

  .game-info {
    gap: 20px;
  }

  .puzzle-grid {
    width: 280px;
    height: 280px;
  }

  .preview-image {
    width: 150px;
    height: 150px;
  }

  .game-controls {
    flex-direction: column;
  }

  .game-controls button {
    width: 100%;
  }
}
</style>
