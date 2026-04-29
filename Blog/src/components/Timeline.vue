<template>
  <div class="timeline-page" ref="pageRef">
    <div class="timeline-header">
      <h1 class="timeline-title">成长时间轴</h1>
      <p class="timeline-subtitle">记录每一个重要时刻</p>
      
      <div class="filter-controls">
        <div class="year-filter">
          <span class="filter-label">年份筛选:</span>
          <select class="year-select" :value="selectedYear" @change="onYearSelectChange($event)">
            <option value="all">全部年份</option>
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="scroll-indicator">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: scrollProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(scrollProgress) }}%</span>
        </div>
      </div>
    </div>

    <div 
      class="timeline-container" 
      ref="containerRef"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @wheel="onWheel"
    >
      <div class="timeline-axis">
        <div class="axis-line"></div>
        
        <div 
          class="timeline-item"
          v-for="(event, index) in filteredEvents"
          :key="event.id"
          :style="{ '--index': index }"
          :class="{ 
            'expanded': expandedIndex === index,
            'is-left': index % 2 === 0,
            'is-right': index % 2 === 1
          }"
          @click="toggleExpand(index)"
          :ref="el => { if (el) itemRefs[index] = el as HTMLElement }"
        >
          <div class="timeline-dot">
            <div class="dot-inner"></div>
          </div>
          
          <div class="timeline-card">
            <div class="card-header">
              <span class="event-date">{{ event.date }}</span>
              <span class="event-type" :style="{ background: event.typeColor }">{{ event.type }}</span>
            </div>
            
            <h3 class="event-title">{{ event.title }}</h3>
            <p class="event-summary">{{ event.summary }}</p>
            
            <div class="event-details" v-show="expandedIndex === index">
              <div class="detail-content">
                <p class="detail-text">{{ event.fullDescription }}</p>
                <div class="detail-tags" v-if="event.tags && event.tags.length">
                  <span class="detail-tag" v-for="tag in event.tags" :key="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
            
            <div class="card-footer">
              <span class="expand-hint">
                {{ expandedIndex === index ? '收起详情 ▲' : '展开详情 ▼' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-footer">
      <p class="footer-hint">💡 拖拽或使用滚轮浏览 | 点击节点展开详情</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import '@/styles/Timeline.css'

interface TimelineEvent {
  id: number
  year: number
  date: string
  type: string
  typeColor: string
  title: string
  summary: string
  fullDescription: string
  tags?: string[]
}

const pageRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const itemRefs = ref<{ [key: number]: HTMLElement }>({})

const expandedIndex = ref<number | null>(null)
const selectedYear = ref<string>('all')
const scrollProgress = ref(0)

const isDragging = ref(false)
const startY = ref(0)
const scrollTop = ref(0)

const events = reactive<TimelineEvent[]>([
  {
    id: 1,
    year: 2018,
    date: '2018年9月',
    type: '教育',
    typeColor: '#667eea',
    title: '大学入学',
    summary: '考入计算机科学与技术专业',
    fullDescription: '成功考入理想的大学，选择计算机科学与技术专业。这是我编程之路的起点，从C语言开始学习，逐渐理解了计算机的基本原理和编程思维。',
    tags: ['大学', '计算机科学']
  },
  {
    id: 2,
    year: 2019,
    date: '2019年3月',
    type: '学习',
    typeColor: '#11998e',
    title: '前端入门',
    summary: '开始学习HTML/CSS/JavaScript',
    fullDescription: '在课程中接触到网页开发，对前端产生浓厚兴趣。从最基础的HTML结构、CSS样式开始学习，逐步理解DOM操作和事件处理。完成了第一个个人静态网站项目。',
    tags: ['HTML', 'CSS', 'JavaScript']
  },
  {
    id: 3,
    year: 2019,
    date: '2019年10月',
    type: '项目',
    typeColor: '#f093fb',
    title: '第一个正式项目',
    summary: '参与学校社团官网开发',
    fullDescription: '加入学校技术社团，参与社团官网的改版工作。负责前端页面开发，使用了jQuery和Bootstrap框架。这是第一次团队协作开发，学习了Git版本控制和代码协作。',
    tags: ['jQuery', 'Bootstrap', '团队协作']
  },
  {
    id: 4,
    year: 2020,
    date: '2020年6月',
    type: '学习',
    typeColor: '#11998e',
    title: 'Vue.js入门',
    summary: '学习Vue框架和组件化开发',
    fullDescription: '开始学习Vue.js框架，理解了组件化开发的思想。从Vue 2开始学习，掌握了Vue实例、指令、计算属性、生命周期等核心概念。完成了一个Todo应用和简单的博客系统。',
    tags: ['Vue.js', '组件化']
  },
  {
    id: 5,
    year: 2020,
    date: '2020年12月',
    type: '实习',
    typeColor: '#43e97b',
    title: '第一份前端实习',
    summary: '在互联网公司实习3个月',
    fullDescription: '获得第一份前端开发实习机会，在一家互联网公司参与电商项目开发。学习了真实项目的开发流程，接触了Vue CLI、Webpack等工程化工具，以及Element UI组件库。',
    tags: ['实习', '电商', 'Vue CLI']
  },
  {
    id: 6,
    year: 2021,
    date: '2021年5月',
    type: '学习',
    typeColor: '#11998e',
    title: 'TypeScript学习',
    summary: '掌握静态类型系统',
    fullDescription: '深入学习TypeScript，理解类型系统的优势。从基础类型到泛型、装饰器等高级特性，逐步掌握了类型安全的开发方式。开始在项目中使用TypeScript，代码质量和可维护性显著提升。',
    tags: ['TypeScript', '类型系统']
  },
  {
    id: 7,
    year: 2021,
    date: '2021年10月',
    type: '项目',
    typeColor: '#f093fb',
    title: '毕业设计项目',
    summary: '完成基于Vue的管理系统',
    fullDescription: '开始毕业设计，选择了企业后台管理系统作为课题。使用Vue 3 + TypeScript + Element Plus技术栈，实现了权限管理、数据可视化、表单管理等功能。最终获得优秀毕业设计评价。',
    tags: ['Vue 3', 'TypeScript', 'Element Plus']
  },
  {
    id: 8,
    year: 2022,
    date: '2022年6月',
    type: '里程碑',
    typeColor: '#ff6b6b',
    title: '大学毕业',
    summary: '顺利毕业并获得学士学位',
    fullDescription: '完成大学四年学业，顺利毕业并获得计算机科学与技术学士学位。回顾四年，从零基础入门到成为一名合格的前端开发者，收获满满。对未来的职业生涯充满期待。',
    tags: ['毕业', '学士学位']
  },
  {
    id: 9,
    year: 2022,
    date: '2022年7月',
    type: '职业',
    typeColor: '#43e97b',
    title: '正式入职',
    summary: '成为前端开发工程师',
    fullDescription: '正式入职一家科技公司，担任前端开发工程师。参与公司核心产品的开发维护，接触到大型项目的架构设计和性能优化。在实际工作中不断学习成长，逐步承担更多责任。',
    tags: ['入职', '前端工程师']
  },
  {
    id: 10,
    year: 2023,
    date: '2023年3月',
    type: '学习',
    typeColor: '#11998e',
    title: '深入React生态',
    summary: '学习React和现代前端工具链',
    fullDescription: '为了拓宽技术栈，开始深入学习React生态系统。掌握了React Hooks、状态管理（Redux/Zustand）、Next.js等技术。理解了不同框架的设计理念，能够根据项目需求选择合适的技术方案。',
    tags: ['React', 'Next.js', '状态管理']
  },
  {
    id: 11,
    year: 2023,
    date: '2023年9月',
    type: '项目',
    typeColor: '#f093fb',
    title: '独立负责项目',
    summary: '主导前端架构设计',
    fullDescription: '获得机会独立负责一个新项目的前端开发。从技术选型、架构设计到开发落地全程参与。使用Vue 3 + Vite + Pinia + TypeScript的现代技术栈，项目上线后获得用户好评。',
    tags: ['架构设计', 'Vite', 'Pinia']
  },
  {
    id: 12,
    year: 2024,
    date: '2024年1月',
    type: '里程碑',
    typeColor: '#ff6b6b',
    title: '技术分享',
    summary: '在团队进行技术分享',
    fullDescription: '在团队内部进行第一次技术分享，主题是"Vue 3组合式API最佳实践"。分享了自己在实际项目中总结的经验和踩过的坑，获得同事们的认可。这是从开发者到技术分享者的重要一步。',
    tags: ['技术分享', '团队建设']
  },
  {
    id: 13,
    year: 2024,
    date: '2024年4月',
    type: '学习',
    typeColor: '#11998e',
    title: '探索Web3D',
    summary: '学习Three.js和WebGL',
    fullDescription: '对Web 3D技术产生浓厚兴趣，开始学习Three.js和WebGL基础。能够创建简单的3D场景、加载模型、添加光照和动画。未来希望能够在项目中应用这些知识，创造更丰富的用户体验。',
    tags: ['Three.js', 'WebGL', '3D']
  }
])

const availableYears = computed(() => {
  const years = [...new Set(events.map(e => e.year))]
  return years.sort((a, b) => b - a)
})

const filteredEvents = computed(() => {
  if (selectedYear.value === 'all') {
    return events
  }
  return events.filter(e => e.year === Number(selectedYear.value))
})

function updateScrollProgress() {
  const container = containerRef.value
  if (!container) return
  
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight - container.clientHeight
  
  if (scrollHeight > 0) {
    scrollProgress.value = (scrollTop / scrollHeight) * 100
  }
}

function startDrag(e: MouseEvent) {
  isDragging.value = true
  startY.value = e.pageY - (containerRef.value?.offsetTop || 0)
  scrollTop.value = containerRef.value?.scrollTop || 0
  if (containerRef.value) {
    containerRef.value.style.cursor = 'grabbing'
  }
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  
  const y = e.pageY - (containerRef.value?.offsetTop || 0)
  const walk = y - startY.value
  
  if (containerRef.value) {
    containerRef.value.scrollTop = scrollTop.value - walk
  }
}

function stopDrag() {
  isDragging.value = false
  if (containerRef.value) {
    containerRef.value.style.cursor = 'grab'
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (containerRef.value) {
    containerRef.value.scrollTop += e.deltaY
  }
}

function onYearSelectChange(e: Event) {
  const target = e.target as HTMLSelectElement
  if (target && target.value !== undefined) {
    selectedYear.value = target.value
    expandedIndex.value = null
    
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
    
    nextTick(() => {
      updateScrollProgress()
    })
  }
}

function toggleExpand(index: number) {
  if (expandedIndex.value === index) {
    expandedIndex.value = null
  } else {
    expandedIndex.value = index
    
    nextTick(() => {
      const itemEl = itemRefs.value[index]
      if (itemEl && containerRef.value) {
        const containerRect = containerRef.value.getBoundingClientRect()
        const itemRect = itemEl.getBoundingClientRect()
        
        if (itemRect.bottom > containerRect.bottom || itemRect.top < containerRect.top) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    })
  }
}

function handleScroll() {
  updateScrollProgress()
}

onMounted(() => {
  const container = containerRef.value
  if (container) {
    container.addEventListener('scroll', handleScroll, { passive: true })
  }
  
  updateScrollProgress()
})

onBeforeUnmount(() => {
  const container = containerRef.value
  if (container) {
    container.removeEventListener('scroll', handleScroll)
  }
})
</script>
