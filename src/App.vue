<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { WalletCard, WalletCardDraft, WalletCardType } from './types'
import { deleteWalletCard, listWalletCards, saveWalletCard } from './services/walletStore'

const cards = ref<WalletCard[]>([])
const loading = ref(true)
const saving = ref(false)
const selectedCardId = ref<string | null>(null)
const editorOpen = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const errorMessage = ref('')
const swipeOffset = ref(0)

const draft = reactive<WalletCardDraft>({
  type: 'image',
  title: '',
  content: '',
  note: '',
})

const touchState = reactive({
  startX: 0,
  deltaX: 0,
})

const selectedIndex = computed(() => cards.value.findIndex((card) => card.id === selectedCardId.value))
const selectedCard = computed(() => cards.value[selectedIndex.value] ?? null)
const canShowPrevious = computed(() => selectedIndex.value > 0)
const canShowNext = computed(() => selectedIndex.value >= 0 && selectedIndex.value < cards.value.length - 1)
const isImageDraft = computed(() => draft.type === 'image')
const heroCount = computed(() => `${cards.value.length}`.padStart(2, '0'))

onMounted(async () => {
  await refreshCards()
})

async function refreshCards() {
  loading.value = true
  errorMessage.value = ''

  try {
    cards.value = await listWalletCards()
    if (selectedCardId.value && !cards.value.some((card) => card.id === selectedCardId.value)) {
      selectedCardId.value = cards.value[0]?.id ?? null
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取钱包失败'
  } finally {
    loading.value = false
  }
}

function createEmptyDraft(type: WalletCardType = 'image') {
  draft.type = type
  draft.title = ''
  draft.content = ''
  draft.note = ''
}

function openCreateEditor(type: WalletCardType = 'image') {
  editorMode.value = 'create'
  createEmptyDraft(type)
  editorOpen.value = true
}

function openEditEditor(card: WalletCard) {
  editorMode.value = 'edit'
  draft.type = card.type
  draft.title = card.title
  draft.content = card.content
  draft.note = card.note
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  createEmptyDraft(draft.type)
}

function openCard(id: string) {
  selectedCardId.value = id
}

function closeDetail() {
  selectedCardId.value = null
  swipeOffset.value = 0
}

async function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  draft.content = await fileToDataUrl(file)
  if (!draft.title.trim()) {
    draft.title = file.name.replace(/\.[^.]+$/, '')
  }
  input.value = ''
}

async function saveCard() {
  if (!draft.title.trim()) {
    errorMessage.value = '请先填写卡片名称'
    return
  }

  if (!draft.content.trim()) {
    errorMessage.value = draft.type === 'image' ? '请先选择图片或拍照' : '请先填写卡片内容'
    return
  }

  saving.value = true
  errorMessage.value = ''

  const now = new Date().toISOString()
  const currentCard = selectedCard.value
  const nextCard: WalletCard = {
    id: editorMode.value === 'edit' && currentCard ? currentCard.id : crypto.randomUUID(),
    type: draft.type,
    title: draft.title.trim(),
    content: draft.content.trim(),
    note: draft.note.trim(),
    createdAt: editorMode.value === 'edit' && currentCard ? currentCard.createdAt : now,
    updatedAt: now,
  }

  try {
    await saveWalletCard(nextCard)
    await refreshCards()
    selectedCardId.value = nextCard.id
    closeEditor()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeSelectedCard() {
  if (!selectedCard.value) {
    return
  }

  const confirmed = window.confirm(`确定删除“${selectedCard.value.title}”吗？删除后不会保留副本。`)
  if (!confirmed) {
    return
  }

  const currentIndex = selectedIndex.value
  const nextId = cards.value[currentIndex + 1]?.id ?? cards.value[currentIndex - 1]?.id ?? null

  try {
    await deleteWalletCard(selectedCard.value.id)
    await refreshCards()
    selectedCardId.value = nextId
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败'
  }
}

function showPreviousCard() {
  if (!canShowPrevious.value) {
    return
  }
  selectedCardId.value = cards.value[selectedIndex.value - 1].id
  swipeOffset.value = 0
}

function showNextCard() {
  if (!canShowNext.value) {
    return
  }
  selectedCardId.value = cards.value[selectedIndex.value + 1].id
  swipeOffset.value = 0
}

function onTouchStart(event: TouchEvent) {
  touchState.startX = event.touches[0]?.clientX ?? 0
  touchState.deltaX = 0
}

function onTouchMove(event: TouchEvent) {
  if (!touchState.startX) {
    return
  }
  touchState.deltaX = (event.touches[0]?.clientX ?? 0) - touchState.startX
  swipeOffset.value = Math.max(-96, Math.min(96, touchState.deltaX))
}

function onTouchEnd() {
  const threshold = 72
  if (touchState.deltaX <= -threshold) {
    showNextCard()
  } else if (touchState.deltaX >= threshold) {
    showPreviousCard()
  }

  touchState.startX = 0
  touchState.deltaX = 0
  swipeOffset.value = 0
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function previewText(card: WalletCard) {
  if (card.type === 'image') {
    return card.note || '图片卡片'
  }

  return card.content.length > 46 ? `${card.content.slice(0, 46)}...` : card.content
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <div class="wallet-shell">
    <header class="hero-band">
      <div class="hero-copy">
        <p class="eyebrow">Private Wallet</p>
        <h1>个人钱包</h1>
        <p class="hero-summary">把二维码、证件照片和常用文字放进一个能装到 iPhone 主屏幕的小卡包里。</p>
      </div>
      <div class="hero-meta">
        <span class="hero-count">{{ heroCount }} 张卡片</span>
        <button class="primary-pill" type="button" @click="openCreateEditor()">新增卡片</button>
      </div>
    </header>

    <section class="gallery-band">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Wallet</p>
          <h2>全部卡片</h2>
        </div>
        <button class="secondary-pill" type="button" @click="openCreateEditor('text')">添加文字卡</button>
      </div>

      <p v-if="errorMessage" class="status-line">{{ errorMessage }}</p>

      <div v-if="loading" class="empty-state">
        <h3>正在读取钱包</h3>
        <p>本地卡片会离线保存在当前设备上。</p>
      </div>

      <div v-else-if="cards.length === 0" class="empty-state">
        <h3>先放进第一张卡片</h3>
        <p>可以上传微信二维码、拍一张证件照，或者存一条自己常用的文字信息。</p>
        <div class="empty-actions">
          <button class="primary-pill" type="button" @click="openCreateEditor('image')">添加图片卡</button>
          <button class="secondary-pill" type="button" @click="openCreateEditor('text')">添加文字卡</button>
        </div>
      </div>

      <div v-else class="wallet-list">
        <article
          v-for="card in cards"
          :key="card.id"
          class="wallet-item"
          :class="{ dark: card.type === 'image' }"
          @click="openCard(card.id)"
        >
          <div class="item-cover">
            <img v-if="card.type === 'image'" :src="card.content" :alt="card.title" />
            <div v-else class="text-preview">
              <p>{{ card.content }}</p>
            </div>
          </div>
          <div class="item-body">
            <div class="item-header">
              <strong>{{ card.title }}</strong>
              <span>{{ card.type === 'image' ? '图片卡' : '文字卡' }}</span>
            </div>
            <p>{{ previewText(card) }}</p>
            <small>{{ formatDate(card.updatedAt) }}</small>
          </div>
        </article>
      </div>
    </section>

    <button class="floating-create" type="button" aria-label="新增卡片" @click="openCreateEditor('image')">+</button>

    <div v-if="editorOpen" class="overlay" @click.self="closeEditor">
      <section class="sheet">
        <div class="sheet-head">
          <div>
            <p class="eyebrow">{{ editorMode === 'create' ? 'Create' : 'Edit' }}</p>
            <h2>{{ editorMode === 'create' ? '新增卡片' : '编辑卡片' }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="关闭" @click="closeEditor">×</button>
        </div>

        <div class="segment-row">
          <button
            type="button"
            class="segment-button"
            :class="{ active: draft.type === 'image' }"
            @click="draft.type = 'image'"
          >
            图片卡片
          </button>
          <button
            type="button"
            class="segment-button"
            :class="{ active: draft.type === 'text' }"
            @click="draft.type = 'text'"
          >
            文字卡片
          </button>
        </div>

        <label class="field">
          <span>卡片名称</span>
          <input v-model="draft.title" type="text" maxlength="40" placeholder="例如：微信收款码" />
        </label>

        <template v-if="isImageDraft">
          <div class="upload-panel">
            <div v-if="draft.content" class="image-preview">
              <img :src="draft.content" alt="卡片预览" />
            </div>
            <div v-else class="image-placeholder">
              <p>上传相册图片，或直接拍一张。</p>
            </div>

            <div class="upload-actions">
              <label class="secondary-pill upload-trigger">
                选择图片
                <input type="file" accept="image/*" @change="onPickImage" />
              </label>
              <label class="secondary-pill upload-trigger">
                拍照
                <input type="file" accept="image/*" capture="environment" @change="onPickImage" />
              </label>
            </div>
          </div>
        </template>

        <template v-else>
          <label class="field">
            <span>文字内容</span>
            <textarea v-model="draft.content" rows="7" maxlength="1200" placeholder="例如：会员号、住址、紧急联系人信息"></textarea>
          </label>
        </template>

        <label class="field">
          <span>备注</span>
          <textarea v-model="draft.note" rows="3" maxlength="240" placeholder="可选，用来记录使用场景或提醒"></textarea>
        </label>

        <div class="sheet-actions">
          <button class="secondary-pill" type="button" @click="closeEditor">取消</button>
          <button class="primary-pill" type="button" :disabled="saving" @click="saveCard">
            {{ saving ? '保存中...' : '保存卡片' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="selectedCard" class="overlay detail-overlay" @click.self="closeDetail">
      <section class="detail-stage">
        <div class="detail-topbar">
          <button class="icon-button" type="button" aria-label="返回" @click="closeDetail">‹</button>
          <div class="detail-index">{{ selectedIndex + 1 }} / {{ cards.length }}</div>
          <button class="icon-button" type="button" aria-label="编辑" @click="openEditEditor(selectedCard)">✎</button>
        </div>

        <div class="detail-viewport">
          <button class="nav-hit left" type="button" :disabled="!canShowPrevious" @click="showPreviousCard" />
          <article
            class="detail-card"
            :class="{ dark: selectedCard.type === 'image' }"
            :style="{ transform: `translateX(${swipeOffset}px)` }"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
          >
            <div class="detail-card-head">
              <p class="eyebrow">{{ selectedCard.type === 'image' ? 'Image Card' : 'Text Card' }}</p>
              <h2>{{ selectedCard.title }}</h2>
            </div>

            <div class="detail-body">
              <img v-if="selectedCard.type === 'image'" :src="selectedCard.content" :alt="selectedCard.title" class="detail-image" />
              <div v-else class="detail-text">
                <p>{{ selectedCard.content }}</p>
              </div>
            </div>

            <div class="detail-footer">
              <p v-if="selectedCard.note">{{ selectedCard.note }}</p>
              <small>更新于 {{ formatDate(selectedCard.updatedAt) }}</small>
            </div>
          </article>
          <button class="nav-hit right" type="button" :disabled="!canShowNext" @click="showNextCard" />
        </div>

        <div class="detail-actions">
          <button class="secondary-pill" type="button" @click="openEditEditor(selectedCard)">编辑</button>
          <button class="danger-utility" type="button" @click="removeSelectedCard">删除</button>
        </div>
      </section>
    </div>
  </div>
</template>
