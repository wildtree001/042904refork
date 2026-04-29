<template>
  <div class="skill-radar-container">
    <div class="header">
      <h2 class="title">技能雷达图</h2>
      <div class="controls">
        <div class="control-group">
          <label>主题：</label>
          <el-select v-model="currentTheme" placeholder="选择主题" size="small" @change="updateTheme">
            <el-option label="深色主题" value="dark" />
            <el-option label="浅色主题" value="light" />
            <el-option label="蓝色主题" value="blue" />
            <el-option label="紫色主题" value="purple" />
          </el-select>
        </div>
        <div class="control-group">
          <label>
            <el-checkbox v-model="compareMode">对比模式</el-checkbox>
          </label>
        </div>
        <div class="control-group">
          <label>
            <el-checkbox v-model="breathAnimation" @change="toggleBreathAnimation">呼吸动画</el-checkbox>
          </label>
        </div>
      </div>
    </div>

    <div class="radar-main">
      <div ref="chartRef" class="chart-container"></div>
    </div>

    <div class="timeline-section">
      <div class="timeline-label">
        <span>时间轴：{{ formatTimePeriod(timePeriods[currentTimeIndex]) }}</span>
        <span v-if="compareMode" class="compare-label">
          对比：{{ formatTimePeriod(timePeriods[compareTimeIndex]) }}
        </span>
      </div>
      <div class="timeline-slider">
        <input
          type="range"
          v-model="currentTimeIndex"
          :min="0"
          :max="timePeriods.length - 1"
          step="1"
          class="slider"
          @input="updateChart"
        />
        <div class="timeline-marks">
          <span
            v-for="(period, index) in timePeriods"
            :key="index"
            class="mark"
            :class="{ active: index === currentTimeIndex, compare: compareMode && index === compareTimeIndex }"
            @click="currentTimeIndex = index; updateChart()"
          >
            {{ period.year }}
          </span>
        </div>
      </div>
      <div v-if="compareMode" class="compare-slider">
        <label>对比时期：</label>
        <input
          type="range"
          v-model="compareTimeIndex"
          :min="0"
          :max="timePeriods.length - 1"
          step="1"
          class="slider"
          @input="updateChart"
        />
        <div class="timeline-marks">
          <span
            v-for="(period, index) in timePeriods"
            :key="index"
            class="mark"
            :class="{ active: index === compareTimeIndex, compare: true }"
            @click="compareTimeIndex = index; updateChart()"
          >
            {{ period.year }}
          </span>
        </div>
      </div>
    </div>

    <div class="legend-section">
      <div class="legend-item" v-if="!compareMode">
        <span class="legend-color" :style="{ background: themeColors[currentTheme].primary }"></span>
        <span>{{ formatTimePeriod(timePeriods[currentTimeIndex]) }}</span>
      </div>
      <div class="legend-item" v-if="compareMode">
        <span class="legend-color" :style="{ background: themeColors[currentTheme].primary }"></span>
        <span>{{ formatTimePeriod(timePeriods[currentTimeIndex]) }} (主)</span>
      </div>
      <div class="legend-item" v-if="compareMode">
        <span class="legend-color" :style="{ background: themeColors[currentTheme].secondary }"></span>
        <span>{{ formatTimePeriod(timePeriods[compareTimeIndex]) }} (对比)</span>
      </div>
    </div>

    <div class="skills-detail">
      <h3>技能详情</h3>
      <div class="skills-grid">
        <div
          v-for="skill in skills"
          :key="skill.name"
          class="skill-card"
          :style="{ '--skill-color': getSkillColor(skill.name) }"
        >
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-value">
            <span class="current">{{ getSkillValue(skill.name, currentTimeIndex) }}</span>
            <span v-if="compareMode" class="compare"> / {{ getSkillValue(skill.name, compareTimeIndex) }}</span>
          </div>
          <div class="skill-bar">
            <div class="skill-bar-fill" :style="{ width: getSkillValue(skill.name, currentTimeIndex) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import * as echarts from 'echarts'

interface TimePeriod {
  year: string
  month: string
}

interface SkillData {
  name: string
  values: number[]
}

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let animationFrameId: number | null = null
let breathPhase = 0

type ThemeKey = 'dark' | 'light' | 'blue' | 'purple'

const currentTheme = ref<ThemeKey>('dark')
const compareMode = ref(false)
const breathAnimation = ref(true)
const currentTimeIndex = ref(3)
const compareTimeIndex = ref(0)

const timePeriods: TimePeriod[] = [
  { year: '2020', month: '01' },
  { year: '2021', month: '06' },
  { year: '2022', month: '12' },
  { year: '2023', month: '06' },
  { year: '2024', month: '12' },
]

const skills: SkillData[] = [
  { name: 'JavaScript', values: [40, 55, 70, 85, 90] },
  { name: 'Vue', values: [30, 45, 65, 80, 88] },
  { name: 'TypeScript', values: [20, 35, 55, 75, 85] },
  { name: 'CSS', values: [50, 60, 75, 85, 92] },
  { name: 'Node.js', values: [15, 25, 45, 60, 75] },
  { name: 'Python', values: [10, 20, 35, 50, 65] },
]

const themeColors = {
  dark: {
    background: '#1a1a2e',
    text: '#ffffff',
    primary: '#ff6b9d',
    secondary: '#4facfe',
    axisLine: '#333',
    splitLine: '#2a2a4a',
    gridColor: 'rgba(255, 255, 255, 0.1)',
  },
  light: {
    background: '#ffffff',
    text: '#333333',
    primary: '#667eea',
    secondary: '#764ba2',
    axisLine: '#ddd',
    splitLine: '#eee',
    gridColor: 'rgba(0, 0, 0, 0.1)',
  },
  blue: {
    background: '#0f172a',
    text: '#e2e8f0',
    primary: '#3b82f6',
    secondary: '#14b8a6',
    axisLine: '#1e293b',
    splitLine: '#334155',
    gridColor: 'rgba(59, 130, 246, 0.2)',
  },
  purple: {
    background: '#1e1b4b',
    text: '#e0e7ff',
    primary: '#a855f7',
    secondary: '#ec4899',
    axisLine: '#312e81',
    splitLine: '#4338ca',
    gridColor: 'rgba(168, 85, 247, 0.2)',
  },
}

const skillColors: Record<string, string> = {
  JavaScript: '#f7df1e',
  Vue: '#42b883',
  TypeScript: '#3178c6',
  CSS: '#1572b6',
  'Node.js': '#339933',
  Python: '#3776ab',
}

function formatTimePeriod(period: TimePeriod | undefined): string {
  if (!period) return ''
  return `${period.year}年${period.month}月`
}

function getSkillValue(skillName: string, timeIndex: number): number {
  const skill = skills.find((s) => s.name === skillName)
  return skill ? (skill.values[timeIndex] ?? 0) : 0
}

function getSkillColor(skillName: string): string {
  return skillColors[skillName] || '#666'
}

const colors = computed(() => themeColors[currentTheme.value as keyof typeof themeColors])

function updateTheme() {
  updateChart()
}

function toggleBreathAnimation() {
  if (breathAnimation.value) {
    startBreathAnimation()
  } else {
    stopBreathAnimation()
    updateChart()
  }
}

function startBreathAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  function animate() {
    breathPhase += 0.02
    if (breathPhase > Math.PI * 2) {
      breathPhase = 0
    }
    updateChartWithBreath()
    if (breathAnimation.value) {
      animationFrameId = requestAnimationFrame(animate)
    }
  }

  animate()
}

function stopBreathAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function getBreathScale(): number {
  if (!breathAnimation.value) return 1
  return 1 + Math.sin(breathPhase) * 0.03
}

function updateChartWithBreath() {
  if (!chartInstance) return
  updateChart()
}

function updateChart() {
  if (!chartInstance || !chartRef.value) return

  const c = colors.value
  const breathScale = getBreathScale()

  const radarData = [
    {
      name: formatTimePeriod(timePeriods[currentTimeIndex.value]),
      value: skills.map((skill) => (skill.values[currentTimeIndex.value] ?? 0) * breathScale),
      areaStyle: {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: c.primary + '40' },
          { offset: 1, color: c.primary + '20' },
        ]),
      },
      lineStyle: {
        color: c.primary,
        width: 3,
      },
      itemStyle: {
        color: c.primary,
      },
    },
  ]

  if (compareMode.value) {
    radarData.push({
      name: formatTimePeriod(timePeriods[compareTimeIndex.value]),
      value: skills.map((skill) => skill.values[compareTimeIndex.value] ?? 0),
      areaStyle: {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: c.secondary + '40' },
          { offset: 1, color: c.secondary + '20' },
        ]),
      },
      lineStyle: {
        color: c.secondary,
        width: 2,
        type: 'dashed' as any,
      },
      itemStyle: {
        color: c.secondary,
      },
    } as any)
  }

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: c.background,
      borderColor: c.gridColor,
      textStyle: {
        color: c.text,
      },
      formatter: (params: any) => {
        const data = params.data
        const result = [`<strong>${data.name}</strong>`]
        skills.forEach((skill, idx) => {
          result.push(`${skill.name}: ${Math.round(data.value[idx])}`)
        })
        return result.join('<br/>')
      },
    },
    legend: {
      show: false,
    },
    radar: {
      indicator: skills.map((skill) => ({
        name: skill.name,
        max: 100,
      })),
      center: ['50%', '50%'],
      radius: '65%',
      splitNumber: 5,
      axisName: {
        color: c.text,
        fontSize: 14,
        fontWeight: 'bold',
      },
      splitLine: {
        lineStyle: {
          color: c.splitLine,
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [c.background, c.gridColor + '10'],
        },
      },
      axisLine: {
        lineStyle: {
          color: c.axisLine,
        },
      },
    },
    series: [
      {
        name: '技能雷达',
        type: 'radar',
        data: radarData,
        emphasis: {
          lineStyle: {
            width: 4,
          },
        },
      },
    ],
  }

  chartInstance.setOption(option, true)
}

function handleResize() {
  chartInstance?.resize()
}

watch([currentTimeIndex, compareTimeIndex, compareMode], () => {
  updateChart()
})

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChart()
    if (breathAnimation.value) {
      startBreathAnimation()
    }
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  stopBreathAnimation()
  chartInstance?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.skill-radar-container {
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: linear-gradient(135deg, var(--bg-color, #1a1a2e) 0%, var(--bg-color-dark, #16213e) 100%);
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
  background: linear-gradient(135deg, #ff6b9d 0%, #c44ae0 100%);
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

.radar-main {
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.timeline-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.compare-label {
  color: #4facfe;
}

.timeline-slider,
.compare-slider {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compare-slider {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.compare-slider label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44ae0 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(196, 74, 224, 0.5);
  transition: transform 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c44ae0 100%);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 10px rgba(196, 74, 224, 0.5);
}

.timeline-marks {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
}

.mark {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 2px 8px;
  border-radius: 4px;
}

.mark:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.mark.active {
  color: #ff6b9d;
  font-weight: bold;
  background: rgba(255, 107, 157, 0.1);
}

.mark.compare {
  color: #4facfe;
}

.mark.compare.active {
  background: rgba(79, 172, 254, 0.1);
}

.legend-section {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.skills-detail {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.skills-detail h3 {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.skill-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 15px;
  border-left: 3px solid var(--skill-color, #666);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.skill-name {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  margin-bottom: 8px;
}

.skill-value {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-bottom: 8px;
}

.skill-value .current {
  color: #ff6b9d;
  font-weight: bold;
  font-size: 1.2rem;
}

.skill-value .compare {
  color: #4facfe;
}

.skill-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b9d 0%, #c44ae0 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

@media (max-width: 768px) {
  .skill-radar-container {
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

  .radar-main {
    height: 300px;
  }

  .skills-grid {
    grid-template-columns: 1fr;
  }

  .legend-section {
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }
}
</style>
