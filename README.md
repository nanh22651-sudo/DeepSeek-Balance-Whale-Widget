# DSH 小鲸鱼余额挂件（DeepSeek Balance Whale Widget）

![DSH 小鲸鱼余额挂件](assets/DSH2.png)

DeepSeek Harness（DSH）Web 界面右下角的常驻余额挂件：小鲸鱼气泡图 + DeepSeek API 余额 + 多对话/多工作区用量统计，每次打开界面自动启用。本项目是标准 DSH 插件包，可通过 `dsh plugin` 安装/卸载。

> **非官方增强版**：本仓库 Fork 自 MeteorNOX 的 [DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)，保留原作者版权与 MIT License。本分支增加了安全性改造、多对话/工作区统计、可视化价格与台词管理等功能；修改版问题请在本仓库反馈。

## 特性

- 🐋 **常驻自启**：随 DSH Web 界面每次打开自动出现（标准 DSH bundle 插件）
- 💰 **余额**：60 秒自动刷新 + 点击鲸鱼手动刷新；余额变化时数字**滚动动画**；瞬时网络抖动自动沿用最近余额不报错
- 📊 **账户今日已用**：两种模式任选（见下），与 DSH 最近一轮费用明确区分
  - **小鲸鱼记账（推荐，免令牌）**：不需要任何会话令牌，鲸鱼娘每次观测余额后用余额差值自动记账（`.dshw-usage.json`，跨天自动归零归档）
  - **实时·令牌**：填入平台会话令牌后直接调用平台用量接口，按**峰谷定价**（工作日高峰 9:00–12:00 与 14:00–18:00，其余空闲；2026-08-23 起周末全天按谷价）实时换算今日已用
- 💬 **DSH 最近一轮费用**：监听本机会话事件；Token 数取自 DeepSeek API usage，金额按本地价格配置换算
  - `reasoningTokens` 仅作为 `outputTokens` 的明细展示，不重复加入总 Token 或费用
  - 未知模型仍显示 Token 数，但显示“无法估价”，不会偷偷套用其他模型价格
  - 菜单可开关「每轮对话后自动显示消耗金额」；余额、费用和聊天台词三类气泡分别设置停留秒数（填 0 表示不自动关闭）
  - 消耗金额泡泡显示期间，余额变动不弹普通泡泡
- 🧭 **多对话与多工作区统计**：使用 DSH 的稳定 `session.id`、`cwd` 和 `parentSession` 分别统计最近一轮、当前对话、当前工作区和 DSH 今日总计
  - 子智能体默认归入根对话，同时在菜单中拆分主智能体/子智能体金额
  - 切换对话或工作区后自动显示对应统计；无法确定工作区时归入“未归属工作区”
  - 事件通过 SSE 实时推送，断线时使用 15 秒低频轮询兜底
- 🖱️ **拖拽 + 四边四分之一吸附**（左/右/上/下，角落可组合）
- 🔄 左吸附时整体**水平镜像翻转**（文字同步反向、带动画）
- 🧸 **按压 Q 弹**玩偶效果（按压时底部坐标不变）
- 📈 **峰谷状态**：菜单持续显示当前峰价/谷价、周末全天谷价和下一次切换时间；当前生效的价格列会在编辑器中高亮
- ✏️ **可视化价格编辑器**：表格编辑价格和核对日期，保存前校验并预览变更；自动备份、恢复上次备份、恢复内置价格；高级模式可新增模型和维护别名
- 🎚️ **汉堡菜单**（悬停鲸鱼右上角出现）：大小、音效、音量、用量模式、三类气泡时长、气泡开关、每轮消耗、价格编辑和互动偏好
- 🔊 **音效**：按压/松手音效（可选包内 mp3，缺失时静默降级）
- 💬 **鲸鱼娘互动**：余额查询与聊天分离；点击鲸鱼查询，悬停后点击鲸鱼旁的 💬 按钮可一键聊天，点击已打开的气泡也可切换台词
- 📝 **可视化台词管理器**：增删改、启停、情境、稀有度、权重、搜索筛选和气泡预览；支持保存预览、自动备份、恢复内置、JSON 导入导出及安全动态变量
- 🎲 **情境台词**：峰谷、周五、低余额、高消耗与真实错误分别触发对应台词；尖锐台词默认关闭，由用户逐条启用，不再使用全局“性格”选项
- 📐 随浏览器窗口自动缩放；文字位置/字号与图片联动

## 目录结构

```text
dsh-whale-widget/
├── package.json          # DSH bundle 插件元数据
├── README.md             # 本文件
├── cordis.patch.yml      # 插件挂载声明
├── client/
│   ├── widget.js         # 浏览器端挂件、样式与交互
│   └── session-bridge.js # 从 DSH 客户端服务发布当前对话 ID
├── lib/
│   ├── index.js          # 宿主入口与 Web 路由
│   ├── config.js         # 设置校验与持久化
│   ├── http-security.js  # 同源与请求方法保护
│   ├── pricing.js        # 峰谷定价和用量换算
│   ├── pricing-store.js  # 用户价格文件加载、校验与安全回退
│   ├── dialogues.js      # 内置台词、分类、动态变量和格式校验
│   ├── dialogue-store.js # 用户台词文件、原子保存与备份恢复
│   ├── conversation-usage.js # 多对话/工作区持久化账本与汇总
│   └── usage-ledger.js   # 本地余额差值账本
├── tests/                # 定价、账本、配置与同源策略测试
├── pricing.example.json  # 可编辑价格文件示例
├── assets/
│   ├── DSH2.png          # README 顶部展示图
│   ├── DSniang1.png      # 小鲸鱼本体（cut-out，气泡由代码绘制）
│   ├── DSniang02.png     # 备用整图（兼容旧版手动安装路径）
│   ├── rua.gif           # 随机台词 gif（可选）
│   ├── Ya1.mp3 / Ya2.mp3 # 小黄鸭音效（可选）
│   └── D1.mp3 / D2.mp3   # 音效1（可选）
└── whale-widget-prompt.md # 完整规格/维护提示词
```

## 安装

### 方式 A：直接从 GitHub 安装（推荐）

无需本地克隆，一条命令安装：

```powershell
dsh plugin --profile web add github:nanh22651-sudo/DeepSeek-Balance-Whale-Widget
```

说明：

- 装完后插件会出现在 DSH 的**插件管理页面**里，之后可以直接在页面里更新，无需再手动执行命令
- 网络环境需要代理时，先设置代理环境变量再执行：
  ```powershell
  $env:http_proxy="http://<ip>:<port>"; $env:https_proxy="http://<ip>:<port>"; $env:all_proxy="socks5://<ip>:<port>"; dsh plugin --profile web add github:nanh22651-sudo/DeepSeek-Balance-Whale-Widget
  ```
- 安装完成后重启 `dsh web`，再 F5 刷新浏览器

### 方式 B：本地安装（从当前仓库）

在**仓库根目录**（`DeepSeek-Balance-Whale-Widget`，即 `package.json` 所在目录）执行：

```powershell
dsh plugin --profile web add link:.
```

说明：

- `dsh plugin` 会把参数转发给 pnpm，并在成功后自动把 `dsh-whale-widget` 加入 `dsh.profile.bundles`
- **`link:.` 表示链接当前目录**（仓库根目录本身就是插件包）。如果你复制了仓库到别处，用绝对路径：
  ```powershell
  dsh plugin --profile web add link:D:\你的路径\DeepSeek-Balance-Whale-Widget
  ```
- ⚠️ 不要用 `link:.\dsh-whale-widget`——仓库里**没有** `dsh-whale-widget/` 子目录，这样会安装成普通依赖而非插件，重启后挂件不出现
- 安装完成后重启 `dsh web`，再 F5 刷新浏览器
- **如果之后移动了源码目录**，必须重新执行一次 `dsh plugin --profile web add link:.<新路径>`。若提示已存在/冲突，先 `dsh plugin --profile web remove dsh-whale-widget` 再重新 add

### 方式 C：发布到 npm 后安装

```powershell
dsh plugin --profile web add dsh-whale-widget
```

### 给 AI 的安装说明（用 dsh 辅助安装时，直接复制给 AI）

如果你希望让另一个 DSH / AI 助手帮你安装，把下面这段发给它即可：

```
请帮我安装插件 dsh-whale-widget，来源是 GitHub 仓库 nanh22651-sudo/DeepSeek-Balance-Whale-Widget（MeteorNOX 原项目的非官方增强版）。

步骤：
1. 确保 pnpm 可用（没有就先：npm install -g pnpm）
2. 在 Web profile 安装（任选一种来源）：
   首选，直接从 GitHub 安装（无需本地克隆，装完可在插件管理页面里更新）：
     dsh plugin --profile web add github:nanh22651-sudo/DeepSeek-Balance-Whale-Widget
   或从本地仓库链接安装（例如本地克隆的仓库根目录）：
     dsh plugin --profile web add link:.<仓库绝对路径>
   （注意：仓库根目录就是插件包，不要写成 link:.\dsh-whale-widget 这种带子目录的路径）
3. 如果报 pnpm 阻止构建脚本（allowBuilds 相关），在 C:\Users\<用户名>\.dsh\profiles\web\pnpm-workspace.yaml 的 allowBuilds 下加对应的包 key，然后重跑
4. 重启 dsh web，然后 F5 刷新浏览器

安装后验证：
- dsh --profile web --dump-config 应该能看到 dsh-whale-widget 在 bundles 里
- curl http://127.0.0.1:3080/dsh-whale/balance.json 应返回 200 JSON（含 totalBalance）
- curl http://127.0.0.1:3080/dsh-whale/widget.js 应返回 200 JS

另外请检查 DSH 凭据里是否配置了 DEEPSEEK_API_KEY（没有就提示用户配置；DEEPSEEK_PLATFORM_TOKEN 可选，不配也能用默认的记账模式）。
```

### 关于令牌（安装后必读）

> **默认不需要任何令牌。** 安装后只需配置 `DEEPSEEK_API_KEY`（拉取余额必需），「今日已用」会自动使用默认的**小鲸鱼记账**模式（余额差值本地记账），开箱即用。
>
> 「实时·令牌」模式用到的 `DEEPSEEK_PLATFORM_TOKEN`（DeepSeek 平台网页会话令牌）是**可选的**，仅在你想要更精确的实时用量换算时才需要配置。获取方式见下方「用量模式使用教程」。

## 卸载

```powershell
dsh plugin --profile web remove dsh-whale-widget
```

## 从旧手动安装升级

如果你之前按旧方式手动安装过（复制 `whale-balance.mjs` + 改 `cordis.patch.yml`），先清理：

```powershell
$web = "$env:USERPROFILE\.dsh\profiles\web"

Remove-Item "$web\whale-balance.mjs" -ErrorAction SilentlyContinue
Remove-Item "$web\whale-balance.cjs" -ErrorAction SilentlyContinue
Remove-Item "$web\DSniang1.png" -ErrorAction SilentlyContinue
Remove-Item "$web\DSniang02.png" -ErrorAction SilentlyContinue
```

然后编辑 `$web\cordis.patch.yml`，删除这段旧补丁：

```yaml
- insert:
    - id: whale-balance-widget
      name: ./whale-balance.mjs?v=1
```

如果里面只有这段，直接改成：

```yaml
[]
```

清理后再执行上面的安装命令。

## 用量模式使用教程

### 必需的凭据

- **`DEEPSEEK_API_KEY`**（必需）：DeepSeek API 密钥，用于拉取余额（`api.deepseek.com/user/balance`）。在 DSH 凭据服务中配置即可（`dsh` 的凭据管理界面 / `.dsh/.credentials.yaml`）。

### 两种用量模式

挂件的「账户今日已用」有两种模式，在**菜单 → 账户用量**中选择：

**① 小鲸鱼记账（推荐，默认）—— 完全不需要额外配置**

鲸鱼娘自己用**余额差值**记账：每次观测到余额下降就把差值累加到当天用量，跨天自动归零归档（保留 30 天）；观测币种发生变化时只重置基准、不记差值（防止多币种账户切换污染账本）。只要配好了 `DEEPSEEK_API_KEY` 就能用，**开箱即用**。

- 账本文件：`$DSH_HOME/.dshw-usage.json`（自动生成）
- 优点：零配置、免令牌
- 说明：依赖「观测到的余额下降」累计，若 DSH 关闭期间有消耗会漏记；要精确请用令牌模式

**② 实时·令牌（可选）—— 需要 `DEEPSEEK_PLATFORM_TOKEN`**

鲸鱼娘直接调用 DeepSeek 平台用量接口，按**峰谷定价**实时换算今日已用，**精确到每小时的 token 用量**。

**令牌在哪获取：**
1. 浏览器打开并登录 **https://platform.deepseek.com**
2. 按 **F12** 打开开发者工具 → 切到 **Network（网络）** 标签
3. 在平台页面点击「用量」或刷新页面，找到名为 `usage/by_api_key/amount` 的请求
4. 点开该请求 → **Request Headers（请求标头）** → 复制 `Authorization` 的值（形如 `Bearer eyJ...` 的一长串）
5. 把整段值（含 `Bearer` 前缀或只要后面的 token 部分均可）配置为 DSH 凭据 `DEEPSEEK_PLATFORM_TOKEN`：
   ```powershell
   # 在 DSH 凭据服务中设置，例如编辑 $env:USERPROFILE\.dsh\.credentials.yaml
   # DEEPSEEK_PLATFORM_TOKEN: <你复制的令牌>
   ```
6. 重启 `dsh web`，在**菜单 → 用量**里选择「实时·令牌」

**说明：**
- ⚠️ **令牌非必需**：不配置时挂件自动使用默认的「小鲸鱼记账」模式，功能不受影响
- 该令牌是 DeepSeek **平台网页的会话令牌**（不是 `sk-` 开头的 API key），仅在登录平台网页时有效；重新登录后可能需要重新获取
- 接口不返回金额，只返回 token 分桶，挂件会按内置峰谷定价表换算成金额；定价表集中在 `lib/pricing.js`，DeepSeek 调价时可在该文件中维护并运行测试

### 对话与工作区消耗（无需任何凭据）

插件直接监听 DSH 本机会话事件，按模型真实 usage 换算金额（与账户今日用量使用同一套价格配置），**不需要** `DEEPSEEK_PLATFORM_TOKEN`。菜单分别展示最近一轮、当前对话、当前工作区和所有工作区的 DSH 今日合计；子智能体通过 `parentSession` 归入根对话且只计一次。

对话账本保存在 `%USERPROFILE%\.dsh\dsh-whale-conversations.json`。写入时先生成临时文件，并保留上一版 `.bak`；跨天自动开始新的当日统计。这里记录的是 DSH 捕获到的调用，不代表同一 DeepSeek 账户在其他程序中的消耗，因此“DSH 今日合计”和“账户今日消耗”可能不同。

气泡使用短文案“今日消耗约：¥x.xx”；账户统计来源（平台或余额变化估算）以及对话明细放在菜单中。

### 自定义 Token 价格

推荐直接打开**小鲸鱼菜单 → 编辑价格**。三个内置模型以表格显示，绿色列表示当前正在生效的峰价或谷价。修改后先点“检查并预览”，核对变更摘要，再点“确认保存”。高级选项可以新增模型并用英文逗号填写别名。

每次界面保存都会先把旧文件复制为 `dsh-whale-pricing.json.bak`。编辑器可恢复上一次备份，也可恢复插件内置默认价格；这两项操作同样需要二次确认。

仍然可以手工编辑下列文件：

插件第一次实际读取余额或计算费用时，会自动创建：

```text
%USERPROFILE%\.dsh\dsh-whale-pricing.json
```

价格单位为人民币/百万 Token。可以参考包内 `pricing.example.json` 修改模型、别名、缓存命中、缓存未命中、输出价格、峰谷时间和核对日期。保存后会在下一次费用计算时重新读取；余额接口已有结果最多可能继续缓存 25 秒。

保护规则：

- 配置必须是 `version: 1`，币种必须为 `CNY`。
- 价格必须是非负有限数字，峰谷时间必须有效。
- 配置损坏时自动回退内置价格，并在宿主日志发出一次警告。
- 未知模型不使用默认价格，避免产生看似精确但错误的金额。
- 挂件菜单会显示当前使用“用户配置”还是“内置回退”，以及价格最后核对日期。

### 自定义鲸鱼娘台词

打开**小鲸鱼菜单 → 管理台词**，或在“编辑价格”窗口切换到“台词管理”标签。每条台词可以设置：

- 情境：日常、高峰、谷价、周五、低余额、高消耗、真实错误、罕见彩蛋或尖锐吐槽。
- 稀有度：普通、特殊或罕见；菜单中的“台词频率”会调整特殊和罕见台词的抽取比例。
- 权重：同一候选池中，权重越高越容易被选中，范围为 1–100。
- 启用状态：尖锐吐槽默认关闭，需要用户明确启用。

“预览”会暂时隐藏设置窗口，并让鲸鱼娘显示当前台词，不包含语音朗读。编辑器支持导入和导出 JSON；导入内容不会立刻保存，仍需经过“检查并预览 → 确认保存”。

支持的动态变量如下，显示时只做纯文本替换，不执行代码：

```text
{balance}       当前余额
{todayUsage}    账户今日消耗
{sessionUsage}  当前对话消耗
{timeBand}      当前峰价或谷价
{nextChange}    下一次峰谷切换时间
{model}         最近可识别的模型名称
```

用户台词保存在 `%USERPROFILE%\.dsh\dsh-whale-dialogues.json`，上一次有效版本保存在同目录的 `.bak` 文件中。单条台词最多 160 字、总数最多 500 条；未知变量和无效分类会被拒绝。所有内容均通过 `textContent` 显示，因此类似 HTML 的文字不会被当作页面代码执行。

## 验证

```powershell
dsh --profile web --dump-config | Select-String -Pattern "whale"

curl http://127.0.0.1:3080/dsh-whale/image.png
curl http://127.0.0.1:3080/dsh-whale/balance.json
curl http://127.0.0.1:3080/dsh-whale/size.json
curl http://127.0.0.1:3080/dsh-whale/last-turn.json
curl http://127.0.0.1:3080/dsh-whale/usage.json
curl http://127.0.0.1:3080/dsh-whale/pricing.json
curl http://127.0.0.1:3080/dsh-whale/dialogues.json
```

- `/dsh-whale/image.png` → 200 `image/png`
- `/dsh-whale/balance.json` → 200，含 `{"ok":true,"totalBalance":...,"currency":"CNY","todayUsage":...}`
- `/dsh-whale/size.json` → GET 返回配置；PUT 写入
- `/dsh-whale/last-turn.json` → 200，含最近一轮对话消耗 `{seq, turn, amount, tokens}`
- `/dsh-whale/usage.json?sessionId=...` → 200，含当前对话、工作区、今日合计和子智能体拆分
- `/dsh-whale/events?sessionId=...` → SSE 实时用量事件；浏览器断线后自动回退低频查询
- `/dsh-whale/pricing.json` → GET 读取编辑器数据；PUT 校验并保存；POST 恢复备份或内置价格
- `/dsh-whale/dialogues.json` → GET 读取台词；PUT 校验并保存；POST 恢复备份或内置台词
- 浏览器 F5 后右下角出现挂件

## 常见问题

- **挂件不出现**：确认 `dsh plugin add` 成功；`dsh --profile web --dump-config` 里能看到 `dsh-whale-widget`；重启 `dsh web` 后 F5。
- **图片不显示**：确认 `assets/DSniang1.png` 在插件包内，且没有把旧文件放在 profile 里占用了同名路由。
- **余额报「未配置 DEEPSEEK_API_KEY」**：去 DSH 配置凭据。
- **今日已用显示 --**：记账模式下需要先跑一次余额观测（60 秒内自动完成）；令牌模式需要配置 `DEEPSEEK_PLATFORM_TOKEN`。
- **最近一轮费用不显示**：确认菜单「每轮对话后自动显示消耗金额」已勾选；一轮对话必须完整结束（turn/end）才会结算。
- **当前对话显示“未选择”**：确认浏览器已加载当前版本的客户端桥接模块，并在重启 `dsh web` 后执行一次强制刷新。
- **显示“无法估价”**：当前模型不在 `%USERPROFILE%\.dsh\dsh-whale-pricing.json` 中；补充模型或别名后再次发起一轮对话。
- **没有声音**：确认 `assets/*.mp3` 在包内；若不想带音效文件，静默降级为无声音。
- **本地开发改了代码不生效**：使用 `link:` 安装时，修改源码后重启 `dsh web`（ESM 模块缓存）；如果用已发布版本，需要 `npm publish` 新版本后 `dsh plugin --profile web update dsh-whale-widget`。
- **自定义图片**：气泡由代码绘制（SVG），鲸鱼本体为 cut-out PNG，放在右下角 59.45%；换图需保证透明背景 cut-out，否则按 `whale-widget-prompt.md` 调整几何参数。

## 开发与维护

完整规格、视觉参数、架构结论和生成提示词见 `whale-widget-prompt.md`。修改文字位置、颜色、动画、吸附逻辑、台词组或定价表时参考该文件。

本地检查（Node.js 22 或更高版本）：

```powershell
npm run check
npm test
```

安全说明：余额、对话用量、实时事件和设置接口仅接受本机回环地址上的同源访问，不向第三方网页开放 CORS。设置写入会校验字段类型和范围；挂件仍可通过同源 DSH Web 页面正常访问这些接口。若明确通过反向代理或自定义域名使用，可把允许的完整 origin（多个值用逗号分隔）配置到 `DSH_WHALE_ALLOWED_ORIGINS`。

## 许可证

本项目基于 **MIT License** 开源，详见 [LICENSE](LICENSE)。
