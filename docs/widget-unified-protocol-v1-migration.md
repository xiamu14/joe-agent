# Widget Unified Protocol V1：内部卡片迁移实施文档

日期：2026-10-31。状态：待实施。依据：[统一协议](./widget-unified-protocol-v1.md)、[实现计划](./widget-unified-protocol-v1-implementation.md)。本文件记录具体迁移路径，不表示以下改造已完成。

## 1. 迁移目标与保护范围

将费用、设置、天气和 YouTube 变成工厂预置 Widget，业务访问统一走 Bridge 与运行时。保留已有 UI、行为测量口径、对话、账单、设置、历史 ID 和画布位置，不以重装/清空 localStorage 代替迁移。

示例画布的灵感、问答、待办目前是展示组件，不是已接入 WidgetStore 的真实业务 Widget；保持展示，不在本次虚构待办后端。需要正式接入时同样提供 manifest 与协议动作。

## 2. 当前代码与目标映射

| 当前实现 | 目标变化 |
| --- | --- |
| backend/src/joe/widget-store.ts | 保留画布展示引用，逻辑 Widget/空间移交统一身份层；资源与实例提交原子化 |
| backend/src/joe/widget-resources.ts、tool-contracts.ts | 迁为注册的资源/动作契约，移除四类型硬编码联合对扩展的限制 |
| backend/src/joe/widget-tool.ts | 将 presentWidget 适配为统一 UI 动作 |
| backend/src/joe/chat.ts | 移除按 weather/video 工具名分支，统一结果投影和因果事件 |
| backend/src/joe/widget-events.ts | 使用统一持久事件恢复与授权，保留旧订阅兼容适配 |
| backend/src/joe/routes.ts | 专用接口逐步转成受保护的协议适配器 |
| backend/src/joe/youtube-tool.ts、video-play-tool.ts、weather-tool.ts | 注册业务动作，Mastra 工具包装调用同一运行时 |
| backend/src/joe/data-mcp.ts | 保留数据清洗，连接与调用受 Provider/网络策略控制 |
| web/src/joe/workspace-preview.tsx、widget-visibility.ts | 按注册描述渲染，展示引用关联唯一 Widget |
| web/src/joe/canvas-layout.ts、canvas-storage.ts | 保留布局数据，以兼容映射连接稳定身份 |
| web/src/joe/video/use-video-history.ts | localStorage 最近播放导入虚拟业务空间 |
| web/src/joe/account-cards.tsx | 通过 Bridge 查询费用投影与执行设置动作 |
| backend/src/joe/behavior-store.ts、shared/widget-behavior.ts | 保留行为语义、事件身份与历史上下文，增加统一授权入口 |

## 3. M0：基线与备份

实施前记录 git 状态、锁文件版本、现有 DB schema、行数与测试基线。备份 Joe 数据目录和数据库，测试恢复；不要访问或打印密钥内容。

列出已有会话、画布、实例、资源、观看记录的数量与稳定 ID 映射。用匿名 fixture 覆盖两个画布各有同类型卡片、资源不同、隐藏状态不同的情况。迁移时限制相关写入或使用维护窗口，避免边读边变化。

## 4. M1：稳定身份与唯一 Widget

1. 为现有单用户 Joe 建立持久 joeId，与已有 Memory owner 建立映射，不重写对话 ID。
2. 将已有 `builtin.costs`、`builtin.settings`、`builtin.weather`、`youtube.video` 保留为兼容的稳定 widgetId，避免无必要重命名。
3. 为每个 `(joeId, widgetId)` 创建一次安装/逻辑 Widget 与空间。工厂安装使用正常注册和授权流程，记录预置来源及权限。
4. 保存旧 canvasId/instanceId/resourceId → Widget/空间/展示引用映射。原实例 ID 可以继续作为展示引用 ID，不作为新的逻辑 Widget 身份。
5. 相同 Widget 的多个历史画布引用指向同一空间，位置与可见性仍各自保存；这不引入多个业务 Widget。

现有资源按画布保存，可能存在不同天气地点或视频结果。全部保留为带来源的记录，不以最后遍历者覆盖。当前活跃视图优先沿用自身历史绑定；同一视图多候选时按更新时间、再按稳定 ID 决定，并记录选择依据。非当前记录保留为迁移历史，不创建第二空间。

迁移生成的目标 ID 写入映射表后复用，重复执行不得新增空间或记录。先升级读取与验证，再切换生成/写入，保留历史外部 ID 和事件 ID。

## 5. M2：业务空间与数据导入

| 数据 | 处理 |
| --- | --- |
| 天气/视频资源快照 | 按来源资源 ID 导入，保留数据与更新时间，映射为共享空间中的记录与展示投影 |
| 最近播放 | 读取现有 `youtube-widget:recent:v1`，校验后通过受限迁移接口导入 |
| 观看行为 | 保留原 recordId/eventId、测量数据与历史 canvas/session/instance 上下文；关联统一 Widget/空间 |
| 费用 | 保留费用账本为权威来源，不复制成独立可编辑 Widget 数据 |
| 设置 | 保留现有宿主配置为权威来源，Widget 通过获准 Provider 读写 |
| 布局 | 原位置、旋转、展开约定和版本保持兼容，不清空用户布局 |

最近播放没有可靠时间信息时不伪造时间：保留已有顺序，使用来源键/内容摘要记录导入批次以实现幂等。合并时保留服务端已有顺序，再追加缺失条目，并按现有最近播放容量规则裁剪；没有服务端数据时保持原数组顺序。

只有服务端确认导入成功才标记完成；原 localStorage 保留为只读回退备份。普通页面刷新不能重复导入。迁移接口限定当前用户、对应预置 Widget、已知数据格式与一次性批次，不成为任意写入后门。

观看记录首期可保留物理旧表并通过空间适配器访问，避免两份权威数据；必须确保空间删除流程能够删除/隔离关联记录，旧入口无法继续写入。不要只创建空空间却继续让行为绕过归属检查。

## 6. M3：四个预置清单与业务能力

### 视频

- 注册搜索、播放、暂停、最近播放与观看事件契约；保留链接定位及标题唯一匹配规则。
- searchYouTube/playYouTube 保留 Mastra 工具接口作为过渡，内部调用统一动作；不直接操作 WidgetStore。
- 搜索成功提交资源与展示绑定，首次失败不创建展示，隐藏不被迟到结果恢复。
- YouTubeCard 与 useYouTubePlayer 保留 UI/播放器适配，业务请求改用 Bridge。
- 播放请求、实际开始、失败、自动播放受阻分别反馈；恢复快照不自动播放。
- 最近播放通过虚拟存储读写；观看事件经 Bridge 进入原测量与行为规则。
- 供应商播放器 iframe 可保留；不以 iframe 承载 Widget 本身，不加载第三方 Widget JS。

### 天气

- 注册实时查询和刷新动作、weather@1 兼容 schema，以及宿主天气模板。
- 天气工具和前端刷新共用统一业务动作，保留地点、IP 定位、供应商错误与缓存语义。
- 移除组件绕过 Bridge 调用专用天气 API 的路径。
- 不借迁移新增未来预报、额外定位权限或后台轮询功能。

### 费用

- 注册只读费用查询/刷新能力，输出脱敏投影；不向 Widget 提供供应商凭据。
- CostPanel 保留显示逻辑，数据由 Bridge 资源适配器提供，不直接消费整个 bootstrap。
- 保留原账单同步和对账逻辑，不将显示刷新变成新账本写入。

### 设置

- 注册配置读取和明确字段的修改动作，保留模型/音色等现有验证及保存反馈。
- SettingsPanel/SettingsSwitch 通过 Bridge 调用，不获得完整 backend 配置对象。
- 密钥只返回已配置状态，凭据保存由宿主专门授权能力管理，不进入 Widget 空间或模型输出。
- 字段权限由工厂策略显式授予，第三方不能因使用 settings 模板就获得全局设置修改权。

## 7. M4：统一渲染、工具与事件

引入宿主模板注册表，workspace-preview 按 Widget 清单与展示引用渲染，现有四组件作为模板实现。UI 细节继续使用 RareUI、Tailwind、Motion。

chat.ts 不再根据 searchYouTube/getWeather/playYouTube 名称决定卡片事件。统一动作运行时提交业务结果和资源投影，模型只收到 toModelOutput 裁剪后的内容。对话失败不回滚已提交业务状态。

保留临时 `card.open`、`video.play`、旧 widget SSE 的兼容适配，仅从同一已提交结果派生；不能形成第二条写入或重复播放路径。旧输入也必须进入新鉴权与 dispatcher。

当前 UI 的 removeWidget 行为需按实际路径核对，不能依据函数名把关闭改成卸载。迁移明确区分隐藏、移除保留数据、移除并删数据；后两者使用独立管理操作，删除确认由宿主呈现。

## 8. M5：切换、回退与收尾

按 Widget 分阶段切换读取与写入，使用服务端统一开关决定权威路径。禁止新旧两套业务存储同时双写。先只读影子比较，再切换写入，再切换展示。

每阶段验证 ID/数量、资源绑定、布局、观看汇总与费用/设置值一致。影子比较不得调用有副作用的动作。

新路径尚无新写入时可通过开关回退；发生新写入后必须使用已验证的反向导出/兼容读取方案，或者停止写入后恢复明确检查点。不能直接恢复旧备份并声称没有数据损失。

确认所有调用方迁移后移除专用业务分支和兼容事件写法，保留必要历史读取与映射。保留迁移审计结果，不自动删除回退备份。

## 9. 必须通过的验证

| 范围 | 现有测试入口 / 新增验证 |
| --- | --- |
| Widget 状态 | widget-store、widget-visibility、widget-resource-state、widget-display-gate；新增逻辑唯一与跨画布引用迁移 |
| 视频 | video-play、video-resource、video-card-state、youtube-player；新增统一动作回执与非重复播放 |
| 行为 | behavior-store、behavior-delivery；新增迁移 ID 保留、授权与空间删除 |
| 天气 | weather、weather-cache、weather-presentation；验证原查询语义和 Bridge 唯一路径 |
| 费用/设置 | account-cards 及相关账单测试；验证脱敏、字段授权与保存行为 |
| 画布 | canvas-layout、canvas-session、canvas-preferences；验证坐标/可见性和历史映射 |
| 对话 | chat；验证统一工具结果、取消、迟到展示与兼容事件去重 |

新增迁移集成测试使用临时数据库与浏览器存储 fixture：空库、旧库、重复执行、中断恢复、同类型多画布不同数据、删除重建、回退后再迁移。不能只断言新表存在。

完成标准：四张预置卡片均可通过同一注册/授权/Bridge/数据接口工作；内部标识不能绕过策略；旧数据与布局可追溯；新增外部 Widget 不再需要向 chat.ts 或 workspace-preview 添加类型分支。
