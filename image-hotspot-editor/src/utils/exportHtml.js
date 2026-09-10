/**
 * 热区成品页 HTML 导出器
 * 将配置数据 + 运行时代码打包为单文件 HTML
 */

/**
 * 运行时 CSS（成品页样式）
 */
const RUNTIME_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: transparent;
  min-height: 100vh;
}
.container {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}
.container.horizontal {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
  gap: 12px;
  padding: 12px;
}
.img-card {
  position: relative;
  width: 100%;
  display: block;
  line-height: 0;
}
.img-card img {
  width: 100%;
  display: block;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}
.area {
  position: absolute;
  cursor: pointer;
}
.area.show-border {
  border: 1px dashed #ff6b35;
  background: rgba(255, 107, 53, 0.1);
}
.area.show-border:hover {
  background: rgba(255, 107, 53, 0.25);
  border-style: solid;
}
/* 移动端 */
@media (max-width: 750px) {
  .container { max-width: 100%; }
}
`;

/**
 * 运行时 JS（成品页逻辑）
 * 用 IIFE 包裹，读取 window.__DYNAMIC_AREA_DATA__ 进行渲染
 */
const RUNTIME_JS = `
(function() {
  var data = window.__DYNAMIC_AREA_DATA__;
  if (!data || !data.images || !data.images.length) {
    document.body.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">暂无数据</p>';
    return;
  }

  var container = document.createElement('div');
  container.className = 'container' + (data.layout === 'horizontal' ? ' horizontal' : '');
  document.body.appendChild(container);

  // 渲染每张图
  data.images.forEach(function(imgData) {
    if (!imgData.imgUrl) return;

    var card = document.createElement('div');
    card.className = 'img-card';

    var img = document.createElement('img');
    img.src = imgData.imgUrl;
    img.alt = '';
    card.appendChild(img);

    // 热区层
    var areaList = imgData.areaList || [];
    var areaElements = [];

    // 图片加载后计算热区位置
    function updateAreas() {
      var renderW = card.offsetWidth;
      var imgW = imgData.imgWidth || renderW;
      var imgH = imgData.imgHeight || (img.naturalHeight || 0);
      var scale = imgW ? renderW / imgW : 1;

      areaElements.forEach(function(areaEl, i) {
        var area = areaList[i];
        if (!area) return;
        areaEl.style.left = (area.x * scale) + 'px';
        areaEl.style.top = (area.y * scale) + 'px';
        areaEl.style.width = (area.w * scale) + 'px';
        areaEl.style.height = (area.h * scale) + 'px';
      });
    }

    areaList.forEach(function(area) {
      var areaEl = document.createElement('a');
      areaEl.className = 'area' + (data.areaStyle === 'border' ? ' show-border' : '');
      if (area.link) {
        areaEl.href = area.link;
        areaEl.target = '_blank';
        areaEl.rel = 'noopener noreferrer';
      }
      areaEl.addEventListener('click', function(e) {
        if (!area.link) e.preventDefault();
      });
      card.appendChild(areaEl);
      areaElements.push(areaEl);
    });

    img.addEventListener('load', updateAreas);
    window.addEventListener('resize', updateAreas);
    // 图片已缓存时立即更新
    if (img.complete && img.naturalWidth) {
      updateAreas();
    }

    container.appendChild(card);
  });
})();
`;

/**
 * 将图片 URL 转为 base64
 * @param {string} url 图片地址
 * @returns {Promise<string>}
 */
function imageToBase64(url) {
  return new Promise((resolve, reject) => {
    // 已经是 base64 直接返回
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        // 跨域等原因转不了，返回原 URL
        resolve(url);
      }
    };
    img.onerror = () => {
      // 加载失败返回原 URL
      resolve(url);
    };
    img.src = url;
  });
}

/**
 * 导出成品 HTML
 * @param {Object} options
 * @param {Array} options.images 图片数据数组
 * @param {string} options.title 页面标题
 * @param {string} options.imgMode 'external' | 'base64'
 * @param {string} options.areaStyle 'hidden' | 'border'
 * @param {string} options.layout 'vertical' | 'horizontal'
 */
export async function exportToHtml({ images, title = '热区成品页', imgMode = 'external', areaStyle = 'hidden', layout = 'vertical' }) {
  // 处理图片
  const processedImages = [];
  for (const img of images) {
    if (!img.imgUrl) continue;
    let imgUrl = img.imgUrl;
    if (imgMode === 'base64') {
      imgUrl = await imageToBase64(img.imgUrl);
    }
    processedImages.push({
      imgUrl,
      imgWidth: img.imgWidth || 750,
      imgHeight: img.imgHeight || 0,
      areaList: (img.areaList || []).map((a) => ({
        x: Math.round(a.x),
        y: Math.round(a.y),
        w: Math.round(a.w),
        h: Math.round(a.h),
        link: a.link || ''
      }))
    });
  }

  if (processedImages.length === 0) {
    throw new Error('没有有效的图片数据');
  }

  // 运行时数据
  const runtimeData = JSON.stringify({
    images: processedImages,
    areaStyle,
    layout
  });

  // 组装 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>${escapeHtml(title)}</title>
<style>
${RUNTIME_CSS.trim()}
</style>
</head>
<body>
<script>
window.__DYNAMIC_AREA_DATA__ = ${runtimeData};
</script>
<script>
${RUNTIME_JS.trim()}
</script>
</body>
</html>`;

  // 触发下载
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_${formatDate(new Date())}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
