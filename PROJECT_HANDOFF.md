# mail 项目交接与上线检查

更新：2026-11-10

## 从哪里接手

- **完整项目目录：`E:/cloud-mail`。** 请把这个目录作为工作目录打开。它是独立的 Git 仓库，和 XT Social Studio 的工作树是两个项目。
- 本轮 UI、邮箱工作区、依赖更新和交接文档一起发布在用户的 `truemaotk/cloud-mail` 仓库。接手时使用 [mail-ui-release 分支](https://github.com/truemaotk/cloud-mail/tree/mail-ui-release)。
- 本机的 `origin` 指向上游 `maillab/cloud-mail`。后续发布前，用 `git remote -v` 核对推送目标为用户自己的仓库。Cloudflare 仍由 GitHub 集成拉取，生产绑定与配置由接手者核对。
- 本机预览地址：[http://127.0.0.1:8787/inbox](http://127.0.0.1:8787/inbox)。若服务停了，在项目目录执行 `& ./mail-worker/.wrangler/local/start.ps1`。这是本机已有的启动器，使用独立的本地 D1、KV、R2 和演示数据。若仅从 GitHub 克隆，需自己建本地 Wrangler 配置并初始化隔离数据；`.wrangler/local` 不随 Git 分发。

## 功能与代码入口

| 区域 | 入口与交互 |
| --- | --- |
| 邮件列表与阅读 | `mail-vue/src/views/mail-workspace/index.vue`：单栏列表、分栏阅读、刷新动画、搜索、筛选、批量操作和上一封／下一封。「全部邮件」也使用这套布局，其查询和清理保留独立权限。 |
| 导航、账号和邮箱 | `mail-vue/src/layout/aside/`：顶部邮箱切换和添加，底部账号菜单，折叠时显示图标和即时提示。导航排序按账号保存在当前浏览器。展开时箭头和数字角标共用一个中心轴；邮件区保留 12px 桌面顶部留白和直角底边。 |
| 撰写与草稿 | `mail-vue/src/layout/write/index.vue`、`mail-vue/src/db/`：回复、转发及草稿。草稿和草稿附件存在浏览器 IndexedDB 中，不随服务端或浏览器同步。 |
| 邮件目录与权限 | `mail-worker/src/service/mail-workspace-service.js`、`mail-worker/src/entity/mailbox-message-state.js`、`mail-worker/src/security/security.js`。目录状态由 D1 的 `mailbox_message_state` 保存；个人操作校验用户和邮箱归属。「全部邮件」查询另外校验管理权限。 |
| 机器人通知 | `mail-worker/src/service/chat-bot-service.js`、`mail-worker/src/email/email.js`、`mail-worker/src/api/setting-api.js`。配置入口为「系统设置 → 推送与集成」。正常通知按转发规则入队，内容包括主题、发件人和收件邮箱。保存成功和测试消息到达需要分别检查。 |
| 页面外壳和分析 | `mail-vue/src/layout/`、`mail-vue/src/style.css`、`mail-vue/src/views/analysis/index.vue`。桌面共用 64px 顶栏和 16px 内容边距。延续现有黑白灰主题，本轮未切换配色。 |
| 弹窗、下拉与表格 | `mail-vue/src/App.vue` 和 `mail-vue/src/style.css` 统一居中、圆角与控件尺寸；菜单、日期面板和邮箱切换仍贴住触发控件。权限、用户、注册密钥和 Token 表格共用完整边框。写信小窗停靠右下，放大后居中。 |
| 用户邮箱分页 | `mail-vue/src/views/user/index.vue` 与 `mail-worker/src/service/account-service.js`。首屏从第 1 页开始，分页只在超过一页时出现，表格与分页相距 12px。查询总数与列表使用相同条件，均排除登录邮箱，按邮箱 ID 稳定分页。 |

## 桌面界面复核（2026-11-10）

| 步骤 | 界面与结果 |
| --- | --- |
| 1 | 登录与注册：保持同一外框尺寸，表单区域居中，桌面状态无多余滚动条。启动页图标与进度条间距为 16px。 |
| 2 | 邮件工作区：核对各目录、空状态、搜索筛选、分栏详情和邮箱／账号菜单。保留既定的邮件面板直角底边、顶部留白及贴附菜单。 |
| 3 | 撰写和编辑：小窗停靠右下，放大后在视口内居中。编辑器的下拉和插入链接弹窗使用与主界面一致的圆角与黑白灰色；Esc 关闭下拉时保留写信窗口。 |
| 4 | 用户、权限和注册密钥：检查边框连续、普通下拉与输入框等高、表单标签与控件对齐。用户邮箱单页隐藏分页，多页留出间距；较矮窗口中权限弹窗正文可滚动。 |
| 5 | 个人设置、系统设置和分析：检查分类卡片、配置项、Token 空状态、日期面板，以及深色分析页。 |
| 6 | 获取帮助：验证联系方式骨架屏、正式内容及版本区。普通部署显示联系方式，维护入口需按下文配置。 |

本次复核使用 Edge 的 1440×880 和 1280×640 桌面视口。截图和本地核对日志位于 `mail-worker/.wrangler/local/output/playwright/ui-release/`，未提交到 Git。使用的是本地演示数据与受控分页样例，未发送邮件或机器人测试消息。此轮覆盖桌面可达页面与代表性交互；未在生产环境修改设置或验证真实外部投递。

## 本地构建与功能检查

| 检查 | 结果 |
| --- | --- |
| 安装与打包 | 使用 Node.js `24.18.0`、pnpm `11.25.0`，两个子目录分别执行 `pnpm install --frozen-lockfile` 成功。前端 `pnpm run build` 成功；静态产物在 `mail-worker/dist`。Wrangler 使用本地配置进行 `--dry-run` 成功。 |
| 邮件工作区基线 | 上一轮 Chromium 实测 1912px、1440px。单栏与分栏均有 12px 顶部留白，阅读区和列表顶边齐平，底部贴齐。侧栏箭头和数字中心实测同在 x=213px，`3`、`12`、`99+` 宽度变化时中心不偏移。覆盖了页面切换、折叠提示、搜索、刷新动画、分栏翻信、回复、保存草稿、邮箱弹窗和分析页。 |
| 本地接口 | 独立空 D1 初始化成功。管理员及普通账号可注册登录；验证匿名请求、跨用户邮箱读取、未授权的管理详情均被拒绝。通过 15 项邮件接口检查，覆盖查询、星标、归档、垃圾邮件、稍后处理、回收站、恢复及专用测试邮件永久删除。 |
| Worker 自动化测试 | `mail-worker` 下 `pnpm test` 通过 8 项测试，包括 3 项机器人通知测试和 5 项帮助页、版本更新测试。本地分页接口验证了总数、分页边界与结果无重复。 |
| 依赖扫描 | 升级 S3 SDK、Hono、Drizzle、Vue、Axios 等依赖，移除未使用的旧 Cloudflare Vite 插件。更新后两个子项目的生产依赖扫描均无严重或高危告警。剩余 2 项中危、1 项低危：ECharts 的 `lines` 序列提示风险（当前只注册并使用 `bar`、`line`）、uuid 的 v3/v5/v6 缓冲区告警、Resend 间接依赖 deepmerge 告警。保留后续升级任务，涉及真实发件和 S3 的回归仍需在测试环境完成。 |

本轮另外将原来会部署测试 Worker 的 `pnpm test` 改成真正的本地测试。部署旧测试环境需要明确执行 `pnpm run deploy:test`，日常验证不需要用它。Vite 构建仍有大包和浏览器数据过旧的警告。开发机的测试日志和演示截图在 `mail-worker/.wrangler/local`，其中 `output/playwright/mail-release-layout.png` 对应这次的侧栏和留白。

复现本地打包与测试，在项目根目录运行：

```powershell
pnpm --dir mail-vue install --frozen-lockfile
pnpm --dir mail-worker install --frozen-lockfile
pnpm --dir mail-vue run build
pnpm --dir mail-worker test
pnpm --dir mail-worker exec wrangler deploy --dry-run --config .wrangler/local/wrangler.toml --outdir .wrangler/local/handoff-dry-run
```

## 上线方式：Cloudflare Workers 从 GitHub 拉取

**建议沿用现有 Worker，通过 [Cloudflare 控制台](https://dash.cloudflare.com/) → Workers & Pages → 目标 Worker → Settings → Build 连接 GitHub。** 仓库原有的 `.github/workflows/deploy-cloudflare.yml` 是另一条发布路径，会在 `main` 的相关提交上自动运行。在 Cloudflare 使用 Git 集成时，避免让该 workflow 同时部署同一个 Worker。

1. **核对现有资源。** 在目标 Worker 确认绑定的仓库和生产分支、Worker 名、自定义域名及现有 D1/KV/R2。先备份生产 D1；升级时保留现有数据和绑定。当前已跟踪的 `mail-worker/wrangler.toml` 是通用模板，里面 `db`、`kv` 等资源未填生产值。直接部署模板可能构建成功却在登录或访问数据库时报错。
2. **准备生产配置。** 从 `mail-worker/wrangler.toml` 复制成待提交的 `mail-worker/wrangler.production.toml`，将 `name` 和生产 Worker 名设为完全一致，填现有 `db`（D1）和 `kv`，按当前部署保留 `r2`、`ai`、`forward` 及有使用时的 `email` 绑定和自定义域名配置。保留 `main = "src/index.js"`、`assets` 目录 `./dist`、SPA 回退、`run_worker_first = true`，以及原有定时任务和每分钟机器人重试（`* * * * *`）。`domain` 要是域名数组，`admin` 要是对应邮箱。保留 `keep_vars = true`；`jwt_secret` 用 Worker 的运行时 Secret 配置，升级保留原值，避免现有会话失效。真实密钥、Webhook、`.dev.vars`、本地数据库和 `dist` 不进入 GitHub。
3. **配置 Workers Builds。** Root directory：`mail-worker`；Build variables：`NODE_VERSION=24.18.0`、`PNPM_VERSION=11.25.0`。Build command 填下面的两套依赖安装及前端构建命令，生产配置中删除重复的 `[build]` 段。Deploy command：`pnpm exec wrangler deploy --config wrangler.production.toml`。保留默认的全仓库监听范围，或把 `mail-vue/**` 和 `mail-worker/**` 都列进监听范围。见 [构建配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[构建镜像版本](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)。
4. **先验预览再上生产。** 以已发布的 `mail-ui-release` 为基线，核对 Cloudflare 拉取的仓库、分支和提交 SHA。用独立预览 Worker 或 [Workers Previews](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) 加独立测试绑定确认安装、构建、登录与资源。生产分支推送会触发生产部署。补齐生产配置后，发布前再次核对目标分支和生产绑定。
5. **初始化与线上验收。** 空 D1 必须先走项目的初始化流程；已有 D1 先备份，再按需迁移。现有初始化入口是 `/api/init/:secret`，参数使用 Worker 的 `jwt_secret`，不要把带值的地址写到文档、日志或共享历史中。新表也有按需创建逻辑。检查 Cloudflare Email Routing 的地址规则是否指向这个 Worker，并用一封真实测试邮件确认入站、发件、附件和已配置的飞书／企业微信通知。页面打开或机器人「发送测试」成功，不能单独证明入站触发器已经接通。

```sh
pnpm install --frozen-lockfile && pnpm --dir ../mail-vue install --frozen-lockfile && pnpm --dir ../mail-vue run build
```

Cloudflare 参考：[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)、[运行时 Secret](https://developers.cloudflare.com/workers/configuration/secrets/)、[Email Routing 到 Worker](https://developers.cloudflare.com/email-routing/email-workers/enable-email-workers/)。

## 接手后的优先顺序

先打开 `E:/cloud-mail` 的现有工作区验收布局；然后核对 Cloudflare 中的真实生产绑定及授权仓库，补齐生产配置，跑一次隔离预览。生产发布前核对当前版本和 D1 备份，留好回滚路径。此次本地验证通过，但 Cloudflare 生产绑定、线上收发与机器人链路仍待验收。

## 帮助页和客户更新

入口是侧栏的「获取帮助」。帮助页读取 `truemaotk/cloud-mail` 的 `project-support` 分支内的 `project-support.json`，文件建立前使用代码内的默认联系方式。微信号可复制，飞书可分别填写显示号码和邀请链接，WhatsApp 号码会生成聊天链接，博客打开所填网址。四个默认图标使用项目维护者提供的 SVG。

在官方仓库创建 `project-support` 分支。只在项目主账号使用的 Worker 里配置 `MAIL_SUPPORT_OWNER_EMAIL`，值与该 Worker 的 `admin` 一致。用 `truemaotk` 的细粒度 GitHub token 配置 Worker Secret `MAIL_SUPPORT_GITHUB_TOKEN`，授予官方仓库的 `Contents: write` 权限。保存联系方式时，服务端同时核验邮箱和 GitHub 账号，随后将公开内容写入独立分支。客户部署从同一公开来源读取信息。GitHub 的文件更新接口用文件 SHA 校验编辑版本。[GitHub 仓库内容接口](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)

正式发布时，先更新 `mail-worker/src/service/project-service.js` 里的 `version`，再在官方仓库为同一提交创建相同版本号的 GitHub Release，例如 `v0.2.0`。帮助页只检查正式发布。客户 Worker 继续使用 Cloudflare Git 集成，跟踪其自己的 fork 部署分支。[GitHub 发布接口](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)

如需启用「立即更新」，客户部署须配置自己的 `MAIL_UPDATE_REPOSITORY`（格式为 `账号/仓库`）、`MAIL_UPDATE_BRANCH`（Cloudflare 跟踪的分支），以及 Worker Secret `MAIL_UPDATE_GITHUB_TOKEN`（仅授权该 fork 的 `Contents: write`）。只有该部署的主账号可提交更新。应用核验官方发布标签后尝试将客户分支快进到对应提交，Cloudflare 接收 GitHub 的分支更新后构建。若分支已分叉或受保护，应用保留当前分支并提示在 GitHub 处理。[GitHub 分支引用接口](https://docs.github.com/en/rest/git/refs#update-a-reference) · [Cloudflare Git 集成](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
