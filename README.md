# Joe

Joe 是以语音为主要交互方式的本地单用户 AI Agent。Web 使用 React、TanStack Start、Tailwind CSS 和 Base UI，服务端使用 Mastra；模型通过 OpenRouter 接入，语音通过统一 Provider 接口接入 Fish Audio 或 ElevenLabs。

## 启动与配置

使用 Bun 1.3.14 或更新版本管理依赖与脚本，应用运行仍需 Node.js（推荐 24）。在根目录一次安装前后端依赖：

```sh
bun install
cp backend/.env.example backend/.env
```

前后端通过 workspaces 管理，共用根目录的 `bun.lock`。CI 安装使用 `bun install --frozen-lockfile`。

在 `backend/.env` 填写：

- `OPENROUTER_API_TOKEN`：OpenRouter 凭据。
- `backend/src/config/models.ts`：模型列表的唯一配置来源。`type: Think` 用于对话与设置选择，`type: Decision` 留给决策调用；旧 `JOE_MODELS_JSON` 环境变量不再读取。可选费率单位为 USD / 百万 Token。
- `FISH_API_TOKEN`、`FISH_REFERENCE_ID`：Fish 凭据及音色 ID；ASR / TTS 模型通过环境变量设置。
- 语音及天气服务配置见 `.env.example`。凭据只在 backend，不能放进 `VITE_*` 环境变量。

在根目录同时启动 Web 与后端：

```sh
bun run dev
```

按 Ctrl+C 同时停止两个服务；也可分别使用 `bun run dev:web` 和 `bun run dev:backend`。

- 正式会话：<http://127.0.0.1:5173/joe>
- 原视觉预览：<http://127.0.0.1:5173/preview>，根路由仍跳转到预览。
- Mastra 服务：127.0.0.1:4111。

修改凭据、模型列表或费率后重启后端，在 Web 点击重新连接或刷新。配置状态仅表示配置项存在，不能证明凭据、余额或模型权限有效。未配置时不生成模拟答案。

## 会话与语音

`/joe-legcy` 采用固定图片背景与中性磨砂卡片，默认对话为主、费用为次。底部常驻时间、卡片总览和 Joe 小球入口；首版含对话、费用、时间和设置四类卡片。点击次卡片或左右滑动交换主次，窄屏只显示主卡片。详细规则见 [交互设计](docs/interaction-design.md)。

- 文字通过 AI SDK UI Message SSE 流式返回，AI 在左，用户在右。Mastra Memory 统一保存消息、来源和情绪元数据；Joe SQLite 保存会话注册、设置、附件和用量，浏览器保存当前会话 ID。
- 语音回答默认开启。回答完成后按语音配置准备播报文本，再按短句送对应音色的 TTS，逐句合成和播放，实际音频 RMS 驱动粒子强度；这是短句队列播放，不是双向实时音频流。
- 首次访问弹出语音启用卡片，确认后申请麦克风授权并解锁语音播放；跳过或失败仍可使用文本。启用后持续接听，停顿约 1 秒自动分句发送，不因静音或卡片切换而自动关闭；对话卡片内可静音／恢复。设置中的默认静音只在每次进入时应用。新语音与文本消息都可中断当前回答。
- 停止、开启下一轮或开始录音会取消当前回答/音频，迟到的响应不会恢复播放。关闭语音会立即停止，并禁止本轮后续合成；重新开启对下一轮生效。
- 附件支持 UTF-8 `.md` / `.txt`，单文件不超过 1MB / 60,000 字符，每轮最多五个。后续追问保留最近 30 条消息及对应附件上下文；较大上下文仍受所选模型限制。附件作为不可信资料传递，不执行其中指令。
- 新会话切换到空白会话，旧会话仍保存在本地数据库；此版不提供会话历史选择器。
- 首页通过客户端公网 IP 自动定位并显示当前天气，缓存 15 分钟；设置中不再填写城市或时区。显示时间跟随定位返回的时区，费用统计保留原统计时区。
- 定时任务保留设置占位，尚不执行任务。

## 状态与情绪协议

运行状态由实际录音、模型、工具和播放生命周期产生，模型只决定表达情绪。Joe 使用温暖、好奇的 ENFP 表达风格；这不是人格测评或“某人格情感最丰富”的科学结论。

| 状态 | 触发 | 视觉 |
| --- | --- | --- |
| idle | 等待输入 | 轻微呼吸与低速流动 |
| listening | 麦克风录音 | 聚焦、适度增强 |
| transcribing | ASR 请求 | 温和汇聚 |
| thinking | 模型生成前 | 加快形变和流动 |
| tool-running | Zendocs 调用 | 更活跃的汇聚 |
| responding | 文字输出 | 按情绪与强度改变颜色/活动度 |
| speaking | 音频实际播放 | 情绪配色 + 实测音频强度 |
| blocked | 等待首个模型事件超过 12 秒 | 局部凝滞、阻塞配色 |
| interrupted | 用户停止 | 收束、低速等待 |
| error | 模型/录音失败 | 断层、故障配色 |
| offline | 初始化连接失败 | 暂停视觉，等待重连 |

每次模型回答要求首行输出 `{"emotion":"calm","intensity":0.35}`，随后换行输出正文。服务端校验并拆成独立 `expression` 与 `text.delta` 事件，元数据不展示、不朗读；无效情绪回退到平静。支持 calm 蓝青、curious 青蓝、joy 金粉、empathy 粉紫、encouraging 暖金绿、serious 冷蓝、concerned 柔和琥珀紫。强度为 0–1。TTS 朗读所选语音配置的播报文本，未强制添加厂商情绪标签。

3D Orb 动效始终开启，移除暂停入口。`/preview` 保留原预览控件和粒子参数，未改用视频播放。

## 外部 Zendocs 工具

Joe 不包含 Zendocs 的文档扫描或索引实现。配置 `ZENDOCS_SEARCH_URL` 后启用 Mastra `searchDocs` tool；可通过 `ZENDOCS_TOKEN` 传递 Bearer 凭据。

当前适配契约：POST JSON `{ "query": "问题", "limit": 6 }`，返回：

```json
{
  "sources": [
    { "title": "文档标题", "url": "https://your-zendocs/doc", "content": "检索片段" }
  ]
}
```

最多六条，每条正文不超过 12,000 字符，来源链接仅接受 HTTP(S)。这是 Joe 的适配契约，不假设现有 Zendocs 已提供同名接口；接入其真实接口时需映射。未配置则不向 Agent 注册此工具。

## 数据与费用

默认数据库在 `backend/data/joe.sqlite`（`JOE_DATA_DIR` 可覆盖，相对路径始终基于 backend 根目录，禁止放入 public）。备份应包含 SQLite WAL 或在停服后备份。读取历史时将未结束的消息投影为 interrupted。

按设置的时区统计当天模型 Token、模型估算费用、语音估算费用和总额。缺少费率、供应商用量或中断请求的费用显示待统计，已知部分照常显示；不将未知费用当作零。费率由用户配置，不是供应商实时账单；缺失数据会通过专门的供应商接口补查，未保存请求 ID 的旧记录不能精确追溯。ASR 费用还依赖响应提供音频时长。累计在线时间每十秒持久化，停服期间不累加。

## 验证与部署边界

```sh
bun run test
bun run typecheck
bun run build
```

测试覆盖视觉状态、情绪头解析、UTF-8 流拆包/中断、语音分句、SQLite 恢复与附件隔离、用量去重、模型配置，以及使用模拟 OpenRouter 响应的真实 Mastra 适配器链路。测试不调用付费供应商。脚本同时检查所有现有及新增源文件不超过 500 行（排除依赖和生成构建产物）。

本次仅进行代码验证，不进行视觉或 computer use 验证。真实 OpenRouter / 语音 Provider 凭据、浏览器录音与音频播放、Zendocs 真实接口仍需配置后联调。

后端只绑定 loopback，并校验 Host / Origin；当前为本地单用户服务，无公网认证。开发时 Vite 将 `/joe-api` 代理到 Mastra。生产构建后须由同源反向代理把 `/joe-api/*` 转发到后端（关闭流缓冲），并配置允许的 Origin；不能仅发布 Web 静态文件就认为服务端已接通。公网或多人使用需另行实现认证与数据隔离。

Web 输出在 `web/dist`，后端输出在 `backend/.mastra/output`；后端可用 `bun run --cwd backend start` 启动。Three.js 构建块仍有大于 500KB 的体积提示，未影响构建成功。

## 语音 Provider 切换

语音分层：HTTP 路由 → `src/joe/voice.ts`（会话校验、取消、用量）→ Mastra `MastraVoice.speak/listen` → Fish / ElevenLabs 适配器。Provider 不访问数据库，前端与路由不包含厂商协议。原有 `/joe-api/transcribe` 返回 `{text}`，`/joe-api/speech` 返回 MP3，新增 `/joe-api/speech-text` 返回 `{text,language}`，`/joe-api/speech` 请求需包含 `language: en | zh` 以选择绑定音色。

后端 `.env` 默认 `JOE_VOICE_PROVIDER=fish`，已有 Fish 凭据和功能保留。使用 ElevenLabs 时设置：

```dotenv
JOE_VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=你的密钥
ELEVENLABS_VOICE_ID=账号可通过API使用的音色ID
ELEVENLABS_ASR_MODEL=scribe_v2
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
```

可选 `JOE_ASR_PROVIDER` / `JOE_TTS_PROVIDER` 分别覆盖识别和合成。例如整体设为 elevenlabs、`JOE_TTS_PROVIDER=fish`，即可 ElevenLabs 转写 + Fish 朗读。修改后重启后端、刷新页面；设置面板显示当前选中的供应商。未配置完整会禁用对应能力，不会自动切换供应商或产生隐式费用。

两家均使用现有短句播放队列，支持取消。ElevenLabs 使用 `xi-api-key`，识别上传 multipart 文件，合成返回 MP3 128kbps。Free 的 Voice Library API 权限受限，必须选择账号实际允许通过 API 使用的音色。密钥只保存在后端。

新用量记录的模型字段带 provider 前缀，历史记录保留。语音费率配置分别独立、可留空；ElevenLabs 文件转写响应未提供可靠计费时长，识别费用保持待统计，不用最后一个词的时间戳猜测。TTS 按配置的字符费率估算，供应商账单为准。

协议依据：[ElevenLabs STT](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)、[ElevenLabs TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)。

## 自动语音输入

ElevenLabs ASR 选中时，使用 `scribe_v2_realtime` WebSocket 和服务端 VAD（静音 1 秒），部分转写只展示，每句最终转写自动发送后继续监听。浏览器由 AudioWorklet 输出单声道 PCM；后端通过统一 Provider 能力签发 15 分钟内有效的一次性 `realtime_scribe` 令牌，长期 API Key 不发送给浏览器。麦克风权限仍需用户允许，首次访问通过语音启用卡片确认；以后按默认静音偏好恢复，受浏览器的用户操作要求限制时可在对话卡片重试。

提交后继续保持麦克风和 WebSocket；输入静音、离开页面或录音/网络错误时关闭，浏览器启用回声消除。识别断线、空白语音、取消不会自动发送临时文字。语音转写与文本草稿独立，文本输入在接听时仍可编辑；发送失败的内容保留供重试。

Fish Provider 保留文件转写，使用本地能量检测决定说话结束，暂不支持实时部分文字；没有自动切换到其他供应商。实时模式用量在签发令牌时记为待统计，因为后端无法从客户端直连获得可靠的供应商账单，不把未知费用计为零。ElevenLabs Key 需有单次令牌和实时转写所需权限。

本次仅完成代码/模拟传输验证，实际设备麦克风与环境噪声下的断句阈值仍需用户试用确认。

## Mastra 原生 Memory 与存储

`src/joe/memory.ts` 创建共享 `LibSQLStore`，显式配置到 Mastra 主实例和 Agent 的 `Memory`，不再使用默认易失内存存储。文件位于 `JOE_DATA_DIR/mastra.db`，`joe.sqlite` 继续保存附件、费用、设置和轻量会话注册，旧消息表仅作为迁移归档，不再写入新消息。备份时两个数据库均应保留。

- 对话上下文：session ID 映射为 `joe:<session ID>` thread ID，Memory 自动保存并召回最近 30 条消息，服务端不再每轮手动拼接历史。
- 旧会话：首次读取时，以带前缀的稳定 ID 导入旧 UI 历史及附件文本，保留失败/中断状态，写入迁移标记；旧 thread 和 SQLite 消息表保留用于回退。重试不会重复历史。
- Working Memory：启用 resource 范围，本地单用户固定为 `joe-local-user`，跨 session 保存用户明确表达的长期偏好。新会话的对话历史独立，但可以使用同一用户的长期偏好。此设计不适用于未经隔离的多人服务。
- 语义召回与 Observational Memory 暂未启用，不额外调用 embedding 或后台摘要模型。自动标题生成也关闭。

`bun run dev` 先启动后端，等待 `/joe-api/health` 确认 Joe 服务与持久化存储就绪，再启动 Web，避免首次启动时代理提前连接 4111 而出现 ECONNREFUSED。健康检查最多等待 60 秒，启动失败会停止子进程并提示。单独运行 Web、后端停机或热重载窗口内仍可能发生短暂连接拒绝；此时应检查后端是否在监听 4111，而非检查语音 API Key。

## Mastra 原生能力整合

- `agents.joe` 是共享实例，模型经 RequestContext 选择并校验白名单。
- `structuredOutput` + `objectStream` 校验 `{ expression, text }`，替代手写首行 JSON 解析；工具执行和视觉状态仍以应用数据事件传送。
- AI SDK `createUIMessageStreamResponse` 处理 SSE，前端用官方 schema 和解析器；文本使用标准 text-delta，视觉事件使用 data-joe。
- Mastra 自动保存/召回上下文；应用在同一条 Memory 消息上补齐 UI 元数据，不另存正文副本。工作记忆继续跨会话共享。
- Observability 使用 MastraStorageExporter 写入本地存储，并启用 SensitiveDataFilter。回答错误会给出可用的 Mastra TraceID，后端记录轮次、错误类型和 HTTP 状态。追踪可能包含会话内容，属于本地私有数据。
- 语音适配器继承 MastraVoice；保留厂商 HTTP 实现以支持 AbortSignal、Fish 时长计费和精确错误映射。ElevenLabs 浏览器实时转写令牌属于扩展能力，未替换为不等价的服务端音频会话。
- 数据目录曾因 Mastra dev 更改 cwd 落到 public；已备份并迁到 backend/data。`data/backups` 保留原始数据库与一致性快照，不进入构建资源。

### 新会话问候

新建会话时保存一次「我是 Joe，今天过的怎么样？」，已有会话进入时补齐，重复进入不会再次发送。问候作为独立消息保留在历史中，支持重播。固定音频位于 `web/public/audio/greeting-joe.mp3`，由 ElevenLabs 中文音色生成，所有会话复用；浏览器阻止自动播放时可手动播放。

音频缺失时，在 `backend` 目录执行 `node --env-file=.env --import tsx scripts/generate-greeting.ts`。需要 `ELEVENLABS_API_KEY` 和 `ELEVENLABS_VOICE_ID_ZH`；已有音频不会覆盖。

### 语音语种与音色

设置中的「语音配置」默认「自动」，也可固定 English 或 Chinese。每轮开始时固定所选模式。
自动模式通过一次 AI 调用结合本轮和最近四条用户消息选择英语或中文；中英混合按主要交流语言，短回复沿用近期语言，仍不明确则参考回答语言，最后回退英语。
同一次调用将完整回答转换为目标语言；已经符合目标语言则保留原文，不重新回答问题。文字正文流式显示，播报文本准备完成后作为主展示，原文可逐条展开；两者相同时只显示一份。每条消息也可按需生成中英互译的辅助译文，查看译文不改变播报语言。翻译使用本轮思考模型，计入模型用量；语音费用直接查询供应商账户。

音色在后端环境变量中绑定（按所选 TTS Provider 配置）：

| Provider | English | Chinese |
| --- | --- | --- |
| ElevenLabs | `ELEVENLABS_VOICE_ID_EN` | `ELEVENLABS_VOICE_ID_ZH` |
| Fish | `FISH_REFERENCE_ID_EN` | `FISH_REFERENCE_ID_ZH` |

旧 `ELEVENLABS_VOICE_ID` / `FISH_REFERENCE_ID` 仅作为 English 的兼容配置，不会自动当作中文音色。缺少目标音色会显示提示并保留文字回答，不会切换到另一个语种。请填写适合对应语种的真实 Voice ID，修改环境变量后重启后端。
停止、下一轮输入或关闭语音会取消待处理的播报翻译／播放，辅助译文在消息离开页面时取消，译文不写入对话记忆。

语音输入不设静音自动关闭。Fish 批量录音每 15 秒丢弃未检测到说话的片段，持续等待输入；有效长句仍受音频大小限制。对话卡片和底部小球同一时刻仅一处持续渲染 3D，另一处停止动画循环。

### 用量补查

`GET /joe-api/usage` 在返回汇总前补查已保存的供应商请求 ID：每次最多 8 条，单次请求 5 秒超时，同一条至少间隔 30 秒，多个前端刷新共享一次补查。查询最近 48 小时的记录；按原请求时间计入用户时区当日，不按补查时间重复计费。

- OpenRouter：保存每个模型步骤的 generation ID（包括工具调用和语音翻译）。通过 `/api/v1/generation?id=…` 获取原生 Token 及 `total_cost`，同一轮各步骤汇总覆盖旧值，不叠加计费。
- 已有 Token、无 generation ID 的旧记录：从 `/api/v1/models` 公开价格估算；这是当前价格估算，不是历史账单。缺 Token 且无 ID 的旧记录保留待确认。
- 语音改为直接查询账户接口，不再写入逐笔语音统计或查询生成历史，已有历史记录保留。

### 语音账户短轮询

`GET /joe-api/voice-account` 直接读取当前 ASR/TTS 供应商账户，同一供应商只查一次。`VOICE_ACCOUNT_POLL_MS`（`backend/src/joe/voice-account.ts`）统一配置轮询和后端缓存间隔，默认 15 秒。请求超时 5 秒，前端上一请求结束后才安排下一次，卸载时取消。API Key 仅在后端使用。

ElevenLabs 使用 `/v1/user/subscription`，展示本账期用量/配额、重置日期和下期应付金额（分转换为币种主单位）；没有返回账单或币种时显示未返回。Fish 使用 `/wallet/self/api-credit` 展示账户余额。权限不足和查询失败明确显示，不以零代替。

账户数据包括其他应用消费，与 Joe 当日模型费用分开展示，不合并为今日总费用。账单可能含订阅固定费用，不等于当天消费。

官方依据：[ElevenLabs subscription](https://elevenlabs.io/docs/api-reference/user/subscription/get)、[Fish wallet](https://docs.fish.audio/api-reference/endpoint/wallet/get-api-credit)。

### IP 天气与 Agent 天气工具

`WEATHER_API_KEY` 使用 [WeatherAPI.com 账户](https://www.weatherapi.com/my/)中的 API Key，仅保存在后端。首页通过客户端查询公网 IP 后传给 `currentWeather(clientIp)`，由服务端使用该 IP 查询天气；无法取得 IP 时提示指定城市，不使用后端出口定位；`getWeather` 是 Mastra 工具，指定 `city` 可查任意城市，省略时查询当前位置。工具复用同一查询函数，包含温度、体感、天气描述、湿度、风速、地点、时区和观测时间，支持取消、错误提示及 15 分钟缓存。

例如：“这里天气怎么样？”、“东京现在多少度？”或“比较深圳和伦敦的天气”。当前工具仅查询实时天气，不能用它推断未来预报。

客户端通过 ipify 获取公网 IP 并交给后端查询 WeatherAPI；VPN/代理会影响定位，定位不是精确 GPS。IP 查询失败时需要指定城市。UI 隐藏旧城市/时区设置，保留已有设置数据以兼容历史记录。

实现参考：[WeatherAPI 参数](https://www.weatherapi.com/docs/request-parameters/)、[OpenRouter weather tool 示例](https://openrouter.ai/docs/agent-sdk/call-model/examples/weather-tool)。保留现有 Mastra Agent 和工具调用链，无需引入另一套 Agent SDK。

## 致谢

示例画布支持拖动卡片和拖动空白处平移视角；拖动卡片靠近画布边缘时，视角会自动跟随。卡片位置、倾斜角及画布视角保存在当前浏览器，刷新或切换画布后恢复，不跨设备同步。浏览器禁用存储时仍可拖动，但无法保存。

流体头像采用 [Rare UI FluidOrb](https://www.rareui.com/components/fluidorb) 的着色器，许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 视觉组件署名

空白画布使用 [OrbKit SHDR-01](https://orbkit.zzzzshawn.cloud/)，shader 作者为 [XorDev](https://x.com/XorDev)，由 zzzzshawn 移植。SHDR-01 仅限非商业使用并需保留署名；运行时为 MIT。详见 [第三方许可](THIRD_PARTY_NOTICES.md)。
