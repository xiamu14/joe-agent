# Mastra 能力复用审查

日期：2026-10-29。目标：框架已有等价能力时复用，只保留业务规则、外部协议与客户端设备适配。

范围：backend/src、web/src、web/public/pcm-capture.js、services、scripts、依赖声明和现有测试目录。核心执行链逐段阅读；UI 按文件职责、导出和调用关系扫描。不是逐行安全审计，也未执行真实供应商调用。生成文件、第三方资源和构建输出不作为自定义框架代码。

依据：项目安装的 @mastra/core 1.79.0 类型声明及随包文档优先，官方在线文档补充。@mastra/mcp、@mastra/ai-sdk、@mastra/voice-elevenlabs 未在 backend/package.json 声明；@ai-sdk/react 未在 web/package.json 声明。新包必须先核对版本兼容性。

## 本轮实施状态（2026-10-29）

已完成工具契约、天气缓存与 MCP 客户端优化：

- 五个业务工具均声明 outputSchema；四个依赖客户端能力的工具声明 requestContextSchema。
- 天气、视频和卡片显示通过 toModelOutput 去除 UI 内部字段；视频保留标题、频道和来源 URL 供模型概括，UI 仍得到完整资源。
- 天气改用 InMemoryServerCache，15 分钟 TTL、最多 30 条；容量达到上限时按框架淘汰，不再全部清空。
- 安装 @mastra/mcp 2.6.0（peerDependencies 支持当前 core 1.79.0），移除后端直接声明的旧 MCP SDK。通过官方工具发现，仅执行 youtube_search，兼容 FastMCP 旧握手、文本/结构化结果、取消与鉴权。
- Python 服务、天气供应商请求、卡片事件协议、运行取消与桌面回执机制保持原职责；UUID 迁移不在本轮范围内。

下文为改造前的审查依据；以上状态优先于其中“尚未使用”的历史描述。本轮并未实施官方 UI 流转换或卡片事件协议迁移。

验证结果：84 项后端测试通过（含新增工具契约、缓存到期/容量、MCP 发现/鉴权/结果格式/取消测试），前后端 typecheck 通过，217 个源文件均不超过 500 行，diff 空白检查通过。保留 Bun 工作区及锁文件的临时目录生产构建成功，未中断运行中的开发服务。未调用真实 WeatherAPI 或 Agent Reach CLI。一次高并发回归触发 greeting 测试已有的数据库关闭后异步活动错误，限制测试并发为 2 后全量通过；本轮未改其实现。

## 结论与优先级

核心推理、工具循环、结构化生成和 Memory 已由 Mastra 承担。可减少的重复实现集中在工具边界、缓存、消息传输、运行生命周期和供应商标准接口。

| 优先级 | 收敛项 | 结论 |
| --- | --- | --- |
| 已完成 | 工具 outputSchema / requestContextSchema / toModelOutput | 五个工具补齐输出契约；按需校验上下文并裁剪模型结果 |
| 已完成 | 数据 MCP 客户端 | 已使用 @mastra/mcp 2.6.0；保留数据清洗和卡片业务 |
| 已完成 | 天气 TTL Map | 已替换为 InMemoryServerCache；保留供应商请求、定位、错误映射 |
| 中 | 每轮消息转换与 UI 状态 | @mastra/ai-sdk + AI SDK React 可覆盖标准部分；结构化正文增量需保留适配 |
| 中 | 手写 active/inFlight 和取消协调 | 对照原生线程订阅、发送和取消 API，先验证语义再替换 |
| 中 | 桌面 pending 回执 Map | 改用 client tools 或 suspend/resume；客户端仍负责真正执行 |
| 中 | 临时翻译/语种 Agent | 注册为 Mastra 管理的 Agent，统一配置与可观测性 |
| 中 | ElevenLabs 基础 speak/listen、输入输出供应商组合 | 官方 Provider + CompositeVoice；功能差异需验证 |
| 低 | widget SQL 定时轮询通知 | 用 Mastra PubSub 唤醒，保留持久事件与游标 |
| 条件项 | 语种判别 Classifier | 已有框架能力，但要求 DecisionModel；配置中的字符串不足以直接使用 |

## 天气：拆开分析每一层

调用链一：Agent → getWeather → weather/currentWeather → WeatherAPI → WidgetStore。
调用链二：useWeather → /weather → currentWeather → 同一 WeatherAPI 适配。

- weather-tool.ts 已使用 createTool，参数由 inputSchema 验证，取消信号由 Mastra 传入。无需替换工具执行引擎。
- weather.ts 的 fetch、WeatherAPI schema、供应商错误码、城市/IP 查询、单位和时区字段转换是供应商适配。官方天气示例同样采用 createTool + fetch，未核实到可完整替代此 WeatherAPI 契约的官方现成 Provider。
- Map + expires + 达到 30 条全清空是可替换的通用缓存。当前 core 的 InMemoryServerCache 已有 ttlMs、maxSize、get/set/delete，建议 15 分钟 TTL 和 30 条容量；容量淘汰语义会改变，测试应覆盖。
- 不要用 ResponseCache 替代天气缓存：它缓存模型响应，并不等价于外部观测数据的 TTL。
- getWeather 未声明 outputSchema；weather.ts 虽校验供应商响应，仍未形成框架工具输出契约。补齐输出 schema，并复用到 widget resource 边界，避免多份结构漂移。
- chat.ts 注入 weather.begin 回调并在 fullStream 中检查工具名称，再把结果转为 widget/resource/card 事件。框架 writer.custom 或原生 tool parts 可以承担本轮事件传输，revision 检查和卡片更新仍由业务层负责。
- requestContextSchema 可替代工具内对上下文函数的强制类型断言；客户端能力缺失的业务错误仍应保留。
- useWeather 自动刷新不是 Agent 推理，无需为了框架一致性增加 LLM 调用。直接 API 可保留。
- 实际请求是 forecast.json?days=1，读取当前天气、今日最低温和日出日落；Agent 指令限制未来预报。两者不等于已实现任意未来天气查询。
- 前端图标、当地昼夜、渐变、位置和播放/展示规则没有等价 Mastra 能力，保留。

相关文件：backend/src/joe/weather.ts、weather-tool.ts、widget-resources.ts、chat.ts、routes.ts；web/src/joe/weather/*、client-ip.ts。

## 工具契约、事件与模型输入

searchDocs、getWeather、searchYouTube、presentWidget、controlDesktop 均使用 createTool，但都没有声明 outputSchema，也没有使用 toModelOutput 或 requestContextSchema。

建议统一采用框架边界：inputSchema 校验输入，requestContextSchema 校验执行依赖，outputSchema 校验结果，toModelOutput 限制发给模型的字段。供应商原始响应仍需独立校验，不能因为工具有 outputSchema 就删除信任边界验证。

searchYouTube 返回的 widget 包含 resource.data.videos，并非真正“只给模型数量”。当前 summary 文本仅要求模型不要逐条朗读，不会裁剪实际工具结果。应使用 toModelOutput 明确输出 count、必要标题/来源摘要和状态；UI 保留完整结果。天气与卡片内部 instanceId/revision 也不必全部交给模型。

普通本轮 UI 更新可使用 tool parts 或 context.writer.custom；不要继续在 chat.ts 为每增加一种工具追加工具名分支。独立于对话的卡片状态更新仍需要业务事件服务。

## Agent Reach / MCP

data-mcp.ts 手动 Client.connect → callTool → close，固定 youtube_search；server.py 将三个 YouTube CLI 操作包装成 MCP。替换客户端为 @mastra/mcp 的 MCPClient/listTools 或 listToolsets，显式允许所需工具，保留 searchYouTube 卡片封装。

Python CLI 桥接、查询限制、并发上限、子进程超时/取消和数据格式校验不能因切换客户端而删除。详情与字幕目前未被 Joe 使用；开放它们是独立功能决策。

改动覆盖：backend/package.json、锁文件、data-mcp.ts、youtube-tool.ts、agent.ts、chat.test.ts 的 MCP fixture、服务说明。测试应增加工具发现、失败、取消、结构化/文本结果及资源提交失败；现有视频测试只有模拟 MCP 链路，不能证明 CLI 可用。

## 对话、流与运行生命周期

chat.ts 正确使用 Agent.stream、maxSteps、structuredOutput、objectStream、totalUsage、onStepFinish 和 Memory；不是自写 LLM 工具循环。

重复基础设施主要是 active Map、轮次等待 Promise、inFlight、请求中止桥接、手写 UI 消息组装、工具事件分支；前端 use-joe.ts 再维护一套消息和错误状态，stream.ts 将 AI SDK parts 转回自定义事件。

1. 标准消息与工具状态优先 @mastra/ai-sdk 的 toAISdkStream/handleChatStream、toAISdkMessages；前端配合 @ai-sdk/react useChat。这是 Mastra 官方集成方案，useChat 本身属于 AI SDK。
2. 不能直接删掉 objectStream：官方转换器只转发最终结构化对象，不转发 partial structured output。Joe 需要 text 字段的增量和情绪事件，必须继续从原生 objectStream 投影为正文/情绪，防止把 JSON 原文显示或朗读出来。
3. 当前 core 已暴露 subscribeToThread、sendMessage、abortThreadStream、abortRunStream、listActiveThreadRuns。运行跟踪应优先评估这层，只有需要更完整会话管理时再用 AgentController；二者不是必须叠加。
4. 这些线程 API 不是当前一次性 stream() 的无条件替换：要证明“新发言停止旧回答”、同一轮 ID、请求断开即取消、重复请求拒绝、错误/中断消息持久化仍一致。不能无意变成排队或在旧轮中追加信号。
5. 框架 abort 不等价于业务幂等；turnId 和重复提交检查仍需保留。TextStream 的逐帧局部渲染也不等价于后端流转换。
6. chat.ts 对 STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED 的 details.value 做正文兜底依赖错误内部结构。应核对框架输出错误处理/重试能力，保留既有降级行为的测试，不能直接把所有失败变成成功。

覆盖：chat.ts、schema.ts、conversations.ts、routes.ts；use-joe.ts、stream.ts、types.ts、text-stream.ts、chat-status.ts、chat-turns.ts、消息组件；chat.test.ts、joe.test.ts、memory.test.ts、前端状态/流测试。

## Memory、会话、迁移

Memory/LibSQLStore、lastMessages=30、资源级 Working Memory 已使用原生能力；semanticRecall=false 是功能选择，不是重复实现。

conversations.ts 的附件组装、UI 元数据和 greeting 恢复有业务价值，但读取时自行解析结构化 JSON、保存时把最后一条 assistant 的 text parts 改写成 UI 正文，造成 UI 与原生消息内容耦合。建议保持原生消息正文/工具 parts，UI 显示内容放 metadata，读取走官方转换加薄投影。迁移必须保留已有消息 ID 和历史兼容性。

store.ts 的 sessions 与 Mastra thread 形成双登记；可逐步用 thread 作为会话事实来源，但附件、画布关系、幂等与启动初始化都需同步迁移。settings、usage、attachments、widget 表是业务数据，不能一概塞入 Working Memory。

已完成事项（用户确认，2026-10-29）：UUID 迁移已处理完毕，当前已无 UUID 数据。clear-legacy-sessions.ts 属于已完成迁移的历史代码，不再列为要求冲突、当前数据风险或待改造项；无需补做 UUID 兼容、恢复或清理。

greeting 仍写入 Joe messages 表再导入 Memory，因此“旧 messages 表完全不再写入”的理解不准确；普通新对话正文走 Memory，但 greeting 仍使用旧表。收敛时应一并迁移，不能只删除 saveMessage。

## 语音、翻译与分类

JoeVoice 继承 MastraVoice，Fish/ElevenLabs 的 listen/speak 仍自行发 HTTP；仅继承基类不等于复用了官方 Provider。

- ElevenLabs 官方 @mastra/voice-elevenlabs 提供基础 speak/listen/getSpeakers，基础路径应优先替换。
- 替换前需逐项验证 File/MIME 保留、所选模型、AbortSignal、错误码、request-id/character-cost、音频格式。现有代码的 speakStream 使用 PCM 24000 + 字符时间戳，createRealtimeSession 发浏览器短期令牌；未确认官方 Provider 完整覆盖这两条路径，不能直接删除。
- Fish 官方等价适配未核实；可保留最薄 MastraVoice 适配器，不能仅为减少代码换供应商或丢失时长回调。
- ASR/TTS 分供应商可由 CompositeVoice(input/output) 组合。现有语种音色选择、配置验证、实时令牌和字幕扩展仍有独立职责；CompositeVoice 不会自动接管这些。
- speech-text.ts 与 input-language.ts 已使用 Agent.generate，不是裸 HTTP 模型请求。建议注册到 Mastra agents，使配置/追踪生命周期统一；注册本身不会自动把多个独立 HTTP 请求串成一条父子 trace。
- input-language.ts 是固定选项分类，core Classifier 在语义上更合适，但必须提供 DecisionModel。config.ts 虽导出 decisionModels，运行代码没有使用它；仅添加 typesafe/jev-1.14 字符串不能接通分类模型。需匹配 Provider/凭据并验证分类效果、延迟和费用后迁移。
- 前端实时 WebSocket、AudioWorklet、MediaRecorder、静音检测、浏览器 SpeechRecognition、音频时钟和字幕同步属于浏览器能力/供应商协议，未找到等价 Mastra 浏览器实现，保留。
- “识别 → 对话 → 翻译 → 播放”横跨浏览器设备与服务端。没有必须持久执行的多步骤业务时，不为框架使用率增加 Workflow。

覆盖：voice.ts、voice-providers/*、voice-errors.ts、speech-text.ts、input-language.ts、speech-markdown.ts、voice-account.ts、mastra/index.ts；前端 voice-input/*、use-recorder/use-dictation/use-voice-input、voice-queue、speech-stream、streamed-speech-player、audio-timeline、pcm-capture.js；现有语音系列测试。

## 画布、桌面与事件

desktop.ts 的 pending Map、手工 id 回执、20 秒等待，本质是客户端工具执行协议。优先使用无 execute 的 client tool + 标准工具结果提交；需服务端可恢复等待时使用 suspendSchema/resumeSchema + suspend/resume。原生客户端也须迁移传输契约，不能只改后端。当前仓库未发现 Swift/Kotlin/Rust 原生客户端实现，跨仓库兼容性尚未核实。

widget-events.ts 每个连接每秒查询 SQLite。Mastra PubSub 可负责新事件通知，查询历史时仍使用 SQLite cursor。默认 EventEmitterPubSub 不持久化；CachingPubSub + 内存缓存也不能替代重启后仍存在的业务事件日志。若以后持久 PubSub 接管重放，才可另做日志迁移。

WidgetStore 的幂等 commandId、expectedRevision、卡片/资源绑定、事务和单类型卡片限制是业务状态机；不是 Workflow 状态或 Memory。保留。可减少本轮消息与 widget SSE 双路投递的胶水，但不能删除 revision 去重和离线恢复。

React/RareUI 控件、Motion 动画、Bento/自由布局、拖拽、缩放、倾斜、GLSL、YouTube iframe、播放历史、Markdown 安全渲染与字幕显示属于产品层，没有 Mastra 等价替换。

## 路由、配置、观测、账单与工程

- routes.ts 已使用 registerApiRoute。Host/Origin/sec-fetch-site 校验可放 Mastra server middleware；CORS 不能代替请求来源/身份验证。上传限额、UTF-8 校验、附件归属是业务边界，保留。
- server 自带的 Agent/Memory API 与自定义 /joe-api 守卫不是同一覆盖面；若采用原生路由，必须统一 middleware，不能假定现有路由包装保护了所有接口。本次未测试运行时暴露面。
- mastra/index.ts 已配置 Observability、MastraStorageExporter、SensitiveDataFilter。新注册 Agent 应复用；业务日志可使用框架 logger，费用账本仍独立。
- usage-sync.ts 查询 OpenRouter generation 实际账单；voice-account.ts 查询订阅/余额，Mastra token usage/trace 不能替代供应商账单。保留对账、货币单位、缺失值和轮次幂等。
- voice-account 缓存的 TTL 容器可复用 InMemoryServerCache，但缓存键必须保留凭据/费率变更失效语义，不要把原始凭据放入可记录的公共 key。请求合并是独立需求，缓存类不保证自动 single-flight。
- config.ts 模型 allowlist、Think/Decision 分组、音色与价格配置是业务策略；重复的 OpenRouter model 配置可随 Agent 注册统一。不是额外构建自定义 Model Router 的理由。
- data-directory.ts、id.ts、schema.ts、启动协调、后端健康检查、构建/类型/行数检查、静态 greeting 生成没有等价 Agent 框架职责，保留。
- 不因框架存在 RAG、工作流、评分器、调度器就引入：当前 Zendocs 索引由外部服务负责；测试也不能被 LLM eval 取代。

## 建议实施顺序与验收

1. 工具边界：补 schema、toModelOutput，天气缓存替换；保留供应商和卡片行为。测试真实视频数据不会因提示词而仍整包进入模型、工具无上下文错误、缓存过期/容量/取消。
2. MCP：官方客户端、最小工具白名单；保留 Python 部署边界。测试 discovery、鉴权传递、错误与取消、卡片 revision 冲突。
3. 消息传输：官方 UI 转换 + useChat，保留 partial structured text 投影；验证无 JSON 泄露、无双消息、工具结果/来源/情绪和停止行为。
4. 生命周期与桌面：原生 thread API、client tool 或 suspend/resume；验证旧轮取消不会影响新轮、客户端回执不能跨会话、断线行为一致。
5. 存储：原生消息与 UI 元数据分离、greeting/session 收敛；备份并验证迁移重试、当前消息 IDs、历史恢复。已完成的 UUID 迁移不在此次范围内。
6. 语音：官方 ElevenLabs 基础接口 + CompositeVoice；差异留薄扩展。分类器单独验证，不与语音迁移捆绑。
7. PubSub 与 middleware：统一通知和路由策略，保留持久 cursor 与现有本机限制。

后续各步运行受影响的现有测试和必要契约测试，完成后执行相关 typecheck；真实供应商兼容性需另做集成验证。本轮实施与验证结果见文首，未访问真实数据库内容。

## 参考

- [Mastra Tools / 天气示例](https://mastra.ai/docs/agents/tools)
- [MCP](https://mastra.ai/docs/connections/mcp)
- [AI SDK UI / client tools / custom events](https://mastra.ai/integrations/agentic-ui/ai-sdk-ui)
- [toAISdkStream 与结构化输出限制](https://mastra.ai/reference/ai-sdk/to-ai-sdk-stream)
- [线程消息与取消](https://mastra.ai/docs/signals/sending-signals)
- [PubSub 与重放边界](https://mastra.ai/docs/server/pubsub)
- [ElevenLabs Provider](https://mastra.ai/integrations/voice/elevenlabs)
- [CompositeVoice](https://mastra.ai/reference/voice/composite-voice)
- 本地类型：backend/node_modules/@mastra/core/dist/cache/inmemory.d.ts、tools/types.d.ts、agent/agent.d.ts、agent-controller/session.d.ts。
- 本地随包文档：backend/node_modules/@mastra/core/dist/docs/references/reference-classifier-classifier.md、reference-processors-response-cache.md。
