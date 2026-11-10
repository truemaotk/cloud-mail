# mail 项目交接文档

更新：2026-11-10 · 分支：`truemaotk/cloud-mail` 的 `mail-ui-release`

这份文档写给下一位接手的开发者或 AI。读完它就能知道：项目在哪、这一轮 UI 改了什么、设计规则是什么、怎样在本地跑起来和验收，以及还剩哪些开发和部署工作。

---

## 1. 仓库与工作目录

| 项 | 说明 |
| --- | --- |
| 本机目录 | `E:/cloud-mail`（Windows）。独立 Git 仓库，与其他项目无关。 |
| 发布仓库 | [`truemaotk/cloud-mail`](https://github.com/truemaotk/cloud-mail)，分支 [`mail-ui-release`](https://github.com/truemaotk/cloud-mail/tree/mail-ui-release)。**只往这个分支推送。** |
| 上游 | 本机 `origin` 指向上游 `maillab/cloud-mail`。推送前必须 `git remote -v` 核对，不要推到上游。建议在本机加一个 remote：`git remote add truemaotk https://github.com/truemaotk/cloud-mail.git`。 |
| 本机同步 | 本机 `E:/cloud-mail` 的工作区里有与本分支相同的未提交改动（之前是从云端同步过去的文件）。接手时建议：`git stash` 或丢弃本地改动 → `git fetch truemaotk` → `git switch -c mail-ui-release truemaotk/mail-ui-release`。本机 `mail-worker/.wrangler/local/` 下另有一些临时同步包（`sync-*.tgz`），可以删除。 |
| 子项目 | `mail-vue`：Vue 3 + Vite + Element Plus + Pinia + vue-i18n 前端。`mail-worker`：Cloudflare Worker（Hono + Drizzle + D1/KV/R2），同时托管前端构建产物 `mail-worker/dist`。 |
| 工具版本 | Node.js `24.18.0`，pnpm `11.25.0`。 |

### 提交历史（本轮）

| 提交 | 内容 |
| --- | --- |
| `d85672b` | 上一轮基线：桌面 UI 打磨与上线检查文档。 |
| `bfcd52e` | 按 macOS Sequoia「邮件」重做桌面界面：三栏、56px 工具栏、字号与间距体系。 |
| `3c8d1de` | 石墨黑白灰配色、Liquid Glass 材质、Apple 动效；登录/注册共用外框并平滑切换。 |
| `602285c` | Apple 灰阶、连续圆角（superellipse）、去蓝色、去光晕、弹层不「飞入」、忘记密码入口、域名后缀按长度。 |
| `ef0fd9c` | 统一窗口背景与 10px 外边距、admin 开头账号禁止删除、写信字段对齐、控件内边距、TinyMCE 去蓝。 |
| `2ca1a2a` | 7 套配色可切换、分析页一屏装下、所有卡片间距统一 10px、阅读区回复/转发与工具栏左对齐、行分隔线贯穿、删除未读小圆点、手机端菜单展开时替换内容而非遮挡。 |

---

## 2. 本地运行与检查

### 本机已有的预览（推荐）

- 地址：<http://127.0.0.1:8787/inbox>
- 启动：在 `E:/cloud-mail` 执行 `& ./mail-worker/.wrangler/local/start.ps1`。它使用独立的本地 D1/KV/R2 和本地 `wrangler.toml`（`.wrangler/` 不进 Git）。
- 本机数据库里已有演示数据：管理员收件箱有 12 封演示邮件（含附件、星标、归档、垃圾邮件、稍后处理各若干），回收站里还有 12 封重复的演示邮件（可彻底删除）。
- 改完前端后执行 `pnpm --dir mail-vue run build`，产物写入 `mail-worker/dist`，刷新浏览器即可。

### 从 GitHub 克隆后的全新环境

```powershell
pnpm --dir mail-vue install --frozen-lockfile
pnpm --dir mail-worker install --frozen-lockfile
pnpm --dir mail-vue run build
pnpm --dir mail-worker test          # 本地 vitest，当前 11 项全部通过
```

需要自己建本地 Wrangler 配置（复制 `mail-worker/wrangler.toml` 到 `mail-worker/.wrangler/local/wrangler.toml`，填本地 D1/KV/R2、`domain`、`admin`、`jwt_secret`），然后 `pnpm --dir mail-worker exec wrangler dev --config .wrangler/local/wrangler.toml --port 8787`，再访问 `/api/init/<jwt_secret>` 初始化空库。**不要把真实 secret 写进仓库、日志或文档。**

### 注入演示邮件

本地 wrangler 支持邮件处理器端点：对 `POST /cdn-cgi/handler/email?from=<发件人>&to=<收件人>` 发送原始 RFC822 文本（MIME，附件用 base64），Worker 会按真实入站流程收信。只在本地使用。

### 验收方式（本轮使用的方法）

用 Playwright（或浏览器开发者工具）在 1280×640、1440×880、1920×1080 和 390×844，浅色/深色下逐页检查，并用 `getBoundingClientRect()` 数值核对对齐，而不是只看截图。本轮核对过的关键数值：

- 外边距与卡片间距统一 10px：侧栏左 10、侧栏→内容 10、卡片之间 10、右 10、底 10（收件箱、系统设置、个人设置、分析页、帮助页）。
- 工具栏右边缘与页头右边缘一致；阅读区「回复/转发」左边缘与工具栏第一个按钮一致。
- 按钮、下拉框左右内边距 12–13px，图标到边框距离与文字到边框一致。
- 对比度 ≥ 4.5：7 套配色的选中行在浅色下最低 4.63，深色下最低 5.01。
- 分析页在 1280×640 起不出现滚动条（内容高度 = 容器高度）。

---

## 3. 设计系统（改 UI 前必须先读）

所有设计 token 集中在 `mail-vue/src/style.css` 顶部，浅色在 `:root`，深色在 `html.dark`。组件里不要写死颜色或圆角，一律用变量。

| 类别 | 变量与规则 |
| --- | --- |
| 颜色 | `--mac-app / --mac-sidebar / --mac-surface / --mac-chrome / --mac-line / --mac-text / --mac-text-2 / --mac-text-3 / --mac-hover / --mac-selected / --mac-accent / --mac-accent-ink / --mac-focus`。默认石墨灰阶，**不出现蓝色**，也不用纯黑（深色背景用 Apple 灰 `#1C1C1E`、`#141416` 等）。 |
| 窗口背景 | `--mac-wallpaper`：浅色 `#F0F0F3`，深色 `#141416`，纯色无渐变。 |
| 间距 | `--mail-shell-gutter: 10px`（所有外边距、卡片间距）、`--mail-sidebar-inset: 10px`。新页面的网格 `gap` 一律用 `var(--mail-shell-gutter)`。 |
| 圆角 | `--r-window / --r-sheet / --r-panel / --r-pop / --r-card / --r-control / --r-item / --r-small`，外大内小（同心但不等距）。支持的浏览器上通过 `@supports (corner-shape: …)` 使用 `--mac-corner: superellipse(1.6)` 连续圆角。 |
| 材质 | Liquid Glass：`--glass-bg / --glass-bg-strong / --glass-blur / --glass-edge / --glass-sidebar`。弹层背景必须用 `--glass-bg-strong`，不能透明。 |
| 动效 | `--mac-ease / --mac-ease-out / --mac-spring`、`--mac-dur-1..4`。弹层只做 `scale` + `opacity`（**不要用 `transform` 位移**，会和 popper 定位冲突，造成「飞入」），`transform-origin` 按 `data-popper-placement` 设置。所有动画都包在 `prefers-reduced-motion: no-preference` 里。 |
| 焦点 | 不要光晕。输入框聚焦只把边框加深到 `--mac-text-3`；按钮只在 `:focus-visible` 显示描边；写信窗口内联字段无边框。 |
| 字体 | 中文优先 PingFang SC，系统字体栈见 `style.css`。字号 token：`--mac-fs-*`、行高 `--mac-lh-*`。 |
| 图标 | 统一用 `components/navigation-icon`（lucide 图标映射），不要混用其他图标库或 emoji。用户头像用 `user-circle`。 |
| 滚动条 | 全局覆盖式细滚动条（`::-webkit-scrollbar`，Firefox 走 `scrollbar-width` 回退）。 |
| 配色方案 | `html[data-palette="…"]` 设置 `--pal` / `--pal-dark`，再由文件末尾的通用规则映射到 accent、选中、链接、焦点等。键名：`graphite`（默认）、`ocean`、`indigo`、`sage`、`terracotta`、`rose`、`plum`。新增配色：在 `style.css` 末尾加一个 `html[data-palette="xxx"]` 块，在 `components/palette-selector/index.vue` 的列表里加一项，并在 `i18n/zh.js`、`i18n/en.js` 加 `paletteXxx` 文案；加完要复核选中行对比度 ≥ 4.5。 |

---

## 4. 功能与代码入口

| 区域 | 入口 | 说明 |
| --- | --- | --- |
| 外壳布局 | `layout/index.vue`、`layout/main/index.vue` | 侧栏 232px，10px 外边距。≤1024px 为手机布局：打开侧栏时侧栏全宽、主内容隐藏；关闭或导航后主内容回来（`mobile-nav-open`）。 |
| 侧栏 | `layout/aside/index.vue`、`MailboxSwitcher.vue`、`AccountMenu.vue` | 顶部邮箱切换器与弹层连成一体；子菜单为树形，选中项左侧加粗竖条；底部账号菜单；折叠模式只显示图标。手机端有 `.mobile-bar` 关闭按钮。 |
| 工具栏 | `layout/header/index.vue`、`components/email-search` | 56px；侧栏开关、分栏/宽列表切换（滑块）、右侧玻璃胶囊搜索。 |
| 邮件列表 | `views/mail-workspace/index.vue`、`MessageActions.vue` | 分栏模式三栏，列表宽度 280–560px 可拖动（默认 352，存 `mail-list-px`）。行高分栏 72px、宽列表 48px。复选框与星标同一行；未读用粗体表示（已删除小圆点）；分隔线贯穿整行。Esc 在弹层打开时不关闭阅读区。 |
| 阅读区 | `views/content/index.vue`、`utils/day.js`（`formatHeaderDate`） | Gmail 式信头：主题、首字母头像、「发送至 ▾」、日期、星标、回复和更多菜单。底部「回复」「转发」为玻璃胶囊，与工具栏第一个按钮左对齐。 |
| 写信 | `layout/write/index.vue`、`components/tiny-editor/index.vue` | 发件人/收件人/主题标签列对齐，值紧跟标签；TinyMCE 工具栏去蓝、分裂按钮透明。草稿存在浏览器 IndexedDB（`mail-vue/src/db/`）。 |
| 登录/注册 | `views/login/index.vue`、`EmailField.vue` | 同一外框，滑块切换，交叉淡入。域名后缀宽度按最长域名计算。「忘记密码」目前只是提示弹窗（见待办）。 |
| 个人设置 | `views/setting/index.vue`、`components/settings-workspace`、`components/palette-selector` | 「外观与语言」里有语言、浅/深色、配色方案。配色存在浏览器本地（Pinia `ui` store 持久化），`App.vue` 和 `index.html` 启动脚本负责应用。 |
| 系统设置 | `views/sys-setting/index.vue`、`components/settings-workspace` | 左侧分类卡片 + 右侧内容卡片，间距 10px。 |
| 用户/权限/注册密钥 | `views/user/index.vue`、`views/role/index.vue`、`views/reg-key/` | 权限树箭头在右侧并带引导线。 |
| admin 账号保护 | 前端 `utils/protected-user.js`；后端 `mail-worker/src/utils/protected-user.js`、`service/user-service.js` 的 `assertDeletable` | 邮箱本地部分以 `admin` 开头（不区分大小写）的账号：前端禁止勾选和删除；后端 `delete` / `physicsDelete` 返回 403「以 admin 开头的账号受保护，不能删除」。测试在 `mail-worker/test/protected-user.spec.js`。 |
| 分析页 | `views/analysis/index.vue` | 一屏布局：标题 → 5 个指标卡 → 图表网格（左上邮件趋势、左下用户增长、右侧邮件来源跨两行），图表高度随窗口自适应，矮图自动减少 y 轴刻度；窗口高度 ≤760px 时隐藏副标题；≤1024px 宽或 ≤560px 高时退回自然高度并隐藏滚动条滚动。 |
| 帮助页 | `views/help/index.vue` | 见第 7 节。 |
| 邮件目录与权限（后端） | `mail-worker/src/service/mail-workspace-service.js`、`entity/mailbox-message-state.js`、`security/security.js` | 目录状态存 D1 `mailbox_message_state`；个人操作校验用户与邮箱归属；「全部邮件」另校验管理权限。 |
| 机器人通知 | `mail-worker/src/service/chat-bot-service.js`、`email/email.js`、`api/setting-api.js` | 系统设置 → 推送与集成。 |
| 多语言 | `mail-vue/src/i18n/zh.js`、`en.js`；后端 `mail-worker/src/i18n/` | 新文案中英文都要加。 |

---

## 5. 剩余开发工作（按优先级）

1. **配色同步到账号（可选）。** 目前配色按浏览器保存。如果需要「后台统一设置」或跨设备同步，可把 `palette` 加到用户设置表或系统设置表，由 `/api/setting` 下发，在 `App.vue` 里优先使用服务端值。
2. **忘记密码真实流程。** 现在只弹出「请联系管理员重置」提示。若要自助重置，需要后端发送验证码邮件（复用发信服务）+ 重置接口 + 前端表单，并做频率限制。
3. **手机端完整回归。** 已验证侧栏展开/收起和分析页滚动；阅读区、写信窗口、设置页在 390px 宽下还需要逐页过一遍。
4. **Firefox / Safari 复核。** 连续圆角依赖 `corner-shape`（目前主要是 Chromium 支持，其他浏览器回退为普通圆角，属预期）；`backdrop-filter` 和滚动条回退需要在 Safari、Firefox 实测。
5. **英文界面的长标签。** 1280px 宽时「Total Email Addresses」会换两行，指标卡略高，不影响一屏，但可以缩短文案。
6. **依赖告警。** 生产依赖剩余 2 项中危、1 项低危（ECharts `lines` 系列、uuid v3/v5/v6、Resend 间接依赖 deepmerge），当前代码未触发对应路径，后续升级时处理。Vite 构建有大包和 browserslist 数据过旧的警告。
7. **自动化 UI 回归。** 本轮的 Playwright 检查脚本没有进仓库。建议在 `mail-vue/tests/ui/` 加一套：登录 → 逐页截图（三种桌面尺寸 × 浅/深色）→ 断言 10px 间距、无横向溢出、分析页无纵向溢出、对比度 ≥ 4.5。

---

## 6. 部署（Cloudflare Workers，从 GitHub 拉取）

> 生产配置修改、资源迁移、正式部署都要先得到项目负责人明确同意。不要动现有生产资源和 secret。

1. **核对现有资源。** Cloudflare 控制台 → Workers & Pages → 目标 Worker → Settings：确认 Worker 名、自定义域名、绑定的 D1/KV/R2、Email Routing、现有仓库与生产分支。**先备份生产 D1。** 仓库里的 `mail-worker/wrangler.toml` 只是通用模板，`db`、`kv` 等没有生产值，直接部署会构建成功但运行时报错。
2. **准备生产配置。** 复制为 `mail-worker/wrangler.production.toml`：`name` 与生产 Worker 完全一致；填现有 `db`（D1）、`kv`，按现状保留 `r2`、`ai`、`forward`、`email` 绑定和自定义域名；保留 `main = "src/index.js"`、`assets` 目录 `./dist`、SPA 回退、`run_worker_first = true`、原有定时任务和每分钟机器人重试 `* * * * *`；`domain` 为域名数组，`admin` 为管理员邮箱；保留 `keep_vars = true`。`jwt_secret` 用 Worker 运行时 Secret，**保留原值**，否则现有登录会话全部失效。真实密钥、`.dev.vars`、本地数据库、`dist` 都不进 GitHub。
3. **配置 Workers Builds。** Root directory：`mail-worker`。Build variables：`NODE_VERSION=24.18.0`、`PNPM_VERSION=11.25.0`。Build command：
   ```sh
   pnpm install --frozen-lockfile && pnpm --dir ../mail-vue install --frozen-lockfile && pnpm --dir ../mail-vue run build
   ```
   Deploy command：`pnpm exec wrangler deploy --config wrangler.production.toml`（并删除生产配置里重复的 `[build]` 段）。监听范围保持全仓库，或至少包含 `mail-vue/**` 和 `mail-worker/**`。仓库自带的 `.github/workflows/deploy-cloudflare.yml` 是另一条发布路径，用 Git 集成时不要让两者同时部署同一个 Worker。
4. **先预览，再生产。** 以 `mail-ui-release` 为基线，用独立预览 Worker 或 Workers Previews + 独立测试绑定，确认安装、构建、登录、收发信。生产分支一推送就会触发生产部署，发布前再核对一次分支和提交 SHA，并准备好回滚（保留上一版本部署，可在控制台一键回滚）。
5. **初始化与线上验收。** 空 D1 先访问 `/api/init/<jwt_secret>` 初始化（不要把带值的 URL 写进任何文档或日志）；已有 D1 先备份，新表有按需创建逻辑（`mailbox_message_state` 等）。确认 Email Routing 规则指向该 Worker，然后用一封真实邮件验证：入站、发信、附件、星标/归档/回收站、飞书/企业微信通知。页面能打开或机器人「发送测试」成功，不代表入站触发器已经接通。
6. **上线后 UI 验收。** 按第 2 节的方法在生产域名上抽查：登录/注册切换、三栏布局、配色切换、分析页一屏、admin 账号不可删除。

参考：[Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) · [构建镜像](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/) · [预览分支](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) · [Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/) · [运行时 Secret](https://developers.cloudflare.com/workers/configuration/secrets/) · [Email Routing 到 Worker](https://developers.cloudflare.com/email-routing/email-workers/enable-email-workers/)

---

## 7. 帮助页和客户更新

入口是侧栏「获取帮助」。帮助页读取 `truemaotk/cloud-mail` 的 `project-support` 分支中的 `project-support.json`，文件不存在时使用代码内默认联系方式（微信、飞书、WhatsApp、博客）。

- 维护入口：只在项目主账号的 Worker 配置 `MAIL_SUPPORT_OWNER_EMAIL`（与该 Worker 的 `admin` 一致）和 Worker Secret `MAIL_SUPPORT_GITHUB_TOKEN`（细粒度 token，仅授予该仓库 `Contents: write`）。保存时服务端同时核验邮箱和 GitHub 账号，再写入 `project-support` 分支。
- 版本发布：先改 `mail-worker/src/service/project-service.js` 的 `version`，再为同一提交创建同版本号的 GitHub Release（如 `v0.2.0`）。帮助页只检查正式 Release。
- 客户「立即更新」：客户部署配置 `MAIL_UPDATE_REPOSITORY`（`账号/仓库`）、`MAIL_UPDATE_BRANCH`（Cloudflare 跟踪的分支）和 Secret `MAIL_UPDATE_GITHUB_TOKEN`（仅该 fork 的 `Contents: write`）。主账号点更新后，应用核验官方 Release 标签并尝试把客户分支快进到对应提交；分支已分叉或受保护时保留现状并提示。

---

## 8. 接手第一步清单

1. 按第 1 节把本机 `E:/cloud-mail` 切到 `truemaotk/mail-ui-release`，确认 `git log -1` 为本分支最新提交。
2. `pnpm --dir mail-vue run build && pnpm --dir mail-worker test`，确认构建成功、11 项测试通过。
3. 启动本地预览，按第 3 节读一遍设计 token，再动 UI。
4. 从第 5 节挑任务开发；每次改动后在三种桌面尺寸 × 浅/深色下数值核对间距与对齐。
5. 部署按第 6 节执行，每一步涉及生产的操作先征得负责人同意。
