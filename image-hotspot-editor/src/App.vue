<template>
  <div class="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="header-left">
          <h1>🎯 Dynamic Area</h1>
          <span class="badge">图片热区编辑器</span>
        </div>
        <div class="header-actions">
          <a-button @click="importJson">
            <template #icon><icon-upload /></template>
            导入 JSON
          </a-button>
          <a-button type="primary" @click="exportHtml" :disabled="images.length === 0">
            <template #icon><icon-download /></template>
            导出成品 HTML
          </a-button>
          <input ref="importInputRef" type="file" accept=".json" style="display:none" @change="handleImportFile" />
        </div>
      </div>
    </header>

    <div class="main-layout">
      <!-- 左侧：图片列表 + 画布 -->
      <div class="left-pane">
        <!-- 图片标签栏 -->
        <div class="tab-bar">
          <div
            v-for="(img, idx) in images"
            :key="img.id"
            class="tab-item"
            :class="{ active: activeIndex === idx }"
            @click="switchImage(idx)"
          >
            <span class="tab-name">图片{{ idx + 1 }}</span>
            <span v-if="img.areaList?.length" class="tab-count">{{ img.areaList.length }}</span>
            <span class="tab-close" @click.stop="removeImage(idx)">×</span>
          </div>
          <div class="tab-add" @click="addImage">
            <icon-plus />
          </div>
        </div>

        <!-- 画布区域 -->
        <div class="canvas-area">
          <div v-if="!activeImage?.imgUrl" class="empty-canvas">
            <div class="empty-inner">
              <div class="empty-icon">🖼️</div>
              <div class="empty-text">上传底图开始编辑</div>
              <a-button type="primary" size="large" @click="triggerUpload">
                <template #icon><icon-upload /></template>
                选择图片
              </a-button>
              <input ref="uploadInputRef" type="file" accept="image/*" style="display:none" @change="handleUploadFile" />
            </div>
          </div>

          <template v-else>
            <!-- 画布操作栏 -->
            <div class="canvas-toolbar">
              <a-button size="small" type="primary" @click="addArea">
                <template #icon><icon-plus /></template>
                添加热区
              </a-button>
              <a-button size="small" @click="replaceImage">
                <template #icon><icon-edit /></template>
                替换图片
              </a-button>
              <span class="canvas-tip">💡 拖拽移动热区，四角控制点缩放，右侧配置链接</span>
              <input ref="replaceInputRef" type="file" accept="image/*" style="display:none" @change="handleReplaceFile" />
            </div>

            <div class="img-wrap" ref="imgWrapRef">
              <img ref="bgImgRef" :src="activeImage.imgUrl" alt="" @load="onImgLoad" draggable="false" />
              <div
                v-for="(item, index) in activeImage.areaList"
                :key="index"
                class="area-item"
                :class="{ active: currentActiveIndex === index }"
                :style="getAreaStyle(item)"
                @click="selectArea(index)"
              >
                <div class="area-label">链接{{ index + 1 }}</div>
                <div class="active-box" @mousedown.stop="handleMoveStart($event, index)">
                  <div class="corner top-left" @mousedown.stop="handleResizeStart($event, index, 'top-left')"></div>
                  <div class="corner top-right" @mousedown.stop="handleResizeStart($event, index, 'top-right')"></div>
                  <div class="corner bottom-left" @mousedown.stop="handleResizeStart($event, index, 'bottom-left')"></div>
                  <div class="corner bottom-right" @mousedown.stop="handleResizeStart($event, index, 'bottom-right')"></div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧：热区列表 -->
      <div class="right-pane">
        <div class="pane-header">
          <span class="pane-title">热区列表</span>
          <span class="pane-count">{{ activeImage?.areaList?.length || 0 }} / {{ MAX_AREA }}</span>
        </div>

        <div class="area-list" v-if="activeImage?.imgUrl">
          <div
            v-for="(item, index) in activeImage.areaList"
            :key="index"
            class="area-row"
            :class="{ active: currentActiveIndex === index }"
            @click="selectArea(index)"
          >
            <div class="area-row-header">
              <span class="area-index">链接{{ index + 1 }}</span>
              <span class="area-delete" @click.stop="deleteArea(index)">删除</span>
            </div>
            <a-input
              v-model="item.link"
              placeholder="请输入跳转链接"
              size="small"
              class="area-link-input"
              @click.stop
              @input.stop
            />
            <div class="area-coord">
              x:{{ Math.round(item.x) }} · y:{{ Math.round(item.y) }} · w:{{ Math.round(item.w) }} · h:{{ Math.round(item.h) }}
            </div>
          </div>

          <a-button
            v-if="(activeImage.areaList?.length || 0) < MAX_AREA"
            class="add-area-btn"
            long
            @click="addArea"
          >
            <template #icon><icon-plus /></template>
            添加热区
          </a-button>
        </div>

        <div v-else class="empty-right">
          <div class="empty-right-icon">📋</div>
          <div class="empty-right-text">请先上传底图</div>
        </div>

        <!-- JSON 预览 -->
        <div class="json-section">
          <div class="json-header">
            <span>当前数据</span>
            <a-button type="text" size="mini" @click="copyJson">复制</a-button>
          </div>
          <pre class="json-view">{{ currentJson }}</pre>
        </div>
      </div>
    </div>

    <!-- 导出设置弹窗 -->
    <a-modal
      v-model:visible="exportVisible"
      title="导出成品设置"
      :footer="false"
      :mask-closable="false"
      width="480px"
    >
      <div class="export-form">
        <div class="form-item">
          <label>页面标题</label>
          <a-input v-model="exportTitle" placeholder="热区成品页" />
        </div>
        <div class="form-item">
          <label>图片模式</label>
          <div class="option-cards">
            <div
              class="option-card"
              :class="{ active: exportImgMode === 'external' }"
              @click="exportImgMode = 'external'"
            >
              <div class="option-card-icon">🌐</div>
              <div class="option-card-text">
                <div class="option-card-title">外链图片</div>
                <div class="option-card-desc">文件体积小</div>
              </div>
              <div v-if="exportImgMode === 'external'" class="option-card-check">✓</div>
            </div>
            <div
              class="option-card"
              :class="{ active: exportImgMode === 'base64' }"
              @click="exportImgMode = 'base64'"
            >
              <div class="option-card-icon">📦</div>
              <div class="option-card-text">
                <div class="option-card-title">Base64 内嵌</div>
                <div class="option-card-desc">完全离线可用</div>
              </div>
              <div v-if="exportImgMode === 'base64'" class="option-card-check">✓</div>
            </div>
          </div>
        </div>
        <div class="form-item">
          <label>热区样式</label>
          <div class="option-cards">
            <div
              class="option-card"
              :class="{ active: exportAreaStyle === 'hidden' }"
              @click="exportAreaStyle = 'hidden'"
            >
              <div class="option-card-icon">👻</div>
              <div class="option-card-text">
                <div class="option-card-title">隐藏边框</div>
                <div class="option-card-desc">仅点击区域</div>
              </div>
              <div v-if="exportAreaStyle === 'hidden'" class="option-card-check">✓</div>
            </div>
            <div
              class="option-card"
              :class="{ active: exportAreaStyle === 'border' }"
              @click="exportAreaStyle = 'border'"
            >
              <div class="option-card-icon">🟦</div>
              <div class="option-card-text">
                <div class="option-card-title">显示边框</div>
                <div class="option-card-desc">虚线边框可见</div>
              </div>
              <div v-if="exportAreaStyle === 'border'" class="option-card-check">✓</div>
            </div>
          </div>
        </div>
        <div class="form-item">
          <label>布局方式</label>
          <div class="option-cards">
            <div
              class="option-card"
              :class="{ active: exportLayout === 'vertical' }"
              @click="exportLayout = 'vertical'"
            >
              <div class="option-card-icon">📱</div>
              <div class="option-card-text">
                <div class="option-card-title">垂直排列</div>
                <div class="option-card-desc">上下堆叠</div>
              </div>
              <div v-if="exportLayout === 'vertical'" class="option-card-check">✓</div>
            </div>
            <div
              class="option-card"
              :class="{ active: exportLayout === 'horizontal' }"
              @click="exportLayout = 'horizontal'"
            >
              <div class="option-card-icon">🖼️</div>
              <div class="option-card-text">
                <div class="option-card-title">水平排列</div>
                <div class="option-card-desc">左右并排</div>
              </div>
              <div v-if="exportLayout === 'horizontal'" class="option-card-check">✓</div>
            </div>
          </div>
        </div>
      </div>
      <div class="export-footer">
        <a-button @click="exportVisible = false">取消</a-button>
        <a-button type="primary" @click="doExport">导出下载</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { Message } from '@arco-design/web-vue';
import { IconPlus, IconUpload, IconDownload, IconEdit } from '@arco-design/web-vue/es/icon';
import { exportToHtml } from './utils/exportHtml.js';

const MAX_AREA = 10;

// ---- 数据模型 ----
// image: { id, imgUrl, imgWidth, imgHeight, areaList: [{x, y, w, h, link}] }
let idCounter = 1;
const genId = () => `img_${Date.now()}_${idCounter++}`;

const images = ref([
  {
    id: genId(),
    imgUrl: '',
    imgWidth: 750,
    imgHeight: 0,
    areaList: []
  }
]);
const activeIndex = ref(0);
const activeImage = computed(() => images.value[activeIndex.value]);

const currentJson = computed(() => JSON.stringify(activeImage.value || {}, null, 2));

// ---- 拖拽状态 ----
const dragIndex = ref(-1);
const dragType = ref('move'); // 'move' | 'top-left' | ...
let startX = 0, startY = 0;
let startArea = { x: 0, y: 0, w: 0, h: 0 };

const currentActiveIndex = ref(0);

// ---- DOM refs ----
const bgImgRef = ref(null);
const imgWrapRef = ref(null);
const importInputRef = ref(null);
const replaceInputRef = ref(null);
const uploadInputRef = ref(null);

// 渲染尺寸（用于坐标换算）
let renderW = 0, renderH = 0;

const getScale = () => {
  if (!activeImage.value?.imgWidth || !renderW) return 1;
  return activeImage.value.imgWidth / renderW;
};

// ---- 图片管理 ----
const addImage = () => {
  images.value.push({
    id: genId(),
    imgUrl: '',
    imgWidth: 750,
    imgHeight: 0,
    areaList: []
  });
  activeIndex.value = images.value.length - 1;
  currentActiveIndex.value = 0;
};

const removeImage = (idx) => {
  if (images.value.length <= 1) {
    Message.warning('至少保留一张图片');
    return;
  }
  images.value.splice(idx, 1);
  if (activeIndex.value >= images.value.length) {
    activeIndex.value = images.value.length - 1;
  }
  currentActiveIndex.value = 0;
};

const switchImage = (idx) => {
  if (idx === activeIndex.value) return;
  activeIndex.value = idx;
  currentActiveIndex.value = 0;
  nextTick(() => {
    if (bgImgRef.value && activeImage.value?.imgUrl) {
      measureImg();
    }
  });
};

// ---- 上传 ----
const triggerUpload = () => {
  uploadInputRef.value?.click();
};

const handleUploadFile = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  loadImageFile(file);
  e.target.value = '';
};

const loadImageFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target.result;
    const img = new Image();
    img.onload = () => {
      activeImage.value.imgUrl = url;
      activeImage.value.imgWidth = img.naturalWidth;
      activeImage.value.imgHeight = img.naturalHeight;
      nextTick(() => measureImg());
    };
    img.src = url;
  };
  reader.readAsDataURL(file);
};

const replaceImage = () => {
  replaceInputRef.value?.click();
};

const handleReplaceFile = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // 替换图片时清空热区
  activeImage.value.areaList = [];
  currentActiveIndex.value = 0;
  loadImageFile(file);
  e.target.value = '';
};

const onImgLoad = () => {
  measureImg();
};

const measureImg = () => {
  if (bgImgRef.value) {
    renderW = bgImgRef.value.offsetWidth;
    renderH = bgImgRef.value.offsetHeight;
  }
};

// ---- 热区操作 ----
const defaultArea = () => ({ x: 50, y: 50, w: 100, h: 60, link: '' });

const addArea = () => {
  if (!activeImage.value) return;
  if ((activeImage.value.areaList?.length || 0) >= MAX_AREA) {
    Message.warning(`最多添加 ${MAX_AREA} 个热区`);
    return;
  }
  activeImage.value.areaList = activeImage.value.areaList || [];
  activeImage.value.areaList.push(defaultArea());
  currentActiveIndex.value = activeImage.value.areaList.length - 1;
};

const deleteArea = (index) => {
  if (!activeImage.value?.areaList) return;
  activeImage.value.areaList.splice(index, 1);
  if (currentActiveIndex.value >= activeImage.value.areaList.length) {
    currentActiveIndex.value = Math.max(0, activeImage.value.areaList.length - 1);
  }
};

const selectArea = (index) => {
  if (dragIndex.value >= 0) return;
  currentActiveIndex.value = index;
};

const getAreaStyle = (item) => {
  const scale = getScale();
  return {
    left: `${item.x / scale}px`,
    top: `${item.y / scale}px`,
    width: `${item.w / scale}px`,
    height: `${item.h / scale}px`
  };
};

// ---- 拖拽移动 ----
const handleMoveStart = (e, index) => {
  const item = activeImage.value.areaList[index];
  if (!item) return;
  dragIndex.value = index;
  dragType.value = 'move';
  currentActiveIndex.value = index;
  startX = e.clientX;
  startY = e.clientY;
  startArea = { x: item.x, y: item.y, w: item.w, h: item.h };
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleDragEnd);
};

const handleMove = (e) => {
  if (dragIndex.value < 0) return;
  const scale = getScale();
  const diffX = (e.clientX - startX) * scale;
  const diffY = (e.clientY - startY) * scale;
  let newX = startArea.x + diffX;
  let newY = startArea.y + diffY;
  const maxX = (activeImage.value.imgWidth || 750) - startArea.w;
  const maxY = (activeImage.value.imgHeight || 400) - startArea.h;
  newX = Math.max(0, Math.min(newX, maxX));
  newY = Math.max(0, Math.min(newY, maxY));
  const item = activeImage.value.areaList[dragIndex.value];
  if (item) {
    item.x = newX;
    item.y = newY;
  }
};

// ---- 四角缩放 ----
const handleResizeStart = (e, index, type) => {
  const item = activeImage.value.areaList[index];
  if (!item) return;
  dragIndex.value = index;
  dragType.value = type;
  currentActiveIndex.value = index;
  startX = e.clientX;
  startY = e.clientY;
  startArea = { x: item.x, y: item.y, w: item.w, h: item.h };
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', handleDragEnd);
};

const handleResize = (e) => {
  if (dragIndex.value < 0) return;
  const scale = getScale();
  const diffX = (e.clientX - startX) * scale;
  const diffY = (e.clientY - startY) * scale;
  const imgW = activeImage.value.imgWidth || 750;
  const imgH = activeImage.value.imgHeight || 400;
  let { x, y, w, h } = startArea;
  const type = dragType.value;

  if (type === 'top-left') {
    let nx = x + diffX, ny = y + diffY;
    let nw = w - diffX, nh = h - diffY;
    if (nx < 0) { nx = 0; nw = x + w; }
    if (ny < 0) { ny = 0; nh = y + h; }
    if (nw < 20) { nw = 20; nx = x + w - 20; }
    if (nh < 20) { nh = 20; ny = y + h - 20; }
    x = nx; y = ny; w = nw; h = nh;
  } else if (type === 'top-right') {
    let ny = y + diffY;
    let nw = w + diffX, nh = h - diffY;
    if (nw > imgW - x) nw = imgW - x;
    if (nw < 20) nw = 20;
    if (ny < 0) { ny = 0; nh = y + h; }
    if (nh < 20) { nh = 20; ny = y + h - 20; }
    y = ny; w = nw; h = nh;
  } else if (type === 'bottom-left') {
    let nx = x + diffX;
    let nw = w - diffX, nh = h + diffY;
    if (nx < 0) { nx = 0; nw = x + w; }
    if (nw < 20) { nw = 20; nx = x + w - 20; }
    if (nh > imgH - y) nh = imgH - y;
    if (nh < 20) nh = 20;
    x = nx; w = nw; h = nh;
  } else if (type === 'bottom-right') {
    let nw = w + diffX, nh = h + diffY;
    if (nw > imgW - x) nw = imgW - x;
    if (nh > imgH - y) nh = imgH - y;
    if (nw < 20) nw = 20;
    if (nh < 20) nh = 20;
    w = nw; h = nh;
  }

  const item = activeImage.value.areaList[dragIndex.value];
  if (item) {
    item.x = x; item.y = y; item.w = w; item.h = h;
  }
};

const handleDragEnd = () => {
  dragIndex.value = -1;
  document.removeEventListener('mousemove', handleMove);
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', handleDragEnd);
};

// ---- JSON ----
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(images.value, null, 2));
    Message.success('已复制到剪贴板');
  } catch {
    Message.error('复制失败');
  }
};

const importJson = () => {
  importInputRef.value?.click();
};

const handleImportFile = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        images.value = data.map((d) => ({
          id: genId(),
          imgUrl: d.imgUrl || '',
          imgWidth: d.imgWidth || 750,
          imgHeight: d.imgHeight || 0,
          areaList: d.areaList || []
        }));
        activeIndex.value = 0;
        currentActiveIndex.value = 0;
        Message.success(`导入成功，共 ${images.value.length} 张图`);
      } else if (data.imgUrl !== undefined) {
        // 单张图数据
        images.value = [{
          id: genId(),
          imgUrl: data.imgUrl || '',
          imgWidth: data.imgWidth || 750,
          imgHeight: data.imgHeight || 0,
          areaList: data.areaList || []
        }];
        activeIndex.value = 0;
        currentActiveIndex.value = 0;
        Message.success('导入成功');
      } else {
        Message.error('JSON 格式不支持');
      }
    } catch {
      Message.error('JSON 解析失败');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

// ---- 导出 ----
const exportVisible = ref(false);
const exportTitle = ref('热区成品页');
const exportImgMode = ref('external'); // 'external' | 'base64'
const exportAreaStyle = ref('hidden'); // 'hidden' | 'border'
const exportLayout = ref('vertical'); // 'vertical' | 'horizontal'

const exportHtml = () => {
  const valid = images.value.filter((i) => i.imgUrl);
  if (valid.length === 0) {
    Message.warning('请先上传至少一张图片');
    return;
  }
  exportVisible.value = true;
};

const doExport = async () => {
  try {
    await exportToHtml({
      images: images.value,
      title: exportTitle.value,
      imgMode: exportImgMode.value,
      areaStyle: exportAreaStyle.value,
      layout: exportLayout.value
    });
    Message.success('导出成功');
    exportVisible.value = false;
  } catch (err) {
    Message.error('导出失败：' + err.message);
  }
};
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

/* Header */
.app-header {
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  padding: 0 24px;
  flex-shrink: 0;
}

.header-inner {
  max-width: 1600px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0;
}

.badge {
  font-size: 12px;
  color: #165dff;
  background: rgba(22, 93, 255, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Main Layout */
.main-layout {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  min-height: 0;
}

.left-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.right-pane {
  width: 340px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  flex-wrap: wrap;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f2f3f5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #4e5969;
  border: 1px solid transparent;
  transition: all 0.15s;
  user-select: none;
}

.tab-item:hover {
  background: #e5e6eb;
}

.tab-item.active {
  background: rgba(22, 93, 255, 0.1);
  color: #165dff;
  border-color: rgba(22, 93, 255, 0.3);
}

.tab-name {
  font-weight: 500;
}

.tab-count {
  background: #fff;
  color: #165dff;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 8px;
  font-weight: 600;
}

.tab-close {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: #86909c;
}

.tab-close:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.tab-add {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f3f5;
  border-radius: 6px;
  cursor: pointer;
  color: #4e5969;
  font-size: 16px;
  transition: all 0.15s;
}

.tab-add:hover {
  background: #e5e6eb;
  color: #165dff;
}

/* Canvas */
.canvas-area {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: auto;
  min-height: 400px;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f2f3f5;
  flex-wrap: wrap;
}

.canvas-tip {
  margin-left: auto;
  font-size: 12px;
  color: #86909c;
}

.empty-canvas {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.empty-inner {
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #86909c;
  margin-bottom: 20px;
}

.img-wrap {
  position: relative;
  max-width: 100%;
  user-select: none;
  align-self: center;
}

.img-wrap > img {
  max-width: 100%;
  display: block;
  -webkit-user-drag: none;
}

.area-item {
  position: absolute;
  border: 2px solid #165dff;
  background: rgba(22, 93, 255, 0.15);
  cursor: move;
  box-sizing: border-box;
}

.area-item.active {
  border-color: #ff7d00;
  background: rgba(255, 125, 0, 0.15);
  z-index: 10;
}

.area-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 0 4px;
  border-radius: 2px;
}

.active-box {
  width: 100%;
  height: 100%;
  position: relative;
}

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 2px solid #165dff;
  border-radius: 50%;
  z-index: 2;
}

.area-item.active .corner {
  border-color: #ff7d00;
}

.corner.top-left    { top: -6px; left: -6px; cursor: nw-resize; }
.corner.top-right   { top: -6px; right: -6px; cursor: ne-resize; }
.corner.bottom-left { bottom: -6px; left: -6px; cursor: sw-resize; }
.corner.bottom-right{ bottom: -6px; right: -6px; cursor: se-resize; }

/* Right Pane */
.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pane-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.pane-count {
  font-size: 12px;
  color: #86909c;
  font-family: monospace;
}

.area-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

.area-row {
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.area-row:hover {
  border-color: #165dff;
  background: rgba(22, 93, 255, 0.03);
}

.area-row.active {
  border-color: #ff7d00;
  background: #fff7e8;
}

.area-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.area-index {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

.area-delete {
  font-size: 12px;
  color: #ff4d4f;
  cursor: pointer;
}

.area-delete:hover {
  text-decoration: underline;
}

.area-link-input {
  width: 100%;
  margin-bottom: 6px;
}

.area-coord {
  font-size: 11px;
  color: #86909c;
  font-family: 'SF Mono', monospace;
}

.add-area-btn {
  margin-top: 4px;
}

.empty-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c9cdd4;
}

.empty-right-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-right-text {
  font-size: 13px;
}

/* JSON Section */
.json-section {
  border-top: 1px solid #f2f3f5;
  padding-top: 12px;
}

.json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
}

.json-view {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
  max-height: 200px;
  overflow: auto;
  margin: 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Export Modal */
.export-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item label {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

.option-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f7f8fa;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.option-card:hover {
  background: #f2f3f5;
  border-color: #e5e6eb;
}

.option-card.active {
  background: rgba(22, 93, 255, 0.06);
  border-color: #165dff;
}

.option-card-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.option-card-text {
  flex: 1;
  min-width: 0;
}

.option-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 2px;
}

.option-card-desc {
  font-size: 11px;
  color: #86909c;
}

.option-card-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #165dff;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.export-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f2f3f5;
}
</style>
