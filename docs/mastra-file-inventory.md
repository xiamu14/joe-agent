# Mastra 审查文件清单

2026-10-29。与 [分析报告](mastra-capability-audit.md) 配套。逐文件职责归类，不表示每个 UI 文件均完成逐行缺陷审查。

| 文件 | 处理结论 |
| --- | --- |
| `backend/src/config/models.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/agent.ts` | 已用 Agent/createTool；补工具契约及模型输出裁剪 |
| `backend/src/joe/chat.ts` | 复用官方 UI 转换与线程生命周期；保留结构化正文增量投影 |
| `backend/src/joe/clear-legacy-sessions.ts` | 停止耦合内部表；公开 API 与保留旧 ID 的迁移策略 |
| `backend/src/joe/config.ts` | 模型白名单保留；复用注册 Agent 配置 |
| `backend/src/joe/conversations.ts` | 公开 Memory API；收敛消息投影/补写与会话迁移 |
| `backend/src/joe/data-directory.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/data-mcp.ts` | 官方 MCPClient 替换连接/工具接入胶水 |
| `backend/src/joe/desktop.ts` | client tool 或 suspend/resume 替代 pending 回执协议 |
| `backend/src/joe/greeting.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/id.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/input-language.ts` | 注册现有 Agent；DecisionModel 可用时评估 Classifier |
| `backend/src/joe/memory.ts` | 已用 Memory/LibSQLStore；保留 |
| `backend/src/joe/routes.ts` | 已用 registerApiRoute；公共守卫迁 middleware，业务校验保留 |
| `backend/src/joe/schema.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/speech-markdown.ts` | 业务配置/ID/路径/朗读格式/问候语，保留 |
| `backend/src/joe/speech-text.ts` | 注册翻译 Agent；保留语言选择与消息归属 |
| `backend/src/joe/store.ts` | sessions/greeting 可向 Memory 收敛；其他业务表保留 |
| `backend/src/joe/usage-sync.ts` | 真实账单对账保留，不用 trace 替代 |
| `backend/src/joe/voice-account.ts` | 账单 API 保留；TTL 容器可复用，保留失效/合并语义 |
| `backend/src/joe/voice-errors.ts` | 供应商安全错误映射保留 |
| `backend/src/joe/voice-providers/base.ts` | 已继承 MastraVoice；官方 Provider 迁移后缩小自定义基类 |
| `backend/src/joe/voice-providers/config.ts` | 供应商配置/类型/安全 HTTP 验证，保留必要差异 |
| `backend/src/joe/voice-providers/elevenlabs.ts` | 官方基础 Provider；时间戳 PCM/临时令牌保留差异扩展 |
| `backend/src/joe/voice-providers/fish.ts` | 未核实官方等价 Provider；保留薄适配 |
| `backend/src/joe/voice-providers/http.ts` | 供应商配置/类型/安全 HTTP 验证，保留必要差异 |
| `backend/src/joe/voice-providers/index.ts` | 用 CompositeVoice 组合 input/output；保留供应商配置校验 |
| `backend/src/joe/voice-providers/types.ts` | 供应商配置/类型/安全 HTTP 验证，保留必要差异 |
| `backend/src/joe/voice.ts` | 基础调用接官方 Voice/CompositeVoice；校验/扩展保留 |
| `backend/src/joe/weather-tool.ts` | 补 outputSchema/requestContextSchema/toModelOutput；框架事件输出 |
| `backend/src/joe/weather.ts` | TTL 缓存可替换；供应商协议和数据校验保留 |
| `backend/src/joe/widget-events.ts` | PubSub 通知替代定时查库；保留持久游标重放 |
| `backend/src/joe/widget-resources.ts` | 与工具输出 schema 复用，业务资源约束保留 |
| `backend/src/joe/widget-runtime.ts` | 业务存储实例，保留 |
| `backend/src/joe/widget-store.ts` | 业务事务/幂等/revision 保留，不映射成 Memory |
| `backend/src/joe/widget-tool.ts` | 补输出/上下文契约；标准 tool parts/custom events |
| `backend/src/joe/youtube-tool.ts` | 补输出契约与 toModelOutput；保留卡片业务 |
| `backend/src/mastra/index.ts` | 框架入口已使用；集中注册辅助 Agent、middleware、缓存和 PubSub |
| `scripts/check-lines.mjs` | 开发/构建/生成脚本；不是 Agent 框架替代范围 |
| `scripts/dev.mjs` | 开发/构建/生成脚本；不是 Agent 框架替代范围 |
| `scripts/wait-for-backend.mjs` | 开发/构建/生成脚本；不是 Agent 框架替代范围 |
| `services/data-mcp/server.py` | 外部 CLI→MCP 边界；保持独立部署和子进程保护 |
| `web/src/components/conversation/composer.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/conversation/message-body.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/conversation/messages.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/expression-lab.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/joe-experience.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/panels/settings-panel.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/panels/voice-account-panel.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/ai-status-icon.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/ai-status.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/bounce-sidebar.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/classes.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/faq.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/fluid-orb.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/task-item.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/task-list.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/video-list.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/rare-ui/workspace-tools.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/components/shader-orb/dispersion-shader.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/shader-orb/orb-state.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/shader-orb/render-generation.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/shader-orb/shader-orb.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/shader-orb/shader-program.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/shader-orb/shdr-01.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/thought-orb.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/workspace/background.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/workspace/card-frame.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/components/workspace/card-overview.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/components/workspace/card-preview.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/components/workspace/dock.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/workspace/icon.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/workspace/material.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/components/workspace/overlays.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/account-cards.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/api.ts` | 业务 HTTP 小封装保留；Agent 请求改官方 transport |
| `web/src/joe/audio-timeline.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/canvas-layout.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/canvas-scene.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/canvas-storage.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/card-drag-geometry.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/card-expansion.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/card-hover-intent.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/card-tilt.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/chat-status.ts` | 框架标准运行状态投影；产品状态名称保留 |
| `web/src/joe/chat-time.ts` | 时间展示业务，保留 |
| `web/src/joe/chat-turns.ts` | 业务轮次展示，随消息格式迁移 |
| `web/src/joe/client-ip.ts` | 浏览器出口 IP 适配，保留 |
| `web/src/joe/example-cards.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/joe-page.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/layouts/bento-canvas-layout.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/layouts/bento-packing.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/layouts/canvas-layout-layer.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/layouts/canvas-preferences.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/layouts/free-canvas-layout.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/layouts/use-canvas-modes.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/markdown-answer.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/session-storage.ts` | 会话 ID 缓存；迁移需保留旧 ID 兼容性 |
| `web/src/joe/speech-stream.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/static-workspace.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/stream.ts` | 标准 parts 处理优先官方 SDK；语音切分保留 |
| `web/src/joe/streamed-speech-player.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/text-stream.ts` | 局部逐帧渲染，与框架流不同，先保留并测性能 |
| `web/src/joe/tilt-card.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/types.ts` | Agent 消息/工具结果优先官方类型；业务类型保留 |
| `web/src/joe/use-canvas-pan.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/use-card-drag.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/use-card-flip.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/use-dictation.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/use-joe.ts` | 标准消息/传输收敛到官方 UI 集成；语音/画布业务保留 |
| `web/src/joe/use-recorder.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/use-voice-input.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/use-voice-level.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/video/mount-youtube-player.ts` | YouTube 官方 iframe/播放历史与展示；Mastra 不替代 |
| `web/src/joe/video/use-video-history.ts` | YouTube 官方 iframe/播放历史与展示；Mastra 不替代 |
| `web/src/joe/video/use-youtube-player.ts` | YouTube 官方 iframe/播放历史与展示；Mastra 不替代 |
| `web/src/joe/video/youtube-api.ts` | YouTube 官方 iframe/播放历史与展示；Mastra 不替代 |
| `web/src/joe/video/youtube-card.tsx` | YouTube 官方 iframe/播放历史与展示；Mastra 不替代 |
| `web/src/joe/visual.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/voice-input/audio-level.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/batch.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/browser-speech.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/config.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/dictation-capture.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/realtime-dictation.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/realtime.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-input/turn.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-queue.ts` | 浏览器设备/供应商实时协议/字幕播放；保留，配合后端 Voice 契约 |
| `web/src/joe/voice-wave-shape.ts` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/voice-wave.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/joe/weather/presentation.ts` | 天气展示/自动刷新业务；后端工具契约复用，不新增 LLM |
| `web/src/joe/weather/use-weather.ts` | 天气展示/自动刷新业务；后端工具契约复用，不新增 LLM |
| `web/src/joe/weather/weather-card.tsx` | 天气展示/自动刷新业务；后端工具契约复用，不新增 LLM |
| `web/src/joe/weather/weather-icon.tsx` | 天气展示/自动刷新业务；后端工具契约复用，不新增 LLM |
| `web/src/joe/widget-display-gate.ts` | 语音/正文出现前延迟卡片的业务规则，保留 |
| `web/src/joe/widget-resource-state.ts` | revision 去重业务，保留 |
| `web/src/joe/widget-visibility.ts` | 卡片状态业务，保留 |
| `web/src/joe/workspace-chat.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/workspace-greeting.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/workspace-input.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/workspace-orb-state.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/workspace-preview.tsx` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/joe/workspace-state.ts` | 画布布局/交互/持久偏好业务；保留 |
| `web/src/orb-shaders.js` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/orb.js` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routeTree.gen.ts` | 路由生成文件，不手改 |
| `web/src/router.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routes/__root.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routes/index.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routes/joe-legcy.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routes/joe.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/routes/preview.tsx` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/src/state.js` | React/RareUI/Motion/GLSL/路由/展示；不属于 Agent 基础设施 |
| `web/public/pcm-capture.js` | 浏览器 AudioWorklet PCM 编码；保留 |
| `backend/scripts/generate-greeting.ts` | 开发/构建/生成脚本；不是 Agent 框架替代范围 |

测试、依赖与配置：

- 已扫描 backend/tests、web/tests、scripts/*.test.mjs 的测试入口；本次未执行。
- backend/package.json、web/package.json、根 package.json、web/vite.config.ts：检查框架依赖、运行方式和代理关系。
- 应用之外的 .mastra、node_modules、构建资源不列入改造；只读取已安装 Mastra 的公开声明和随包文档核实能力。
- 分析过程中检测到画布偏好相关并行工作区改动；没有编辑这些文件。
