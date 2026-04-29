<template>
  <div class="music-player" :class="`theme-${currentTheme}`">
    <div class="visualizer-container">
      <canvas ref="visualizerCanvas" class="visualizer"></canvas>
      <div class="visualization-controls">
        <button 
          v-for="mode in visualizationModes" 
          :key="mode.value"
          :class="['mode-btn', { active: currentVisualization === mode.value }]"
          @click="currentVisualization = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div class="player-main">
      <div class="player-info">
        <div class="album-cover">
          <img :src="currentTrack.cover" alt="Album Cover" />
          <div class="play-overlay" v-show="!isPlaying" @click="togglePlay">
            <span class="play-icon">▶</span>
          </div>
        </div>
        <div class="track-info">
          <h2 class="track-title">{{ currentTrack.title }}</h2>
          <p class="track-artist">{{ currentTrack.artist }}</p>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress" :style="{ width: `${progress}%` }"></div>
              <div class="progress-handle" :style="{ left: `${progress}%` }"></div>
            </div>
            <div class="time-display">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="player-controls">
        <button class="control-btn" @click="toggleShuffle">
          <span :class="{ active: isShuffle }">🔀</span>
        </button>
        <button class="control-btn" @click="playPrevious">
          ⏮
        </button>
        <button class="control-btn play-btn" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="control-btn" @click="playNext">
          ⏭
        </button>
        <button class="control-btn" @click="toggleRepeat">
          <span :class="{ active: isRepeat }">🔁</span>
        </button>
      </div>

      <div class="volume-control">
        <span class="volume-icon">🔊</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          v-model="volume"
          class="volume-slider"
        />
        <span class="volume-value">{{ volume }}%</span>
      </div>
    </div>

    <div class="sidebar-container">
      <div class="sidebar-tabs">
        <button 
          v-for="tab in sidebarTabs" 
          :key="tab.value"
          :class="['tab-btn', { active: currentSidebarTab === tab.value }]"
          @click="currentSidebarTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="sidebar-content">
        <div v-if="currentSidebarTab === 'playlist'" class="playlist-panel">
          <div class="playlist-header">
            <h3>播放列表</h3>
            <button class="add-btn" @click="showAddTrackModal = true">
              + 添加音乐
            </button>
          </div>
          <div class="track-list">
            <div 
              v-for="(track, index) in playlist" 
              :key="track.id"
              :class="['track-item', { active: currentTrackIndex === index }]"
              @click="playTrack(index)"
            >
              <div class="track-number">
                {{ currentTrackIndex === index && isPlaying ? '♪' : index + 1 }}
              </div>
              <div class="track-thumb">
                <img :src="track.cover" :alt="track.title" />
              </div>
              <div class="track-details">
                <div class="track-name">{{ track.title }}</div>
                <div class="track-artist">{{ track.artist }}</div>
              </div>
              <div class="track-duration">{{ formatTime(track.duration) }}</div>
              <button class="remove-btn" @click.stop="removeTrack(index)">×</button>
            </div>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'lyrics'" class="lyrics-panel">
          <div class="lyrics-header">
            <h3>歌词</h3>
          </div>
          <div class="lyrics-content" ref="lyricsContainer">
            <div 
              v-for="(line, index) in lyricsLines" 
              :key="index"
              :class="['lyric-line', { active: isCurrentLyric(index) }]"
              @click="seekToLyric(line.time)"
            >
              {{ line.text }}
            </div>
            <div v-if="lyricsLines.length === 0" class="no-lyrics">
              暂无歌词
            </div>
          </div>
        </div>

        <div v-else-if="currentSidebarTab === 'themes'" class="themes-panel">
          <div class="themes-header">
            <h3>主题</h3>
          </div>
          <div class="themes-grid">
            <div 
              v-for="theme in themes" 
              :key="theme.value"
              :class="['theme-item', { active: currentTheme === theme.value }]"
              :style="{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }"
              @click="currentTheme = theme.value"
            >
              <span class="theme-name">{{ theme.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddTrackModal" class="modal-overlay" @click="showAddTrackModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加音乐</h3>
          <button class="close-btn" @click="showAddTrackModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="upload-area" @click="triggerFileInput">
            <input 
              type="file" 
              ref="fileInput" 
              accept="audio/*" 
              multiple
              @change="handleFileUpload"
              style="display: none"
            />
            <div class="upload-icon">🎵</div>
            <p>点击或拖拽音频文件到此处</p>
            <p class="upload-hint">支持 MP3, WAV, OGG 等格式</p>
          </div>
          <div v-if="pendingTracks.length > 0" class="pending-tracks">
            <h4>待添加的音乐</h4>
            <div v-for="(track, index) in pendingTracks" :key="index" class="pending-track">
              <span>{{ track.name }}</span>
              <button @click="pendingTracks.splice(index, 1)">×</button>
            </div>
            <button class="confirm-add-btn" @click="addPendingTracks">添加到播放列表</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Track {
  id: string
  title: string
  artist: string
  cover: string
  duration: number
  url?: string
  file?: File
}

interface LyricLine {
  time: number
  text: string
}

interface Theme {
  value: string
  name: string
  primary: string
  secondary: string
}

const visualizerCanvas = ref<HTMLCanvasElement | null>(null)
const lyricsContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const audioContext = ref<AudioContext | null>(null)
const analyser = ref<AnalyserNode | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)
const source = ref<MediaElementAudioSourceNode | null>(null)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)
const isRepeat = ref(false)
const isShuffle = ref(false)

const currentTrackIndex = ref(0)
const currentVisualization = ref('bars')
const currentSidebarTab = ref('playlist')
const currentTheme = ref('purple')

const showAddTrackModal = ref(false)
const pendingTracks = ref<File[]>([])

const visualizationModes = [
  { label: '柱状图', value: 'bars' },
  { label: '波形图', value: 'wave' },
  { label: '粒子效果', value: 'particles' },
  { label: '环形图', value: 'circle' }
]

const sidebarTabs = [
  { label: '播放列表', value: 'playlist' },
  { label: '歌词', value: 'lyrics' },
  { label: '主题', value: 'themes' }
]

const themes: Theme[] = [
  { value: 'purple', name: '紫色', primary: '#667eea', secondary: '#764ba2' },
  { value: 'blue', name: '蓝色', primary: '#2193b0', secondary: '#6dd5ed' },
  { value: 'green', name: '绿色', primary: '#11998e', secondary: '#38ef7d' },
  { value: 'orange', name: '橙色', primary: '#f093fb', secondary: '#f5576c' },
  { value: 'dark', name: '深色', primary: '#232526', secondary: '#414345' },
  { value: 'pink', name: '粉色', primary: '#ff9a9e', secondary: '#fecfef' }
]

const playlist = ref<Track[]>([
  {
    id: '1',
    title: '示例音乐 1',
    artist: '未知艺术家',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSI+8J+OrDwvdGV4dD48L3N2Zz4=',
    duration: 180
  },
  {
    id: '2',
    title: '示例音乐 2',
    artist: '未知艺术家',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNGRhMWMwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSI+8J+OrDwvdGV4dD48L3N2Zz4=',
    duration: 240
  },
  {
    id: '3',
    title: '示例音乐 3',
    artist: '未知艺术家',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2YjZiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSI+8J+OrDwvdGV4dD48L3N2Zz4=',
    duration: 210
  }
])

const lyricsLines = ref<LyricLine[]>([
  { time: 0, text: '这是第一句歌词' },
  { time: 5, text: '跟着音乐的节奏' },
  { time: 10, text: '感受旋律的跳动' },
  { time: 15, text: '让心灵自由飞翔' },
  { time: 20, text: '在音乐的海洋中' },
  { time: 25, text: '忘记所有的烦恼' },
  { time: 30, text: '只剩下纯粹的快乐' }
])

const currentTrack = computed<Track>(() => {
  if (playlist.value.length === 0) {
    return {
      id: '0',
      title: '无音乐',
      artist: '未知',
      cover: '',
      duration: 0
    }
  }
  const track = playlist.value[currentTrackIndex.value]
  if (track) return track
  const firstTrack = playlist.value[0]
  if (firstTrack) return firstTrack
  return {
    id: '0',
    title: '无音乐',
    artist: '未知',
    cover: '',
    duration: 0
  }
})

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

let animationFrameId: number
let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string; life: number }> = []

function initAudio() {
  if (!audioElement.value) {
    audioElement.value = new Audio()
  }
  
  if (!audioContext.value) {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  
  if (!analyser.value) {
    analyser.value = audioContext.value.createAnalyser()
    analyser.value.fftSize = 256
  }
  
  if (!source.value && audioElement.value) {
    source.value = audioContext.value.createMediaElementSource(audioElement.value)
    source.value.connect(analyser.value)
    analyser.value.connect(audioContext.value.destination)
  }
  
  audioElement.value.addEventListener('timeupdate', () => {
    currentTime.value = audioElement.value!.currentTime
  })
  
  audioElement.value.addEventListener('loadedmetadata', () => {
    duration.value = audioElement.value!.duration
  })
  
  audioElement.value.addEventListener('ended', () => {
    if (isRepeat.value) {
      audioElement.value!.currentTime = 0
      audioElement.value!.play()
    } else {
      playNext()
    }
  })
}

function togglePlay() {
  if (!audioElement.value) return
  
  if (audioContext.value?.state === 'suspended') {
    audioContext.value.resume()
  }
  
  if (isPlaying.value) {
    audioElement.value.pause()
    isPlaying.value = false
  } else {
    const track = currentTrack.value
    if (track.url) {
      audioElement.value.src = track.url
    }
    audioElement.value.play()
    isPlaying.value = true
    startVisualization()
  }
}

function playTrack(index: number) {
  currentTrackIndex.value = index
  currentTime.value = 0
  
  const track = currentTrack.value
  if (audioElement.value && track.url) {
    audioElement.value.src = track.url
    audioElement.value.play()
    isPlaying.value = true
    startVisualization()
  }
}

function playPrevious() {
  if (isShuffle.value) {
    currentTrackIndex.value = Math.floor(Math.random() * playlist.value.length)
  } else {
    currentTrackIndex.value = (currentTrackIndex.value - 1 + playlist.value.length) % playlist.value.length
  }
  playTrack(currentTrackIndex.value)
}

function playNext() {
  if (isShuffle.value) {
    currentTrackIndex.value = Math.floor(Math.random() * playlist.value.length)
  } else {
    currentTrackIndex.value = (currentTrackIndex.value + 1) % playlist.value.length
  }
  playTrack(currentTrackIndex.value)
}

function toggleRepeat() {
  isRepeat.value = !isRepeat.value
}

function toggleShuffle() {
  isShuffle.value = !isShuffle.value
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isCurrentLyric(index: number): boolean {
  const line = lyricsLines.value[index]
  const nextLine = lyricsLines.value[index + 1]
  if (!line) return false
  if (!nextLine) return currentTime.value >= line.time
  return currentTime.value >= line.time && currentTime.value < nextLine.time
}

function seekToLyric(time: number) {
  if (audioElement.value) {
    audioElement.value.currentTime = time
    currentTime.value = time
  }
}

function startVisualization() {
  const canvas = visualizerCanvas.value
  if (!canvas || !analyser.value) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  
  const currentAnalyser = analyser.value
  const currentCanvas = canvas
  const currentCtx = ctx
  
  function draw() {
    if (!isPlaying.value) return
    
    animationFrameId = requestAnimationFrame(draw)
    
    const bufferLength = currentAnalyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    currentAnalyser.getByteFrequencyData(dataArray)
    
    currentCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    currentCtx.fillRect(0, 0, currentCanvas.width, currentCanvas.height)
    
    switch (currentVisualization.value) {
      case 'bars':
        drawBars(currentCtx, dataArray, bufferLength, currentCanvas)
        break
      case 'wave':
        drawWave(currentCtx, dataArray, bufferLength, currentCanvas)
        break
      case 'particles':
        drawParticles(currentCtx, dataArray, bufferLength, currentCanvas)
        break
      case 'circle':
        drawCircle(currentCtx, dataArray, bufferLength, currentCanvas)
        break
    }
  }
  
  draw()
}

function drawBars(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, canvas: HTMLCanvasElement) {
  const barWidth = (canvas.width / bufferLength) * 2.5
  let x = 0
  
  for (let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] ?? 0
    const barHeight = (value / 255) * canvas.height * 0.8
    
    const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
    gradient.addColorStop(0, getThemeColor(0))
    gradient.addColorStop(1, getThemeColor(1))
    
    ctx.fillStyle = gradient
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
    
    x += barWidth + 1
  }
}

function drawWave(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, canvas: HTMLCanvasElement) {
  const timeData = new Uint8Array(bufferLength)
  analyser.value!.getByteTimeDomainData(timeData)
  
  ctx.lineWidth = 2
  ctx.strokeStyle = getThemeColor(0)
  ctx.beginPath()
  
  const sliceWidth = canvas.width / bufferLength
  let x = 0
  
  for (let i = 0; i < bufferLength; i++) {
    const v = (timeData[i] ?? 128) / 128.0
    const y = (v * canvas.height) / 2
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
    x += sliceWidth
  }
  
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()
}

function drawParticles(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, canvas: HTMLCanvasElement) {
  const avgFrequency = dataArray.reduce((a, b) => a + b, 0) / bufferLength
  const intensity = avgFrequency / 255
  
  if (intensity > 0.3 && particles.length < 200) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 2,
        size: Math.random() * 4 + 2,
        color: getThemeColor(Math.random() > 0.5 ? 0 : 1),
        life: 100
      })
    }
  }
  
  particles = particles.filter(p => p.life > 0)
  
  particles.forEach(p => {
    p.x += p.vx + (Math.random() - 0.5) * intensity * 5
    p.y += p.vy - intensity * 3
    p.life -= 2
    p.size *= 0.98
    
    ctx.globalAlpha = p.life / 100
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  })
  
  ctx.globalAlpha = 1
}

function drawCircle(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, canvas: HTMLCanvasElement) {
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(canvas.width, canvas.height) * 0.25
  
  for (let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] ?? 0
    const barHeight = (value / 255) * 100
    const angle = (i / bufferLength) * Math.PI * 2
    
    const x1 = centerX + Math.cos(angle) * radius
    const y1 = centerY + Math.sin(angle) * radius
    const x2 = centerX + Math.cos(angle) * (radius + barHeight)
    const y2 = centerY + Math.sin(angle) * (radius + barHeight)
    
    ctx.strokeStyle = getThemeColor(i % 2)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}

function getThemeColor(index: number): string {
  const theme = themes.find(t => t.value === currentTheme.value)
  if (!theme) return '#667eea'
  return index === 0 ? theme.primary : theme.secondary
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    pendingTracks.value = Array.from(target.files)
  }
}

function addPendingTracks() {
  pendingTracks.value.forEach((file, index) => {
    const url = URL.createObjectURL(file)
    const newTrack: Track = {
      id: Date.now().toString() + index,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: '未知艺术家',
      cover: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIj${Math.random().toString(16).substr(-6)}Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSI+8J+OrDwvdGV4dD48L3N2Zz4=`,
      duration: 0,
      url: url,
      file: file
    }
    playlist.value.push(newTrack)
  })
  pendingTracks.value = []
  showAddTrackModal.value = false
}

function removeTrack(index: number) {
  if (playlist.value.length > 1) {
    playlist.value.splice(index, 1)
    if (currentTrackIndex.value >= index && currentTrackIndex.value > 0) {
      currentTrackIndex.value--
    }
  }
}

watch(volume, (newVolume) => {
  if (audioElement.value) {
    audioElement.value.volume = newVolume / 100
  }
})

onMounted(() => {
  initAudio()
  
  const handleResize = () => {
    if (visualizerCanvas.value) {
      visualizerCanvas.value.width = visualizerCanvas.value.offsetWidth
      visualizerCanvas.value.height = visualizerCanvas.value.offsetHeight
    }
  }
  
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (audioElement.value) {
    audioElement.value.pause()
  }
})
</script>

<style scoped>
.music-player {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
  --theme-primary: #667eea;
  --theme-secondary: #764ba2;
  --theme-primary-rgb: 102, 126, 234;
  --theme-secondary-rgb: 118, 75, 162;
}

.visualizer-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.visualizer {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
}

.visualization-controls {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.mode-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.mode-btn.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.player-main {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 320px;
  z-index: 10;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 30px;
}

.album-cover {
  width: 120px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-cover:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  font-size: 40px;
  color: white;
}

.track-info {
  flex: 1;
  color: white;
}

.track-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 5px;
}

.track-artist {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-secondary));
  border-radius: 2px;
  position: relative;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-bar:hover .progress-handle {
  opacity: 1;
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.control-btn {
  width: 50px;
  height: 50px;
  border: none;
  background: transparent;
  color: white;
  font-size: 24px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn .active {
  color: var(--theme-primary);
}

.play-btn {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  font-size: 32px;
}

.play-btn:hover {
  transform: scale(1.1);
  filter: brightness(1.15);
}

.volume-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
}

.volume-icon {
  font-size: 20px;
}

.volume-slider {
  width: 150px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.volume-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 35px;
}

.sidebar-container {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  background: rgba(0, 0, 0, 0.85);
  z-index: 20;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 15px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
}

.tab-btn:hover {
  color: white;
}

.tab-btn.active {
  color: white;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-secondary));
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.playlist-panel,
.lyrics-panel,
.themes-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.playlist-header,
.lyrics-header,
.themes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.playlist-header h3,
.lyrics-header h3,
.themes-header h3 {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.add-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border: none;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(var(--theme-primary-rgb), 0.4);
}

.track-list {
  flex: 1;
  overflow-y: auto;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 5px;
}

.track-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.track-item.active {
  background: rgba(var(--theme-primary-rgb), 0.2);
}

.track-number {
  width: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.track-item.active .track-number {
  color: var(--theme-primary);
}

.track-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}

.track-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-details {
  flex: 1;
  min-width: 0;
}

.track-name {
  color: white;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-item.active .track-name {
  color: var(--theme-primary);
}

.track-artist {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-duration {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
}

.track-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: #f5576c;
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.lyric-line {
  padding: 10px 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  line-height: 1.6;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.7);
}

.lyric-line.active {
  color: white;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.3), transparent);
  padding-left: 10px;
  border-radius: 4px;
}

.no-lyrics {
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px 0;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.theme-item {
  aspect-ratio: 1;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.theme-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.theme-item:hover::before {
  opacity: 1;
}

.theme-item.active {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.theme-item.active::after {
  content: '✓';
  position: absolute;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-primary);
  font-weight: bold;
}

.theme-name {
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 500px;
  max-width: 90vw;
  background: #1a1a2e;
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 20px;
}

.upload-area {
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: var(--theme-primary);
  background: rgba(var(--theme-primary-rgb), 0.1);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.upload-area p {
  color: white;
  font-size: 16px;
  margin-bottom: 5px;
}

.upload-hint {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 12px !important;
}

.pending-tracks {
  margin-top: 20px;
}

.pending-tracks h4 {
  color: white;
  margin-bottom: 10px;
  font-size: 14px;
}

.pending-track {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 5px;
}

.pending-track span {
  color: white;
  font-size: 14px;
}

.pending-track button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 18px;
}

.confirm-add-btn {
  width: 100%;
  margin-top: 15px;
  padding: 12px;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border: none;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.confirm-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(var(--theme-primary-rgb), 0.4);
}

.theme-purple {
  --theme-primary: #667eea;
  --theme-secondary: #764ba2;
  --theme-primary-rgb: 102, 126, 234;
  --theme-secondary-rgb: 118, 75, 162;
}

.theme-blue {
  --theme-primary: #2193b0;
  --theme-secondary: #6dd5ed;
  --theme-primary-rgb: 33, 147, 176;
  --theme-secondary-rgb: 109, 213, 237;
}

.theme-green {
  --theme-primary: #11998e;
  --theme-secondary: #38ef7d;
  --theme-primary-rgb: 17, 153, 142;
  --theme-secondary-rgb: 56, 239, 125;
}

.theme-orange {
  --theme-primary: #f093fb;
  --theme-secondary: #f5576c;
  --theme-primary-rgb: 240, 147, 251;
  --theme-secondary-rgb: 245, 87, 108;
}

.theme-dark {
  --theme-primary: #232526;
  --theme-secondary: #414345;
  --theme-primary-rgb: 35, 37, 38;
  --theme-secondary-rgb: 65, 67, 69;
}

.theme-pink {
  --theme-primary: #ff9a9e;
  --theme-secondary: #fecfef;
  --theme-primary-rgb: 255, 154, 158;
  --theme-secondary-rgb: 254, 207, 239;
}

@media (max-width: 1200px) {
  .sidebar-container {
    width: 280px;
  }
  
  .player-main {
    right: 280px;
  }
}

@media (max-width: 768px) {
  .music-player {
    flex-direction: column;
  }
  
  .sidebar-container {
    position: relative;
    width: 100%;
    height: 40vh;
  }
  
  .player-main {
    position: relative;
    right: 0;
    padding: 20px;
  }
  
  .player-info {
    flex-direction: column;
    text-align: center;
  }
  
  .visualization-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
