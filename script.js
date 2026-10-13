/* ==========================================================
   数智化团队 · 数据服务 v4 · 交互脚本
   ========================================================== */
(function () {
  'use strict';

  /* === 0. 标记 JS 已加载（用于 CSS 的 html.js-loaded 选择器） === */
  document.documentElement.classList.add('js-loaded');

  /* === 1. 滚动渐显 === */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* === 2. 导航栏滚动样式 === */
  const nav = document.getElementById('nav');
  const handleNavScroll = () => {
    if (!nav) return;
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  /* === 3. 移动端导航 === */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* === 4. 平滑滚动偏移 === */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* === 5. 年份 === */
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();

  /* === 6. 复制邮箱 === */
  const copyBtn = document.getElementById('copyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = document.getElementById('emailText')?.textContent?.trim() || '';
      try {
        await navigator.clipboard.writeText(text);
        const original = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => (copyBtn.textContent = original), 1800);
      } catch {
        window.location.href = 'mailto:' + text;
      }
    });
  }

  /* === 7. 联系表单提交（发邮件通知 + 本地留存） === */
  // 邮件通知接口（云函数 / Serverless 部署后填入实际地址）
  const LEAD_API = window.__LEAD_API__ || '';
  window.__LEAD_API__ = LEAD_API;

  function showFormMsg(ok, msg) {
    const okEl = document.getElementById('formOk');
    const errEl = document.getElementById('formErr');
    if (!msg) return;
    const el = ok ? okEl : errEl;
    const other = ok ? errEl : okEl;
    if (other) other.hidden = true;
    if (el) {
      el.textContent = msg;
      el.hidden = false;
      setTimeout(() => (el.hidden = true), 6000);
    }
  }

  async function submitLead(data) {
    // 未配置接口时：仅本地留存，提示用户
    if (!LEAD_API) return { ok: false, skipped: true };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(LEAD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      return { ok: res.ok, status: res.status };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, error: e };
    }
  }

  window.handleSubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('formSubmit');
    const data = Object.fromEntries(new FormData(form));
    // 去掉空字段
    Object.keys(data).forEach((k) => {
      if (!data[k] || !String(data[k]).trim()) delete data[k];
    });
    const payload = { ...data, page: location.href, ts: new Date().toISOString() };

    // 本地留存（兜底）
    try {
      const list = JSON.parse(localStorage.getItem('wb_leads') || '[]');
      list.push(payload);
      localStorage.setItem('wb_leads', JSON.stringify(list));
    } catch {}

    if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
    const r = await submitLead(payload);
    if (btn) { btn.disabled = false; btn.textContent = '提交留言'; }

    if (r.ok) {
      showFormMsg(true, '✓ 已收到留言，我会尽快联系您！');
      form.reset();
    } else if (r.skipped) {
      showFormMsg(true, '✓ 已收到您的留言！（演示模式）请直接加我钉钉 15175796626');
      form.reset();
    } else {
      showFormMsg(false, '提交失败，请稍后重试，或直接加我钉钉 15175796626');
    }
    return false;
  };

  /* === 8. 案例 tabs 筛选 === */
  const caseTabs = document.querySelectorAll('.ct-tab');
  const caseCards = document.querySelectorAll('.case-card');
  if (caseTabs.length && caseCards.length) {
    caseTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        caseTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        caseCards.forEach((card) => {
          if (target === 'all' || card.dataset.cat === target) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  /* === 9. ChatBI 模拟器 === */
  const cbBody = document.getElementById('cbBody');
  const cbForm = document.getElementById('cbForm');
  const cbInput = document.getElementById('cbInput');
  const cbPresets = document.getElementById('cbPresets');
  const cbSuggest = document.getElementById('cbSuggest');

  // 答案数据：thinking 思考步骤 / chart 图表 / lines 逐行结论
  const cbAnswers = {
    '竞争力': {
      thinking: [
        '正在理解您的问题：需要分析当前各类原材料的采购价，相对市场行情是否具备竞争力…',
        '🔗 已连接数据仓库，从「采购订单明细表」「供应商报价表」中抽取近 30 天成交均价…',
        '📊 同步调取「市场基准价库」（含批发市场价、B2B 平台价）作为对比基准…',
        '📐 逐项计算价格优势幅度 =（市场基准价 − 我方采购价）/ 市场基准价 × 100%…',
        '🔍 对价格异常项做二次校验，排除规格、账期差异造成的不可比因素…',
        '✅ 共完成 20 项核心原材料比对，其中 6 项具备明显优势，正在生成图表与解读…'
      ],
      chart: {
        type: 'bar',
        title: '具备价格优势的 6 项原材料',
        subtitle: '柱状为相对市场基准价的平均降幅，顶部为降幅区间',
        unit: '%',
        data: [
          { name: '中排骨', val: 33, range: '23-43%' },
          { name: '鲫鱼', val: 14, range: '1-26%' },
          { name: '草鱼', val: 12, range: '2-22%' },
          { name: '猪肉块', val: 12, range: '0-23%' },
          { name: '猪颈骨', val: 12, range: '1-22%' },
          { name: '二八馅', val: 10, range: '0-21%' }
        ]
      },
      lines: [
        { type: 'head', text: '📊 分析完成：20 项核心原材料中，6 项具备价格优势，整体采购成本控制良好' },
        { type: 'text', text: '<strong>中排骨</strong>优势最突出：我方采购价 ¥21.76/kg，市场区间 ¥28-38/kg，<strong>低 23-43%</strong>，按当前用量年化可节约数十万元' },
        { type: 'text', text: '<strong>鲫鱼、草鱼</strong>分别低 1-26%、2-22%，水产类整体保持稳定优势，主供应渠道报价合理' },
        { type: 'text', text: '<strong>猪肉块、猪颈骨、猪肉二八馅</strong>等猪副类有 0-23% 的小幅优势，但部分品类已接近市场低位，进一步压缩空间有限' },
        { type: 'text', text: '其余 14 项原材料与市场价基本持平，其中个别品类（如鸡蛋、部分牛部位）存在优化空间，可进一步询价对比' },
        { type: 'tip', text: '💡 建议：中排骨等优势项锁定长期协议价并适当提高采购占比；水产维持现有渠道；对持平及偏高品类，可多渠道询价比价。需要我直接生成「可优化品类 + 降本建议」吗？' }
      ]
    },
    '采购': {
      thinking: [
        '正在理解您的问题：在价格竞争力分析基础上，给出可落地、可量化的采购渠道优化方案…',
        '🔗 调取各重点品类的月度采购量、采购金额、当前供应商结构与账期…',
        '🛒 采集中美菜、快驴等 B2B 平台价及产地源头批发价，建立多渠道比价模型…',
        '🧮 模拟切换 / 新增渠道后的采购成本变化，逐项测算月度可节省金额…',
        '⚖️ 综合评估降本金额、供应稳定性、切换难度与品质风险，对方案排序…',
        '✅ 已筛选出 3 项优先级最高的优化动作，正在生成收益测算与实施建议…'
      ],
      chart: {
        type: 'line',
        title: '优化措施分步落地后，月度采购成本趋势预测',
        subtitle: '单位：万元 / 月（基于当前采购规模测算）',
        unit: '万',
        data: [
          { name: '现状', val: 100 },
          { name: '鸡蛋优化', val: 97 },
          { name: '牛肉直采', val: 91.5 },
          { name: '全部落地', val: 92 }
        ],
        savings: [
          { name: '鸡蛋→B2B', save: 3 },
          { name: '牛胸直采', save: 5.5 },
          { name: '上浆猪肉', save: 0 }
        ]
      },
      lines: [
        { type: 'head', text: '🎯 3 项可落地的渠道优化建议（按"降本金额 × 实施难度"排序）' },
        { type: 'text', text: '① <strong>鸡蛋 → 切换 / 引入美菜、快驴等 B2B 集采平台</strong>。平台集采价更低、配送与账期稳定，建议先小批量试供，验证品质后放量，预计 <strong>月省 ¥2.5-3.5 万</strong>' },
        { type: 'text', text: '② <strong>牛胸 / 牛肉 → 河北本地牛源直采</strong>。跳过中间商、对接产地或一级屠宰场，在稳定品质前提下降本空间最大，预计 <strong>月省 ¥5-6 万</strong>，需关注冷链配送与到货时效' },
        { type: 'text', text: '③ <strong>上浆猪肉 → 引入第二供应商或评估自建加工线</strong>。该品月消耗约 2 万袋、用量稳定，引入竞争可压价；若自建产线，长期可进一步摊薄单位成本' },
        { type: 'text', text: '实施节奏建议：先推进见效快、切换成本低的鸡蛋 B2B（约 2-4 周）；同步启动牛肉产地供应商开发（约 1-2 月）；上浆猪肉作为中期专项评估' },
        { type: 'tip', text: '💰 收益汇总：前两项落地后预计月省 ¥7.5-9.5 万，<strong>年化降本约 ¥90-115 万</strong>。建议每季度复盘一次渠道价格，形成长效比价机制。需要我帮您整理成可直接汇报的方案吗？' }
      ]
    }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // 关键词映射：把用户的各种问法归一到答案条目
  const cbIntents = {
    '竞争力': ['竞争力', '价格优势', '价格竞争力', '划算', '便宜', '贵', '市场价', '降幅', '有降价空间', '降价空间', '价格高', '比价', '采购价', '原材料价格', '优势'],
    '采购':  ['采购', '渠道', '供应商', '降本', '优化建议', '节省', '成本', 'B2B', '美菜', '快驴', '直采', '议价', '怎么办', '有什么建议', '建议']
  };

  function cbFindAnswer(q) {
    const text = String(q || '');
    // 先按意图关键词匹配（覆盖多种问法）
    for (const key in cbIntents) {
      for (const kw of cbIntents[key]) {
        if (text.includes(kw)) return cbAnswers[key];
      }
    }
    // 再回退到答案名匹配
    for (const key in cbAnswers) {
      if (text.includes(key)) return cbAnswers[key];
    }
    return null;
  }

  // 生成 SVG 柱状图（柱子从底部生长）
  function buildBarChart(chart) {
    const W = 340, H = 150, padL = 36, padB = 38, padT = 10, padR = 10;
    const plotW = W - padL - padR, plotH = H - padB - padT;
    const max = Math.max(...chart.data.map(d => d.val)) * 1.2;
    const bw = plotW / chart.data.length * 0.56;
    const gap = plotW / chart.data.length;
    let bars = '';
    chart.data.forEach((d, i) => {
      const h = (d.val / max) * plotH;
      const x = padL + i * gap + (gap - bw) / 2;
      const y = padT + plotH - h;
      bars += `<rect class="bar-rect" x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" style="animation-delay:${i*0.12}s">
        <title>${d.name} ${d.range}</title></rect>`;
      bars += `<text class="bar-val" x="${x+bw/2}" y="${y-5}" text-anchor="middle" style="animation-delay:${i*0.12+0.3}s">${d.range}</text>`;
      bars += `<text class="bar-name" x="${x+bw/2}" y="${padT+plotH+16}" text-anchor="middle">${d.name}</text>`;
    });
    return `<div class="cb-chart">
      <div class="cch-title">${chart.title}</div>${chart.subtitle ? `<div class="cch-sub">${chart.subtitle}</div>` : ""}
      <svg viewBox="0 0 ${W} ${H}" class="cch-svg">
        <line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+plotH}"/>
        <line class="axis" x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}"/>
        ${bars}
      </svg>
    </div>`;
  }

  // 生成 SVG 折线图（线从左到右绘制 + 节点）
  function buildLineChart(chart) {
    const W = 340, H = 150, padL = 40, padB = 38, padT = 10, padR = 14;
    const plotW = W - padL - padR, plotH = H - padB - padT;
    const vals = chart.data.map(d => d.val);
    const min = Math.min(...vals) - 8, max = Math.max(...vals) + 4;
    const n = chart.data.length;
    const pts = chart.data.map((d, i) => ({
      x: padL + (n === 1 ? plotW/2 : i * plotW/(n-1)),
      y: padT + plotH - ((d.val - min)/(max-min)) * plotH,
      d
    }));
    const line = pts.map((p,i) => (i===0?'M':'L') + p.x + ' ' + p.y).join(' ');
    const area = `${line} L ${pts[n-1].x} ${padT+plotH} L ${pts[0].x} ${padT+plotH} Z`;
    let dots = '', labels = '';
    pts.forEach((p,i) => {
      dots += `<circle class="line-dot" cx="${p.x}" cy="${p.y}" r="4" style="animation-delay:${0.5+i*0.18}s"/>`;
      dots += `<text class="line-val" x="${p.x}" y="${p.y-9}" text-anchor="middle" style="animation-delay:${0.5+i*0.18}s">${p.d.val}</text>`;
      labels += `<text class="bar-name" x="${p.x}" y="${padT+plotH+16}" text-anchor="middle">${p.d.name}</text>`;
    });
    return `<div class="cb-chart">
      <div class="cch-title">${chart.title}</div>${chart.subtitle ? `<div class="cch-sub">${chart.subtitle}</div>` : ""}
      <svg viewBox="0 0 ${W} ${H}" class="cch-svg">
        <line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+plotH}"/>
        <line class="axis" x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}"/>
        <path class="line-area" d="${area}"/>
        <path class="line-path" d="${line}"/>
        ${dots}${labels}
      </svg>
    </div>`;
  }

  function cbAppendUser(text) {
    if (!cbBody) return;
    const msg = document.createElement('div');
    msg.className = 'cb-msg user';
    msg.innerHTML = `<span class="cb-avatar">👤</span><div class="cb-bubble">${escapeHtml(text)}</div>`;
    cbBody.appendChild(msg);
    cbBody.scrollTop = cbBody.scrollHeight;
  }

  function cbScroll() { if (cbBody) cbBody.scrollTop = cbBody.scrollHeight; }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function cbAsk(q, isDemo) {
    if (!q.trim() || !cbBody) return;
    cbAppendUser(q);
    if (!isDemo && cbInput) cbInput.value = '';
    if (cbSuggest) cbSuggest.style.display = 'none';

    const ans = cbFindAnswer(q);

    if (!ans) {
      // 通用回复
      const typing = appendThinking(['正在理解您的问题…', '🔗 真实环境中此处将连接数据仓库查询…']);
      await sleep(1600);
      typing.remove();
      const m = document.createElement('div');
      m.className = 'cb-msg bot';
      m.innerHTML = `<span class="cb-avatar">🤖</span><div class="cb-bubble">已收到：<strong>${escapeHtml(q)}</strong><div class="cb-gen-note">⚡ 真实部署后，我会自动生成查询语句、从数据仓库取数并返回图表与结论。您可以试试问：<strong>哪些原材料有降价空间？</strong> 或 <strong>采购渠道怎么优化？</strong></div></div>`;
      cbBody.appendChild(m);
      if (cbSuggest) cbSuggest.style.display = 'flex';
      cbScroll();
      return;
    }

    // ① 深度思考（逐行）
    const thinkEl = appendThinking(ans.thinking);
    for (let i = 0; i < ans.thinking.length; i++) {
      await sleep(900);
      addThinkStep(thinkEl, ans.thinking[i]);
      cbScroll();
    }
    await sleep(800);
    thinkEl.remove();

    // ② 结果气泡（图表 + 逐行文字）
    const result = document.createElement('div');
    result.className = 'cb-msg bot';
    const chartHtml = ans.chart
      ? (ans.chart.type === 'bar' ? buildBarChart(ans.chart) : buildLineChart(ans.chart))
      : '';
    result.innerHTML = `<span class="cb-avatar">🤖</span><div class="cb-bubble cb-bubble-result">
      <div class="cb-chart-wrap">${chartHtml}</div>
      <div class="cb-lines"></div>
    </div>`;
    cbBody.appendChild(result);
    const linesBox = result.querySelector('.cb-lines');

    // ③ 文字逐行（结果气泡整体随后滚入视野）
    for (const line of ans.lines) {
      await sleep(750);
      const p = document.createElement('div');
      p.className = 'cb-line cb-line-' + line.type;
      p.innerHTML = line.text;
      linesBox.appendChild(p);
    }
    // 全部文字就绪后，滚到结果气泡顶部，图表+标题+结论一次呈现
    await sleep(120);
    cbBody.scrollTo({ top: result.offsetTop - 10, behavior: 'smooth' });
  }

  // 思考气泡（带步骤容器）
  function appendThinking(steps) {
    const msg = document.createElement('div');
    msg.className = 'cb-msg bot';
    msg.innerHTML = `<span class="cb-avatar">🧠</span><div class="cb-bubble cb-thinking">
      <div class="think-head">深度思考中<span class="think-dots"><i></i><i></i><i></i></span></div>
      <div class="think-steps"></div>
    </div>`;
    cbBody.appendChild(msg);
    cbScroll();
    return msg;
  }
  function addThinkStep(thinkEl, text) {
    const box = thinkEl.querySelector('.think-steps');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'think-step';
    div.textContent = text;
    box.appendChild(div);
  }

  if (cbForm) {
    cbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      cbAsk(cbInput.value);
    });
  }
  // 预设问题：点击 → 填入输入框（不自动发送）
  if (cbPresets) {
    cbPresets.querySelectorAll('.cb-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (cbInput) {
          cbInput.value = btn.dataset.q || btn.textContent;
          cbInput.focus();
        }
      });
    });
  }

  /* === 9b. 自动演示：进入视口后自动播放两个内置问题 === */
  const DEMO_QUESTIONS = [
    '分析一下我们原材料采购的价格竞争力？',
    '给我们一些采购渠道优化建议'
  ];
  const cbReplay = document.getElementById('cbReplay');
  let demoStarted = false;
  let demoRunning = false;

  // 重置对话区到初始欢迎语
  function cbResetDemo() {
    if (!cbBody) return;
    cbBody.innerHTML = `
      <div class="cb-msg bot">
        <span class="cb-avatar">🤖</span>
        <div class="cb-bubble">
          您好，我是您的数据助手。<br>
          现在为您<strong>自动演示</strong>一次真实问数过程 ——<br>
          您只需提一个业务问题，我会自动完成：<strong>查数 → 分析 → 回答</strong><br>
          <span class="cb-auto-tip">👇 看着就好，不用操作</span>
        </div>
      </div>`;
  }

  async function cbRunDemo() {
    if (demoRunning) return;
    demoRunning = true;
    if (cbReplay) cbReplay.classList.add('playing');
    cbResetDemo();
    await sleep(700);
    for (const q of DEMO_QUESTIONS) {
      await cbAsk(q, true);   // true = 演示模式，不清空输入框
      await sleep(1200);
    }
    if (cbReplay) cbReplay.classList.remove('playing');
    demoRunning = false;
  }

  if (cbReplay) {
    cbReplay.addEventListener('click', () => {
      if (!demoRunning) cbRunDemo();
    });
  }

  // 滚动进入视口时自动播放（只播一次）
  const aiDemo = document.getElementById('ai-demo');
  if (aiDemo && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !demoStarted) {
          demoStarted = true;
          setTimeout(cbRunDemo, 400);   // 等模块入场动画结束再开始
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(aiDemo);
  } else {
    demoStarted = true;
    setTimeout(cbRunDemo, 1200);
  }

  /* === 9c. 顶部导航滚动同步高亮 === */
  // 在 hero 区（页面顶部）时，body 加 .is-on-top
  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        document.body.classList.toggle('is-on-top', e.isIntersecting);
      });
    }, { threshold: [0, 0.05] });
    heroIO.observe(hero);
  }

  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  if (navAnchors.length && 'IntersectionObserver' in window) {
    const sections = Array.from(navAnchors)
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    const setActive = (id) => {
      navAnchors.forEach((a) => {
        if (a.classList.contains('nav-top')) return;   // 数智化按钮永远保持按钮态
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    };

    // 锚点点击后临时锁住 IO，避免跳转过程被切乱
    let lockUntil = 0;
    const isLocked = () => Date.now() < lockUntil;

    const navIO = new IntersectionObserver((entries) => {
      if (isLocked()) return;
      // 选当前可见且最靠上的非 hero section
      const visible = entries
        .filter((e) => e.isIntersecting && e.target.id !== 'hero')
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        setActive(visible[0].target.id);
      } else {
        // 没有任何 section 在视口内（滚到顶端 hero 区域）→ 全部取消高亮（"数智化"按钮自身样式保留）
        navAnchors.forEach(a => {
          if (a.classList.contains('nav-top')) return;
          a.classList.remove('is-active');
        });
      }
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach((s) => {
      if (s.id === 'hero') return;
      navIO.observe(s);
    });

    // 锚点点击：立即锁定 + 按点击目标设高亮
    navAnchors.forEach((a) => {
      a.addEventListener('click', () => {
        const targetId = a.getAttribute('href').slice(1);
        if (targetId !== 'hero') setActive(targetId);
        else {
          navAnchors.forEach(x => {
            if (x.classList.contains('nav-top')) return;
            x.classList.remove('is-active');
          });
        }
        lockUntil = Date.now() + 900;   // 锁 900ms 覆盖 smooth 滚动时长
      });
    });
  }

  /* === 10. 案例详情全屏（FLIP 卡片线性放大） === */
  const cd = document.getElementById('caseDetail');
  const cdPanel = document.getElementById('cdPanel');
  const cdMedia = document.getElementById('cdMedia');
  const cdMeta = document.getElementById('cdMeta');
  const cdTitle = document.getElementById('cdTitle');
  const cdLead = document.getElementById('cdLead');
  const cdMetric = document.getElementById('cdMetric');
  const cdPoints = document.getElementById('cdPoints');
  const cdLiveLink = document.getElementById('cdLiveLink');
  const cdLiveTitle = document.getElementById('cdLiveTitle');
  const cdClose = document.getElementById('cdClose');
  let cdSourceEl = null;

  function parseJson(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function cdOpen(card) {
    const title = card.dataset.title || '';
    const tags = parseJson(card.dataset.tags, []);
    const gallery = parseJson(card.dataset.gallery, []);
    const lead = card.dataset.lead || '';
    const points = parseJson(card.dataset.points, []);
    const metric = card.dataset.metric || '';

    // 填充标签
    cdMeta.innerHTML = tags.map(t => `<span class="case-tag">${t}</span>`).join('');
    cdTitle.textContent = title;
    cdLead.textContent = lead;
    cdMetric.textContent = metric;
    // 在线大屏外链（可选）
    const live = card.dataset.live;
    if (live && cdLiveLink) {
      cdLiveLink.href = live;
      if (cdLiveTitle) cdLiveTitle.textContent = '在线打开：' + (card.dataset.liveTitle || title);
      cdLiveLink.style.display = 'flex';
    } else if (cdLiveLink) {
      cdLiveLink.style.display = 'none';
    }
    cdPoints.innerHTML = points.map(p => `<li>${p}</li>`).join('');

    // 填充媒体
    cdMedia.className = 'cd-media';
    cdMedia.innerHTML = '';
    if (gallery.length === 0) {
      cdMedia.classList.add('cd-empty');
      cdMedia.innerHTML = '<div class="cd-empty-icon">🖼️</div><div>该案例截图待补充，详情见下方说明</div>';
    } else if (gallery.length === 1) {
      const src = gallery[0];
      if (src.endsWith('.mp4')) {
        cdMedia.innerHTML = `<video src="${src}" controls autoplay muted loop playsinline style="width:100%;border-radius:8px;display:block;background:#000"></video>`;
      } else {
        cdMedia.innerHTML = `<img src="${src}" alt="${title}">`;
      }
    } else {
      cdMedia.classList.add('cd-multi');
      const labels = parseJson(card.dataset.galleryLabels, []);
      cdMedia.innerHTML = gallery.map((src, i) => {
        if (src.endsWith('.mp4')) {
          return `<video src="${src}" controls muted loop playsinline style="width:100%;border-radius:8px;display:block;background:#000"></video>`;
        }
        return `<img src="${src}" alt="${labels[i] || title + ' ' + (i+1)}">`;
      }).join('');
    }

    // 记录源卡片位置
    cdSourceEl = card;
    const rect = card.getBoundingClientRect();

    // 显示遮罩（但面板先不可见，等定位）
    cd.classList.add('open');
    document.body.classList.add('cd-open');

    // 等面板渲染后拿到目标位置
    requestAnimationFrame(() => {
      const panelRect = cdPanel.getBoundingClientRect();
      const dx = rect.left - panelRect.left;
      const dy = rect.top - panelRect.top;
      const sx = rect.width / panelRect.width;
      const sy = rect.height / panelRect.height;
      // 起始：把面板变换到源卡片位置
      cdPanel.style.transition = 'none';
      cdPanel.style.transformOrigin = 'top left';
      cdPanel.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      cdPanel.style.opacity = '0.4';
      // 强制回流
      cdPanel.getBoundingClientRect();
      // 过渡到正常
      cdPanel.style.transition = '';
      requestAnimationFrame(() => {
        cdPanel.style.transform = '';
        cdPanel.style.opacity = '';
      });
    });

    // 滚动到顶部（面板内部）
    cd.scrollTop = 0;
  }

  function cdCloseAnim() {
    if (!cdSourceEl) { cdHide(); return; }
    const rect = cdSourceEl.getBoundingClientRect();
    const panelRect = cdPanel.getBoundingClientRect();
    const dx = rect.left - panelRect.left;
    const dy = rect.top - panelRect.top;
    const sx = rect.width / panelRect.width;
    const sy = rect.height / panelRect.height;
    cdPanel.style.transformOrigin = 'top left';
    cdPanel.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    cdPanel.style.opacity = '0.4';
    cd.classList.remove('open');
    setTimeout(cdHide, 420);
  }

  function cdHide() {
    cd.classList.remove('open');
    document.body.classList.remove('cd-open');
    cdPanel.style.transition = '';
    cdPanel.style.transform = '';
    cdPanel.style.opacity = '';
    cdPanel.style.transformOrigin = '';
    cdSourceEl = null;
  }

  document.querySelectorAll('.js-case').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      cdOpen(card);
    });
  });

  if (cdClose) cdClose.addEventListener('click', cdCloseAnim);
  if (cd) {
    cd.addEventListener('click', (e) => {
      if (e.target === cd) cdCloseAnim();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cd.classList.contains('open')) cdCloseAnim();
  });
})();
