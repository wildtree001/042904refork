<template>
  <div class="globe-container">
    <div ref="globeCanvas" class="globe-canvas"></div>
    
    <div class="controls-panel">
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" v-model="autoRotate" class="control-checkbox" />
          自动旋转
        </label>
      </div>
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" v-model="showClouds" class="control-checkbox" />
          显示云层
        </label>
      </div>
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" v-model="showStars" class="control-checkbox" />
          显示星空
        </label>
      </div>
      <div class="control-group">
        <button class="reset-btn" @click="resetView">重置视角</button>
      </div>
    </div>

    <div class="info-panel" v-if="selectedCountry">
      <div class="info-header">
        <h3>{{ selectedCountry.name }}</h3>
        <button class="close-btn" @click="selectedCountry = null">×</button>
      </div>
      <div class="info-content">
        <div class="info-item">
          <span class="info-label">首都:</span>
          <span class="info-value">{{ selectedCountry.capital }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">人口:</span>
          <span class="info-value">{{ formatPopulation(selectedCountry.population) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">时区:</span>
          <span class="info-value">{{ selectedCountry.timezone }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">当前时间:</span>
          <span class="info-value">{{ getLocalTime(selectedCountry.timezoneOffset) }}</span>
        </div>
      </div>
      
      <div class="weather-section" v-if="weatherData">
        <h4>天气信息</h4>
        <div class="weather-info">
          <div class="weather-main">
            <span class="weather-icon">{{ getWeatherIcon(weatherData.condition) }}</span>
            <span class="weather-temp">{{ weatherData.temperature }}°C</span>
          </div>
          <div class="weather-details">
            <p>{{ weatherData.description }}</p>
            <p>湿度: {{ weatherData.humidity }}%</p>
            <p>风速: {{ weatherData.windSpeed }} km/h</p>
          </div>
        </div>
      </div>
    </div>

    <div class="timezone-panel">
      <h4>世界时钟</h4>
      <div class="timezone-list">
        <div v-for="tz in timezones" :key="tz.name" class="timezone-item">
          <div class="timezone-info">
            <span class="timezone-city">{{ tz.city }}</span>
            <span class="timezone-zone">{{ tz.name }}</span>
          </div>
          <div class="timezone-time">{{ getLocalTime(tz.offset) }}</div>
        </div>
      </div>
    </div>

    <div class="search-panel">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索国家..."
        class="search-input"
        @input="filterCountries"
      />
      <div v-if="filteredCountries.length > 0 && searchQuery" class="search-results">
        <div 
          v-for="country in filteredCountries" 
          :key="country.id"
          class="search-result-item"
          @click="focusOnCountry(country)"
        >
          <span class="country-flag">{{ country.flag }}</span>
          <span class="country-name">{{ country.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface Country {
  id: string
  name: string
  capital: string
  population: number
  timezone: string
  timezoneOffset: number
  lat: number
  lng: number
  flag: string
  color: number
}

interface WeatherData {
  condition: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
}

interface Timezone {
  name: string
  city: string
  offset: number
}

const globeCanvas = ref<HTMLDivElement | null>(null)

const autoRotate = ref(true)
const showClouds = ref(true)
const showStars = ref(true)
const searchQuery = ref('')
const selectedCountry = ref<Country | null>(null)
const weatherData = ref<WeatherData | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let earth: THREE.Mesh
let clouds: THREE.Mesh
let stars: THREE.Points
let countryMarkers: THREE.Mesh[] = []
let highlightRing: THREE.Mesh
let animationId: number

const countries: Country[] = [
  { id: 'cn', name: '中国', capital: '北京', population: 1400000000, timezone: 'UTC+8', timezoneOffset: 8, lat: 35.8617, lng: 104.1954, flag: '🇨🇳', color: 0xff0000 },
  { id: 'us', name: '美国', capital: '华盛顿', population: 331000000, timezone: 'UTC-5', timezoneOffset: -5, lat: 37.0902, lng: -95.7129, flag: '🇺🇸', color: 0x0000ff },
  { id: 'jp', name: '日本', capital: '东京', population: 126000000, timezone: 'UTC+9', timezoneOffset: 9, lat: 36.2048, lng: 138.2529, flag: '🇯🇵', color: 0xffffff },
  { id: 'gb', name: '英国', capital: '伦敦', population: 67000000, timezone: 'UTC+0', timezoneOffset: 0, lat: 55.3781, lng: -3.4360, flag: '🇬🇧', color: 0x1e90ff },
  { id: 'fr', name: '法国', capital: '巴黎', population: 67000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 46.2276, lng: 2.2137, flag: '🇫🇷', color: 0x0055a4 },
  { id: 'de', name: '德国', capital: '柏林', population: 83000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 51.1657, lng: 10.4515, flag: '🇩🇪', color: 0xffce00 },
  { id: 'au', name: '澳大利亚', capital: '堪培拉', population: 25000000, timezone: 'UTC+10', timezoneOffset: 10, lat: -25.2744, lng: 133.7751, flag: '🇦🇺', color: 0x00008b },
  { id: 'br', name: '巴西', capital: '巴西利亚', population: 210000000, timezone: 'UTC-3', timezoneOffset: -3, lat: -14.2350, lng: -51.9253, flag: '🇧🇷', color: 0x009c3b },
  { id: 'ru', name: '俄罗斯', capital: '莫斯科', population: 144000000, timezone: 'UTC+3', timezoneOffset: 3, lat: 61.5240, lng: 105.3188, flag: '🇷🇺', color: 0xd52b1e },
  { id: 'in', name: '印度', capital: '新德里', population: 1380000000, timezone: 'UTC+5:30', timezoneOffset: 5.5, lat: 20.5937, lng: 78.9629, flag: '🇮🇳', color: 0xff9933 },
  { id: 'ca', name: '加拿大', capital: '渥太华', population: 38000000, timezone: 'UTC-5', timezoneOffset: -5, lat: 56.1304, lng: -106.3468, flag: '🇨🇦', color: 0xff0000 },
  { id: 'kr', name: '韩国', capital: '首尔', population: 51000000, timezone: 'UTC+9', timezoneOffset: 9, lat: 35.9078, lng: 127.7669, flag: '🇰🇷', color: 0x0047a0 },
  { id: 'mx', name: '墨西哥', capital: '墨西哥城', population: 128000000, timezone: 'UTC-6', timezoneOffset: -6, lat: 23.6345, lng: -102.5528, flag: '🇲🇽', color: 0x006847 },
  { id: 'it', name: '意大利', capital: '罗马', population: 60000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 41.8719, lng: 12.5674, flag: '🇮🇹', color: 0x009246 },
  { id: 'es', name: '西班牙', capital: '马德里', population: 47000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 40.4637, lng: -3.7492, flag: '🇪🇸', color: 0xaa151b },
  { id: 'nl', name: '荷兰', capital: '阿姆斯特丹', population: 17000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 52.1326, lng: 5.2913, flag: '🇳🇱', color: 0x21468b },
  { id: 'se', name: '瑞典', capital: '斯德哥尔摩', population: 10000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 60.1282, lng: 18.6435, flag: '🇸🇪', color: 0x004b87 },
  { id: 'ch', name: '瑞士', capital: '伯尔尼', population: 8000000, timezone: 'UTC+1', timezoneOffset: 1, lat: 46.8182, lng: 8.2275, flag: '🇨🇭', color: 0xff0000 },
  { id: 'sg', name: '新加坡', capital: '新加坡', population: 5000000, timezone: 'UTC+8', timezoneOffset: 8, lat: 1.3521, lng: 103.8198, flag: '🇸🇬', color: 0xed2939 },
  { id: 'nz', name: '新西兰', capital: '惠灵顿', population: 5000000, timezone: 'UTC+12', timezoneOffset: 12, lat: -40.9006, lng: 174.8860, flag: '🇳🇿', color: 0x0000ff }
]

const timezones: Timezone[] = [
  { name: 'UTC-8', city: '洛杉矶', offset: -8 },
  { name: 'UTC-5', city: '纽约', offset: -5 },
  { name: 'UTC+0', city: '伦敦', offset: 0 },
  { name: 'UTC+1', city: '巴黎', offset: 1 },
  { name: 'UTC+8', city: '北京', offset: 8 },
  { name: 'UTC+9', city: '东京', offset: 9 }
]

const filteredCountries = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return countries.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.capital.toLowerCase().includes(query)
  )
})

function initScene() {
  if (!globeCanvas.value) return

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    45,
    globeCanvas.value.clientWidth / globeCanvas.value.clientHeight,
    0.1,
    1000
  )
  camera.position.z = 3

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(globeCanvas.value.clientWidth, globeCanvas.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  globeCanvas.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 1.8
  controls.maxDistance = 8
  controls.autoRotate = autoRotate.value
  controls.autoRotateSpeed = 0.5

  addLights()
  createEarth()
  createClouds()
  createStars()
  createCountryMarkers()
  createHighlightRing()

  animate()
}

function addLights() {
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 3, 5)
  scene.add(directionalLight)

  const backLight = new THREE.DirectionalLight(0x4488ff, 0.3)
  backLight.position.set(-5, -3, -5)
  scene.add(backLight)
}

function createEarth() {
  const geometry = new THREE.SphereGeometry(1, 64, 64)
  
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512)
  gradient.addColorStop(0, '#1e3a5f')
  gradient.addColorStop(0.3, '#2d5a87')
  gradient.addColorStop(0.5, '#1e4d6b')
  gradient.addColorStop(0.7, '#2d5a87')
  gradient.addColorStop(1, '#1e3a5f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 512)
  
  ctx.fillStyle = '#2d7a4a'
  drawContinent(ctx, 200, 150, 180, 150)
  drawContinent(ctx, 600, 150, 150, 120)
  drawContinent(ctx, 400, 280, 100, 180)
  drawContinent(ctx, 700, 280, 120, 160)
  drawContinent(ctx, 850, 120, 140, 180)
  drawContinent(ctx, 150, 300, 80, 120)
  drawContinent(ctx, 900, 380, 100, 80)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 85, 0)
    ctx.lineTo(i * 85, 512)
    ctx.stroke()
  }
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath()
    ctx.moveTo(0, i * 85)
    ctx.lineTo(1024, i * 85)
    ctx.stroke()
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    bumpScale: 0.05,
    specular: new THREE.Color(0x333333),
    shininess: 5
  })
  
  earth = new THREE.Mesh(geometry, material)
  scene.add(earth)
}

function drawContinent(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.fillStyle = '#3d8a5a'
  ctx.beginPath()
  ctx.ellipse(x + w * 0.1, y - h * 0.1, w * 0.3, h * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.fillStyle = '#2d7a4a'
}

function createClouds() {
  const geometry = new THREE.SphereGeometry(1.02, 64, 64)
  
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 256
    const r = Math.random() * 40 + 10
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  })
  
  clouds = new THREE.Mesh(geometry, material)
  scene.add(clouds)
}

function createStars() {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const colors: number[] = []
  
  for (let i = 0; i < 5000; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 50 + Math.random() * 50
    
    vertices.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
    
    const color = new THREE.Color()
    color.setHSL(Math.random() * 0.2 + 0.5, 0.5, 0.8 + Math.random() * 0.2)
    colors.push(color.r, color.g, color.b)
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  
  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  })
  
  stars = new THREE.Points(geometry, material)
  scene.add(stars)
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

function createCountryMarkers() {
  countries.forEach((country, index) => {
    const position = latLngToVector3(country.lat, country.lng, 1.01)
    
    const geometry = new THREE.SphereGeometry(0.02, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color: country.color,
      transparent: true,
      opacity: 0.9
    })
    
    const marker = new THREE.Mesh(geometry, material)
    marker.position.copy(position)
    marker.userData = { countryIndex: index, country }
    
    const ringGeometry = new THREE.RingGeometry(0.025, 0.035, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: country.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.lookAt(new THREE.Vector3(0, 0, 0))
    
    scene.add(marker)
    scene.add(ring)
    countryMarkers.push(marker)
  })
}

function createHighlightRing() {
  const geometry = new THREE.RingGeometry(0.05, 0.08, 32)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  })
  
  highlightRing = new THREE.Mesh(geometry, material)
  scene.add(highlightRing)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  
  controls.update()
  
  if (autoRotate.value && clouds) {
    clouds.rotation.y += 0.0002
  }
  
  if (showStars.value && stars) {
    stars.rotation.y += 0.0001
  }
  
  renderer.render(scene, camera)
}

function handleResize() {
  if (!globeCanvas.value || !camera || !renderer) return
  
  camera.aspect = globeCanvas.value.clientWidth / globeCanvas.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(globeCanvas.value.clientWidth, globeCanvas.value.clientHeight)
}

function handleClick(event: MouseEvent) {
  if (!globeCanvas.value) return
  
  const rect = globeCanvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)
  
  const intersects = raycaster.intersectObjects(countryMarkers)
  
  if (intersects.length > 0) {
    const firstIntersect = intersects[0]
    if (firstIntersect) {
      const marker = firstIntersect.object
      const country = marker.userData.country as Country
      
      selectedCountry.value = country
      loadWeatherData(country)
      
      highlightRing.position.copy(marker.position)
      highlightRing.lookAt(new THREE.Vector3(0, 0, 0))
      ;(highlightRing.material as THREE.MeshBasicMaterial).opacity = 0.8
    }
  } else {
    selectedCountry.value = null
    ;(highlightRing.material as THREE.MeshBasicMaterial).opacity = 0
  }
}

function filterCountries() {
  
}

function focusOnCountry(country: Country) {
  searchQuery.value = ''
  selectedCountry.value = country
  loadWeatherData(country)
  
  const position = latLngToVector3(country.lat, country.lng, 3)
  const targetPosition = new THREE.Vector3(-position.x, position.y, -position.z)
  
  animateCameraTo(targetPosition)
}

function animateCameraTo(targetPosition: THREE.Vector3) {
  const startPosition = camera.position.clone()
  const duration = 1000
  const startTime = Date.now()
  
  function updateCamera() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    const eased = 1 - Math.pow(1 - progress, 3)
    
    camera.position.lerpVectors(startPosition, targetPosition, eased)
    camera.lookAt(0, 0, 0)
    
    if (progress < 1) {
      requestAnimationFrame(updateCamera)
    }
  }
  
  updateCamera()
}

function resetView() {
  animateCameraTo(new THREE.Vector3(0, 0, 3))
  selectedCountry.value = null
  ;(highlightRing.material as THREE.MeshBasicMaterial).opacity = 0
}

function loadWeatherData(country: Country) {
  const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Clear']
  const descriptions = ['晴朗', '多云', '有雨', '局部多云', '晴朗']
  const randomIndex = Math.floor(Math.random() * conditions.length)
  
  const baseTemp = country.lat > 0 ? 20 - Math.abs(country.lat) * 0.5 : 25 - Math.abs(country.lat) * 0.3
  
  weatherData.value = {
    condition: conditions[randomIndex] ?? 'Sunny',
    temperature: Math.round(baseTemp + Math.random() * 15 - 5),
    description: descriptions[randomIndex] ?? '晴朗',
    humidity: Math.round(30 + Math.random() * 50),
    windSpeed: Math.round(5 + Math.random() * 20)
  }
}

function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    'Sunny': '☀️',
    'Cloudy': '☁️',
    'Rainy': '🌧️',
    'Partly Cloudy': '⛅',
    'Clear': '🌤️'
  }
  return icons[condition] || '🌤️'
}

function formatPopulation(population: number): string {
  if (population >= 1000000000) {
    return (population / 1000000000).toFixed(1) + ' 十亿'
  } else if (population >= 1000000) {
    return (population / 1000000).toFixed(1) + ' 百万'
  }
  return population.toString()
}

function getLocalTime(offset: number): string {
  const now = new Date()
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const localTime = new Date(utcTime + offset * 3600000)
  
  return localTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

watch(autoRotate, (newValue) => {
  if (controls) {
    controls.autoRotate = newValue
  }
})

watch(showClouds, (newValue) => {
  if (clouds) {
    clouds.visible = newValue
  }
})

watch(showStars, (newValue) => {
  if (stars) {
    stars.visible = newValue
  }
})

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
  
  if (globeCanvas.value) {
    globeCanvas.value.addEventListener('click', handleClick)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
  
  if (globeCanvas.value) {
    globeCanvas.value.removeEventListener('click', handleClick)
  }
  
  if (renderer && globeCanvas.value) {
    globeCanvas.value.removeChild(renderer.domElement)
    renderer.dispose()
  }
})
</script>

<style scoped>
.globe-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #0c1445 0%, #1a1a2e 50%, #0c1445 100%);
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.globe-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.globe-canvas:active {
  cursor: grabbing;
}

.controls-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.control-group {
  margin-bottom: 12px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.control-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #667eea;
  cursor: pointer;
}

.reset-btn {
  width: 100%;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 320px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  z-index: 10;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-header h3 {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
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

.info-content {
  padding: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.info-value {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.weather-section {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(102, 126, 234, 0.1);
}

.weather-section h4 {
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 15px;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weather-icon {
  font-size: 40px;
}

.weather-temp {
  color: white;
  font-size: 32px;
  font-weight: 700;
}

.weather-details {
  flex: 1;
}

.weather-details p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin: 5px 0;
}

.timezone-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  min-width: 280px;
}

.timezone-panel h4 {
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.timezone-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timezone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.timezone-info {
  display: flex;
  flex-direction: column;
}

.timezone-city {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.timezone-zone {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.timezone-time {
  color: #667eea;
  font-size: 18px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.search-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  color: white;
  font-size: 14px;
  outline: none;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 10px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: rgba(102, 126, 234, 0.2);
}

.country-flag {
  font-size: 24px;
}

.country-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .info-panel {
    width: 280px;
    top: auto;
    bottom: 20px;
    right: 20px;
  }
  
  .timezone-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  .controls-panel {
    top: auto;
    bottom: 20px;
    left: 20px;
  }
  
  .info-panel {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
    bottom: 100px;
  }
  
  .search-panel {
    width: calc(100% - 40px);
    top: 20px;
    left: 20px;
    transform: none;
  }
}
</style>
