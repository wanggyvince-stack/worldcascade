# index.html 结构提取

> 文件：`/Coze/Drive/cathealthsignal/worldcascade/index.html`
> 总行数：3130
> 提取时间：2026-01-15

---

## 1. 顶部导航栏

**行号：1249–1270**

```html
<nav class="nav">
  <div class="brand">
    <svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <!-- SVG circles and lines -->
    </svg>
    <span>WorldCascade</span>
  </div>
  <div class="nav-links">
    <a href="#chains">Causal Chains</a>
    <a href="#trust">Track Record</a>
    <a href="#methodology">Methodology</a>
  </div>
</nav>
```

**结构说明：**
- 导航栏位于 `<header id="hero" class="hero">` 内部
- 品牌 Logo：SVG 图标 + 文字 "WorldCascade"
- 导航链接：3个（Causal Chains / Track Record / Methodology）

---

## 2. Hero 区

**行号：1246–1288**

```html
<header id="hero" class="hero">
  <canvas class="hero-canvas" id="starfield" aria-hidden="true"></canvas>

  <nav class="nav">
    <!-- 导航栏，见上方 -->
  </nav>

  <div class="hero-content">
    <div class="hero-tag">World Simulation Engine · v4.0.0</div>
    <h1 class="hero-kv" aria-label="80 predictions, 10 domains, 1 engine">
      <span><span class="num" data-count="80">80</span><span class="lbl">Predictions</span></span>
      <span><span class="num" data-count="10">10</span><span class="lbl">Domains</span></span>
      <span><span class="num">1</span><span class="lbl">Engine</span></span>
    </h1>
    <p class="hero-sub">We model 80 possible futures — and score every one with a transparent, reproducible engine. Not opinion. Not speculation. Engineered foresight.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#predictions">Explore Predictions</a>
      <a class="btn btn-ghost" href="#chains">See the Causal Chains →</a>
      <button class="btn btn-ghost" type="button" id="hero-my-bets-btn">My Bets <span id="hero-bets-count"></span> →</button>
    </div>
  </div>

  <div class="scroll-hint" aria-hidden="true">Scroll</div>
</header>
```

**CTA 按钮：**
1. `Explore Predictions` — 主按钮，链接到 `#predictions`
2. `See the Causal Chains →` — 幽灵按钮，链接到 `#chains`
3. `My Bets →` — 幽灵按钮，动态显示下注数量

---

## 3. handleRoute 函数

**行号：2549–2574**

```javascript
function handleRoute(){
  var hash = location.hash.slice(1);
  
  if (hash.startsWith('chain/')) {
    const chainId = hash.split('/')[1];
    if (renderChainDetail(chainId)) return;
  }
  if (hash.startsWith('detail/')) {
    var id = hash.replace('detail/', '');
    showDetail(id);
  } else if (hash === 'predictions') {
    showHomeNoScroll();
    var predSec = document.getElementById('predictions');
    if (predSec) {
      setTimeout(function(){ predSec.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 50);
    }
  } else if (hash === 'chains') {
    showHomeNoScroll();
    var chnSec = document.getElementById('chains');
    if (chnSec) {
      setTimeout(function(){ chnSec.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 50);
    }
  } else {
    showHome();
  }
}
```

**路由逻辑：**
- `#chain/{chainId}` → 渲染因果链详情
- `#detail/{predictionId}` → 渲染预测详情
- `#predictions` → 显示主页 + 滚动到预测区
- `#chains` → 显示主页 + 滚动到因果链区
- 默认 → 显示主页

---

## 4. Back 按钮（汇总）

### 4.1 detail-view 顶部 Back 按钮

**行号：1423**

```html
<button type="button" class="detail-back" onclick="history.pushState(null,'','#predictions');handleRoute();">← Back to Predictions</button>
```

### 4.2 detail-view 底部 Back 按钮

**行号：1541**

```html
<button type="button" class="detail-back detail-back-bottom" onclick="history.pushState(null,'','#predictions');handleRoute();">← Back to Predictions</button>
```

### 4.3 chain-detail-view 顶部 Back 按钮

**行号：1372**

```html
<button type="button" class="cd-back" onclick="history.pushState(null,'','#chains');handleRoute();">← Back to Causal Chains</button>
```

### 4.4 chain-detail-view 底部 Back 按钮

**行号：1385**

```html
<button type="button" class="cd-back cd-back-bottom" onclick="history.pushState(null,'','#chains');handleRoute();">← Back to Causal Chains</button>
```

**⚠️ Back 按钮逻辑分析：**
- 所有 Back 按钮使用**相同的硬编码逻辑**：`history.pushState(null,'','#xxx');handleRoute();`
- detail-view 返回 `#predictions`
- chain-detail-view 返回 `#chains`
- 文案硬编码：`← Back to Predictions` / `← Back to Causal Chains`
- 没有动态返回逻辑（如浏览器历史栈回退）

---

## 5. detail-view 区块

**行号：1421–1543**

```html
<section id="detail-view" class="detail-view" aria-labelledby="detail-title" hidden>
  <div class="detail-inner">
    <!-- Back 按钮（顶部） -->
    <button type="button" class="detail-back" onclick="history.pushState(null,'','#predictions');handleRoute();">← Back to Predictions</button>
    
    <!-- 头部信息 -->
    <div class="detail-head">
      <span class="detail-id-tag" id="detail-id-tag"></span>
      <h2 id="detail-title" class="detail-title"></h2>
      <p class="detail-sub">
        <span class="detail-domain" id="detail-domain"></span>
        <span class="detail-sep">·</span>
        <span>Verdict: <strong id="detail-vdate"></strong></span>
        <span class="detail-sep">·</span>
        <span id="detail-days"></span>
      </p>
    </div>

    <!-- Engine Score 卡片 -->
    <div class="detail-score-card">...</div>

    <!-- 内容区块 -->
    <div class="detail-block">
      <h2>Forecast</h2>
      <p id="detail-content" class="detail-text"></p>
    </div>
    <div class="detail-block">
      <h2>Verification Criteria</h2>
      <p id="detail-criteria" class="detail-text"></p>
    </div>
    <div class="detail-block">
      <h2>Score Breakdown <button class="detail-toggle" id="detail-toggle" type="button">View 6-step ▾</button></h2>
      <div id="detail-breakdown" class="detail-breakdown" hidden></div>
    </div>
    <div class="detail-block">
      <h2>Causal Chain</h2>
      <div id="detail-chain" class="detail-chain"></div>
      <div id="detail-related" class="detail-related"></div>
    </div>
    <div class="detail-block" id="detail-signal-block">
      <h2>Leading Signal</h2>
      <div id="detail-signal" class="detail-signal"></div>
    </div>
    <div class="detail-block" id="detail-progress-block">
      <h2>Progress Tracker</h2>
      <div id="detail-progress" class="detail-progress"></div>
    </div>
    <div class="detail-block">
      <h2>Evidence Sources</h2>
      <ul id="detail-evidence" class="detail-evidence"></ul>
      <p class="detail-meta">
        Direction: <strong id="detail-dir"></strong> ·
        Consensus: <strong id="detail-cons"></strong>
      </p>
    </div>

    <!-- Place Your Bet 模块 -->
    <div class="bet-module" id="bet-module">...</div>

    <!-- Back 按钮（底部） -->
    <button type="button" class="detail-back detail-back-bottom" onclick="history.pushState(null,'','#predictions');handleRoute();">← Back to Predictions</button>
  </div>
</section>
```

---

## 6. chain-detail-view 区块

**行号：1370–1387**

```html
<section id="chain-detail-view" class="chain-detail-view" hidden>
  <div class="cd-inner">
    <!-- Back 按钮（顶部） -->
    <button type="button" class="cd-back" onclick="history.pushState(null,'','#chains');handleRoute();">← Back to Causal Chains</button>
    
    <!-- 动态内容容器 -->
    <div class="cd-head" id="cd-head"></div>
    <div class="cd-top" id="cd-top"></div>

    <h3 class="cd-section-title">The Chain</h3>
    <div class="cd-nodes" id="cd-nodes"></div>

    <h3 class="cd-section-title">Chain Vulnerability</h3>
    <div class="cd-vuln" id="cd-vuln"></div>

    <h3 class="cd-section-title">All Predictions on This Chain</h3>
    <div class="cd-preds" id="cd-preds"></div>

    <!-- Back 按钮（底部） -->
    <button type="button" class="cd-back cd-back-bottom" onclick="history.pushState(null,'','#chains');handleRoute();">← Back to Causal Chains</button>
  </div>
</section>
```

---

## 7. 各 Section 起始行号

| Section | ID | 起始行号 |
|---------|-----|---------|
| Hero | `#hero` | **1246** |
| Causal Chains | `#chains` | **1291** |
| Chain Detail View | `#chain-detail-view` | **1370** |
| Predictions | `#predictions` | **1390** |
| Detail View | `#detail-view` | **1421** |
| Bets Modal | `#bets-modal` | **1546** |
| Trust / Track Record | `#trust` | **1562** |
| Footer / Methodology | `#methodology` | **1692** |

**⚠️ 注意：** 没有独立的 `#backtest` section。Backtest 内容嵌套在 `#trust` section 内部（行号 1586–1690）。

---

## 8. Footer

**行号：1692–1711**

```html
<footer id="methodology">
  <div class="footer-inner">
    <div class="footer-brand">
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke="#6366F1" stroke-width="1" opacity="0.4"/>
        <circle cx="16" cy="16" r="2" fill="#6366F1"/>
      </svg>
      <span>WorldCascade</span>
    </div>
    <div class="footer-meta">
      <a href="#methodology">Methodology v4.0.0</a>
      <span class="dot">·</span>
      <a href="#predictions">80 Predictions</a>
      <span class="dot">·</span>
      <span>worldcascade.com</span>
      <span class="dot">·</span>
      <span>© 2026</span>
    </div>
  </div>
</footer>
```

**结构说明：**
- Footer 使用 `<footer id="methodology">` 标签
- 品牌 Logo：简化版 SVG（仅 2 个 circle）+ 文字
- 元信息链接：Methodology / 80 Predictions / 域名 / 版权

---

【index.html 结构已提取，行号已标注】
