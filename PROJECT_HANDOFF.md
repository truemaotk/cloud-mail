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

## 本轮本地验证

| 检查 | 结果 |
| --- | --- |
| 安装与打包 | 使用 Node.js `24.18.0`、pnpm `11.25.0`，两个子目录分别执行 `pnpm install --frozen-lockfile` 成功。前端 `pnpm run build` 成功；静态产物在 `mail-worker/dist`。Wrangler 使用本地配置进行 `--dry-run` 成功。 |
| 桌面交互 | Chromium 实测 1912px、1440px。单栏与分栏均有 12px 顶部留白，阅读区和列表顶边齐平，底部贴齐。侧栏箭头和数字中心实测同在 x=213px，`3`、`12`、`99+` 宽度变化时中心不偏移。复测了页面切换、折叠提示、搜索、刷新动画、分栏翻信、回复、保存草稿、邮箱弹窗和分析页。 |
| 本地接口 | 独立空 D1 初始化成功。管理员及普通账号可注册登录；验证匿名请求、跨用户邮箱读取、未授权的管理详情均被拒绝。通过 15 项邮件接口检查，覆盖查询、星标、归档、垃圾邮件、稍后处理、回收站、恢复及专用测试邮件永久删除。 |
| 机器人自动化测试 | `mail-worker` 下 `pnpm test` 通过 3 项模拟测试，包括失败重试。此次未向真实飞书或企业微信群发送消息，也未验证生产邮件路由。 |
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
