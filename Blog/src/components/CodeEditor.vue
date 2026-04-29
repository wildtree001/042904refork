<template>
  <div class="code-editor-container">
    <div class="header">
      <h2 class="title">交互式代码编辑器</h2>
      <div class="controls">
        <div class="control-group">
          <label>语言：</label>
          <el-select v-model="currentLanguage" placeholder="选择语言" size="small" @change="changeLanguage">
            <el-option label="JavaScript" value="javascript" />
            <el-option label="TypeScript" value="typescript" />
            <el-option label="HTML" value="html" />
            <el-option label="CSS" value="css" />
            <el-option label="Python" value="python" />
            <el-option label="JSON" value="json" />
          </el-select>
        </div>
        <div class="control-group">
          <el-button size="small" @click="formatCode">
            <el-icon><Document /></el-icon>
            格式化
          </el-button>
          <el-button size="small" @click="saveSnippet">
            <el-icon><Star /></el-icon>
            收藏
          </el-button>
          <el-button size="small" @click="showSnippets = true">
            <el-icon><List /></el-icon>
            片段
          </el-button>
          <el-button size="small" @click="shareCode">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
          <el-button size="small" type="primary" @click="runCode">
            <el-icon><VideoPlay /></el-icon>
            运行
          </el-button>
        </div>
      </div>
    </div>

    <div class="editor-main">
      <div class="editor-section">
        <div class="editor-header">
          <span class="editor-label">代码编辑区</span>
          <span class="language-badge">{{ currentLanguage.toUpperCase() }}</span>
        </div>
        <div ref="editorContainer" class="editor-container"></div>
      </div>

      <div class="preview-section" v-if="canPreview">
        <div class="preview-header">
          <span class="preview-label">实时预览</span>
          <el-switch v-model="autoPreview" size="small" active-text="自动" />
        </div>
        <div class="preview-container">
          <iframe
            ref="previewFrame"
            class="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
      </div>

      <div class="console-section" v-if="showConsole">
        <div class="console-header">
          <span class="console-label">控制台</span>
          <el-button size="small" text @click="clearConsole">清空</el-button>
        </div>
        <div class="console-output">
          <div
            v-for="(log, index) in consoleLogs"
            :key="index"
            class="console-line"
            :class="log.type"
          >
            <span class="log-type">[{{ log.type.toUpperCase() }}]</span>
            <span class="log-content">{{ log.content }}</span>
          </div>
          <div v-if="consoleLogs.length === 0" class="console-empty">
            控制台暂无输出...
          </div>
        </div>
      </div>
    </div>

    <div class="snippets-drawer" :class="{ open: showSnippets }">
      <div class="snippets-header">
        <h3>收藏的代码片段</h3>
        <el-button size="small" text @click="showSnippets = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="snippets-list">
        <div
          v-for="(snippet, index) in savedSnippets"
          :key="index"
          class="snippet-item"
        >
          <div class="snippet-info">
            <div class="snippet-name">{{ snippet.name }}</div>
            <div class="snippet-lang">{{ snippet.language.toUpperCase() }}</div>
          </div>
          <div class="snippet-actions">
            <el-button size="small" text @click="loadSnippet(snippet)">
              加载
            </el-button>
            <el-button size="small" text type="danger" @click="deleteSnippet(index)">
              删除
            </el-button>
          </div>
        </div>
        <div v-if="savedSnippets.length === 0" class="snippets-empty">
          暂无收藏的代码片段
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showShareDialog"
      title="分享代码"
      width="500px"
      :show-close="true"
    >
      <div class="share-content">
        <p class="share-description">复制以下链接分享您的代码：</p>
        <el-input
          v-model="shareLink"
          :readonly="true"
          size="large"
        >
          <template #append>
            <el-button @click="copyShareLink">复制</el-button>
          </template>
        </el-input>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showSaveDialog"
      title="保存代码片段"
      width="400px"
      :show-close="true"
    >
      <el-form :model="snippetForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="snippetForm.name" placeholder="请输入片段名称" />
        </el-form-item>
        <el-form-item label="语言">
          <el-select v-model="snippetForm.language" placeholder="选择语言">
            <el-option label="JavaScript" value="javascript" />
            <el-option label="TypeScript" value="typescript" />
            <el-option label="HTML" value="html" />
            <el-option label="CSS" value="css" />
            <el-option label="Python" value="python" />
            <el-option label="JSON" value="json" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSaveDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveSnippet">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Star, List, Share, VideoPlay, Close } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import * as prettier from 'prettier'

interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info'
  content: string
  timestamp: string
}

interface CodeSnippet {
  name: string
  language: string
  code: string
  createdAt: string
}

const editorContainer = ref<HTMLElement | null>(null)
const previewFrame = ref<HTMLIFrameElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const currentLanguage = ref('javascript')
const autoPreview = ref(true)
const showConsole = ref(true)
const showSnippets = ref(false)
const showShareDialog = ref(false)
const showSaveDialog = ref(false)
const shareLink = ref('')
const consoleLogs = ref<ConsoleLog[]>([])
const savedSnippets = ref<CodeSnippet[]>([])

const snippetForm = ref({
  name: '',
  language: 'javascript',
})

const languageTemplates: Record<string, string> = {
  javascript: `// JavaScript 示例
console.log("Hello, World!");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
  typescript: `// TypeScript 示例
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: "张三", email: "zhangsan@example.com" },
  { id: 2, name: "李四", email: "lisi@example.com" },
];

function getUserById(id: number): User | undefined {
  return users.find(user => user.id === id);
}

console.log(getUserById(1));`,
  html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>示例页面</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
    }
    h1 { color: #333; margin-bottom: 16px; }
    p { color: #666; }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      transition: transform 0.2s;
    }
    button:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>欢迎来到示例页面</h1>
    <p>这是一个实时预览的 HTML 示例</p>
    <button onclick="alert('你点击了按钮！')">点击我</button>
  </div>
</body>
</html>`,
  css: `/* CSS 示例 */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --text-color: #333;
  --bg-color: #f5f7fa;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: scale(1.02);
}`,
  python: `# Python 示例
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

if __name__ == "__main__":
    print("快速排序示例:")
    unsorted = [3, 6, 8, 10, 1, 2, 1]
    print(f"排序前: {unsorted}")
    print(f"排序后: {quicksort(unsorted)}")
    
    print("\\n斐波那契数列前10项:")
    for num in fibonacci(10):
        print(num, end=" ")`,
  json: `{
  "name": "我的项目",
  "version": "1.0.0",
  "description": "这是一个示例 JSON 配置",
  "author": {
    "name": "开发者",
    "email": "developer@example.com"
  },
  "dependencies": {
    "vue": "^3.3.0",
    "typescript": "^5.0.0",
    "element-plus": "^2.3.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "keywords": [
    "vue",
    "typescript",
    "frontend"
  ],
  "license": "MIT"
}`,
}

const canPreview = computed(() => {
  return ['html', 'css', 'javascript'].includes(currentLanguage.value)
})

const currentCode = computed({
  get: () => editor?.getValue() || '',
  set: (val) => editor?.setValue(val),
})

function addLog(type: ConsoleLog['type'], content: string) {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  consoleLogs.value.push({ type, content, timestamp })
}

function clearConsole() {
  consoleLogs.value = []
}

function initEditor() {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: languageTemplates.javascript,
    language: 'javascript',
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    lineNumbers: 'on',
    roundedSelection: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    formatOnPaste: true,
    formatOnType: true,
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showVariables: true,
      showClasses: true,
      showModules: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showIssues: true,
    },
  })

  editor.onDidChangeModelContent(() => {
    if (autoPreview.value && canPreview.value) {
      updatePreview()
    }
  })
}

function changeLanguage(lang: string) {
  if (!editor) return

  const currentValue = editor.getValue()
  const isTemplate = Object.values(languageTemplates).some(
    (t) => t === currentValue
  )

  monaco.editor.setModelLanguage(editor.getModel()!, lang)

  if (isTemplate) {
    editor.setValue(languageTemplates[lang] || '')
  }

  ElMessage.success(`已切换到 ${lang.toUpperCase()}`)
}

async function formatCode() {
  if (!editor) return

  try {
    const code = editor.getValue()
    let formatted = code

    if (currentLanguage.value === 'javascript' || currentLanguage.value === 'typescript') {
      formatted = formatJavaScript(code)
    } else if (currentLanguage.value === 'json') {
      formatted = JSON.stringify(JSON.parse(code), null, 2)
    } else if (currentLanguage.value === 'html') {
      formatted = formatHTML(code)
    }

    editor.setValue(formatted)
    ElMessage.success('代码格式化成功')
    addLog('info', '代码已格式化')
  } catch (error: any) {
    ElMessage.error(`格式化失败: ${error.message}`)
    addLog('error', `格式化失败: ${error.message}`)
  }
}

function formatJavaScript(code: string): string {
  try {
    return code
      .replace(/\s*([{};,:])\s*/g, (match, p1) => p1)
      .replace(/(function|if|for|while|const|let|var)\s*\(/g, '$1 (')
      .replace(/\{/g, ' {\n')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n')
      .replace(/,\s*/g, ', ')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line)
      .join('\n')
  } catch {
    return code
  }
}

function formatHTML(code: string): string {
  return code
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .join('\n')
}

function runCode() {
  if (!editor) return

  const code = editor.getValue()
  clearConsole()

  if (currentLanguage.value === 'javascript' || currentLanguage.value === 'typescript') {
    runJavaScript(code)
  } else if (currentLanguage.value === 'html') {
    updatePreview()
    ElMessage.info('HTML 代码已在预览区运行')
    addLog('info', 'HTML 代码已加载到预览区')
  } else if (currentLanguage.value === 'json') {
    try {
      JSON.parse(code)
      ElMessage.success('JSON 格式正确')
      addLog('info', 'JSON 格式验证通过')
    } catch (error: any) {
      ElMessage.error(`JSON 格式错误: ${error.message}`)
      addLog('error', `JSON 格式错误: ${error.message}`)
    }
  } else {
    ElMessage.info(`当前语言 ${currentLanguage.value.toUpperCase()} 不支持在浏览器中运行`)
    addLog('warn', `${currentLanguage.value.toUpperCase()} 需要特定环境运行`)
  }
}

function runJavaScript(code: string) {
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  const logs: { type: ConsoleLog['type']; content: string }[] = []

  console.log = (...args) => {
    logs.push({ type: 'log', content: args.map((a) => String(a)).join(' ') })
  }
  console.error = (...args) => {
    logs.push({ type: 'error', content: args.map((a) => String(a)).join(' ') })
  }
  console.warn = (...args) => {
    logs.push({ type: 'warn', content: args.map((a) => String(a)).join(' ') })
  }
  console.info = (...args) => {
    logs.push({ type: 'info', content: args.map((a) => String(a)).join(' ') })
  }

  try {
    const result = new Function(code)()
    if (result !== undefined) {
      addLog('log', `返回值: ${String(result)}`)
    }

    logs.forEach((log) => addLog(log.type, log.content))

    ElMessage.success('代码执行成功')
  } catch (error: any) {
    addLog('error', `执行错误: ${error.message}`)
    ElMessage.error(`代码执行错误: ${error.message}`)
  } finally {
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
    console.info = originalInfo
  }
}

function updatePreview() {
  if (!previewFrame.value || !editor) return

  const code = editor.getValue()
  let htmlContent = ''

  if (currentLanguage.value === 'html') {
    htmlContent = code
  } else if (currentLanguage.value === 'javascript') {
    htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Microsoft YaHei', sans-serif;
            padding: 20px;
            background: #1a1a2e;
            color: #fff;
          }
          #output { white-space: pre-wrap; font-family: monospace; }
        </style>
      </head>
      <body>
        <div id="output"></div>
        <script>
          const output = document.getElementById('output');
          const originalLog = console.log;
          console.log = (...args) => {
            output.textContent += args.map(a => String(a)).join(' ') + '\\n';
            originalLog.apply(console, args);
          };
          try {
            ${code}
          } catch(e) {
            output.textContent += 'Error: ' + e.message;
          }
        <\\/script>
      </body>
      </html>
    `
  } else if (currentLanguage.value === 'css') {
    htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${code}</style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>CSS 预览示例</h1>
            <p>这是应用了自定义 CSS 的预览效果</p>
            <button class="btn-primary">按钮示例</button>
          </div>
        </div>
      </body>
      </html>
    `
  }

  previewFrame.value.srcdoc = htmlContent
}

function saveSnippet() {
  if (!editor) return

  snippetForm.value = {
    name: `片段 ${savedSnippets.value.length + 1}`,
    language: currentLanguage.value,
  }
  showSaveDialog.value = true
}

function confirmSaveSnippet() {
  if (!editor || !snippetForm.value.name) {
    ElMessage.warning('请输入片段名称')
    return
  }

  const snippet: CodeSnippet = {
    name: snippetForm.value.name,
    language: snippetForm.value.language,
    code: editor.getValue(),
    createdAt: new Date().toISOString(),
  }

  savedSnippets.value.push(snippet)
  localStorage.setItem('codeSnippets', JSON.stringify(savedSnippets.value))
  showSaveDialog.value = false
  ElMessage.success('代码片段已保存')
}

function loadSnippet(snippet: CodeSnippet) {
  if (!editor) return

  currentLanguage.value = snippet.language
  changeLanguage(snippet.language)
  nextTick(() => {
    editor!.setValue(snippet.code)
  })
  showSnippets.value = false
  ElMessage.success('已加载代码片段')
}

function deleteSnippet(index: number) {
  savedSnippets.value.splice(index, 1)
  localStorage.setItem('codeSnippets', JSON.stringify(savedSnippets.value))
  ElMessage.success('代码片段已删除')
}

function shareCode() {
  if (!editor) return

  const code = editor.getValue()
  const encodedCode = btoa(encodeURIComponent(code))
  const baseUrl = window.location.origin
  shareLink.value = `${baseUrl}?code=${encodedCode}&lang=${currentLanguage.value}`
  showShareDialog.value = true
}

function copyShareLink() {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

function loadSavedSnippets() {
  try {
    const saved = localStorage.getItem('codeSnippets')
    if (saved) {
      savedSnippets.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load snippets:', e)
  }
}

function handleResize() {
  editor?.layout()
}

onMounted(() => {
  initEditor()
  loadSavedSnippets()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  editor?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.code-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  overflow: hidden;
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
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
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

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow: hidden;
  min-height: 0;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  min-height: 200px;
}

.editor-header,
.preview-header,
.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.editor-label,
.preview-label,
.console-label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.language-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.editor-container {
  flex: 1;
  min-height: 0;
}

.preview-section {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  min-height: 150px;
  max-height: 300px;
}

.preview-container {
  flex: 1;
  min-height: 0;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.console-section {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  min-height: 80px;
  max-height: 150px;
}

.console-output {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.console-line {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.console-line.log .log-type { color: #4ade80; }
.console-line.error .log-type { color: #f87171; }
.console-line.warn .log-type { color: #fbbf24; }
.console-line.info .log-type { color: #60a5fa; }

.log-type {
  font-weight: bold;
  min-width: 50px;
}

.log-content {
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

.console-empty {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.snippets-drawer {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100%;
  background: #1e293b;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  transition: right 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.snippets-drawer.open {
  right: 0;
}

.snippets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.snippets-header h3 {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.snippets-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.snippet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.snippet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snippet-name {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.snippet-lang {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.snippet-actions {
  display: flex;
  gap: 8px;
}

.snippets-empty {
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px;
}

.share-content {
  padding: 10px 0;
}

.share-description {
  margin-bottom: 16px;
  color: #606266;
}

@media (max-width: 768px) {
  .code-editor-container {
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

  .snippets-drawer {
    width: 100%;
    right: -100%;
  }

  .control-group {
    flex-wrap: wrap;
  }
}
</style>
