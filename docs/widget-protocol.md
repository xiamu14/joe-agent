# 卡片实例与数据绑定协议 v1

日期：2026-10-29。状态：协议设计定稿；不代表下述工具展示链路、事件流和资源服务已经实现。

当前已实现：示例画布中的费用与设置卡片、真实费用和设置绑定、旧 `card.open` 到当前画布的兼容处理。天气、视频仍使用现有专用实现。当前布局存储仍是 `CanvasSnapshot.version=1`，不能与本协议版本混为一谈。

## 身份与归属

- `canvasId` 是稳定的画布标识；`sessionId` 是对话会话，二者不能混用。
- `instanceId` 是画布内稳定的实例 nanoid（默认安全版 `nanoid()`，21 字符）；更新内容不能换 ID。允许同类型多个实例。
- `widgetType` 是注册表中的能力标识，例如 `builtin.costs`、`builtin.settings`、`builtin.weather`、`youtube.video`、`provider.finance`。来自外部的任意字符串不能自动注册。
- `resourceId` 是服务端分配的不透明资源标识，不是可任意抓取的 URL，也不携带密钥。
- 同一授权范围内多个实例可以绑定同一资源。服务端根据登录身份校验所有归属，不能信任客户端提交的 owner。

### ID 生成规则

所有应用自生成的不透明 ID 优先使用安全版 `nanoid()`，默认 21 字符、URL 安全字符集；包括 canvasId、instanceId、resourceId、sessionId、turnId、commandId、clientId、messageId、attachmentId 与随机 eventId。由 Runtime/业务代码生成，模型只能引用已提供的 ID，不能生成或猜测 ID。

- 创建时生成一次，持久化后复用；重试沿用原 commandId，React key 沿用 instanceId/模板内稳定数据键，禁止每次渲染生成。
- 唯一约束由存储层保证。新建冲突时重新生成；重试命中已存在命令时返回原结果，同 ID 不同载荷必须拒绝。
- 外部已有 ID 原样保存并按 provider 命名空间隔离；注册表名称、字段语义键不属于随机 ID。
- revision、queryGeneration、事件顺序使用递增版本，不使用随机 ID 排序。SSE 游标使用持久事件日志游标；不将 nanoid 当作时间或顺序编码。
- eventId 与 cursor 分离：eventId 用于去重，cursor 用于恢复，SSE 的 id 字段使用 cursor。若日志系统要求自身的事件主键格式，则保留其格式并记录理由。
- 默认不缩短、不用 `nanoid/non-secure`。ID 不是访问凭据，所有操作仍需鉴权。
- 新协议 ID 校验为 `^[A-Za-z0-9_-]{21}$`；迁移中的旧 session/turn/message 等入口明确兼容已使用的 UUID。先升级读取与校验，再切换生成端；不重写既有记录 ID，不打断历史会话与引用。

当前代码仍有 `.uuid()` 校验和 UUID 生成器，本次协议修改不代表这些运行时代码已经迁移。迁移需一起覆盖前后端校验、桌面回执、localStorage 恢复和测试，不能只替换 randomUUID。

依据：[Nano ID 官方仓库](https://github.com/ai/nanoid)。默认安全版满足本协议不透明标识要求。

## 实例

```json
{
  "protocolVersion": 1,
  "canvasId": "V1StGXR8_Z5jdHi6B-myT",
  "instanceId": "Uakgb_J5m9g-0JDMbcJqL",
  "widgetType": "builtin.costs",
  "revision": 3,
  "visible": true,
  "bindings": {
    "usage": { "resourceId": "f3Kp9Qx2Lm7Nc4Rv8Ts1A", "pointer": "" },
    "accounts": { "resourceId": "g4Lq0Ry3Mn8Pd5Sw9Ut2B", "pointer": "/accounts" }
  },
  "view": { "kind": "registered", "name": "costs", "version": 1 }
}
```

`revision` 是实例自身的递增整数版本，仅在可见性、绑定或 view 改变时增加。数据变化不改变实例版本。布局位置单独存储，并继续由画布管理；聚焦、拖动、动画和播放器实际状态属于客户端，不进入共享业务资源。

`pointer` 使用只读 JSON Pointer，空串代表资源整体。只允许 schema 中存在的字段；禁止表达式、脚本、动态 URL 和原型属性访问。

首版 `view.kind` 只允许 `registered`，由开发者用 RareUI 实现并注册固定模板。Think 只能选择已注册的模板和模板 schema 明确允许的视图参数，例如 Finance 的 `mode: "balance" | "accounts"`；不能返回组件树、JSX、HTML、CSS 或样式参数。未注册模板和非法参数直接拒绝。

AI 自定义 UI 暂缓：后续先为 RareUI 补齐 design token，再单独设计和版本化组件组装协议；v1 不预留可执行的 composed/tree 入口。外部卡片接入使用经过审核的模板、资源 schema 和动作注册，MCP 仅作为能力与数据适配层，不直接注入 UI。

Finance 示例使用同一固定模板：余额模式只展示总余额；账户模式增加明细与收起操作。其他客户端入账只更新绑定数据，保留实例、模式与位置。展示示意采用浅灰背景、白色卡片、蓝紫色交互点缀和绿色更新反馈，无边框。

## 资源快照

```json
{
  "resourceId": "f3Kp9Qx2Lm7Nc4Rv8Ts1A",
  "schema": "usage@1",
  "revision": 42,
  "status": "ready",
  "updatedAt": "2026-10-29T06:00:00Z",
  "data": { "model": { "known": 0.12, "pending": 0 } },
  "error": null
}
```

- `status`：`loading | ready | stale | error`。loading 的 data 可为 null；stale 保留上次成功数据并附最后更新时间；error 无可用数据。
- 资源按授权范围、provider、标准化查询参数去重。天气参数包括地点 ID、日期范围、时区和查询类型；Finance 包括账户范围、币种和统计口径。
- 每次发布完整快照都增加资源 revision。资源创建者保证版本持久且单调，不直接依赖可能回退的时间戳排序。
- 金额存储使用明确的币种与最小货币单位或精确十进制字符串。汇率与聚合由数据服务处理。
- `data` 按注册 schema 校验；错误只包含安全的错误码与可展示信息，不传密钥、调用栈。

## 命令与事件

命令共同字段：`protocolVersion, commandId, canvasId, instanceId, expectedRevision`。对话发起时附 `sessionId, turnId`；客户端命令附 `clientId`，服务端校验该客户端是否有权操作此画布。

命令必须是判别联合，各自校验参数：

| 命令 | 参数 | 语义 |
| --- | --- | --- |
| `widget.present` | 已注册 widgetType、bindings、view | 创建或更新指定实例；同 commandId 重试幂等 |
| `widget.visibility` | visible | 显示或隐藏；不删除业务数据 |
| `widget.remove` | 无 | 删除实例，释放其资源引用 |
| `widget.focus` | 目标 clientId | 聚焦/展开指定客户端中的实例 |
| `widget.action` | actionId、按动作 schema 校验的 args | 播放、暂停等已注册动作 |

只有目标实例可改变。expectedRevision 不匹配时返回 conflict 和最新实例，不能直接覆盖用户更新。语音“关闭”按上下文映射为隐藏或收起；“删除卡片”才对应 remove。

事件公共信封：

```json
{
  "protocolVersion": 1,
  "eventId": "h5Mr1Sz4Np9Qe6Tx0Vu3C",
  "cursor": "durable-log-cursor",
  "canvasId": "V1StGXR8_Z5jdHi6B-myT",
  "type": "resource.snapshot",
  "resource": { "resourceId": "f3Kp9Qx2Lm7Nc4Rv8Ts1A", "revision": 43 }
}
```

以上 resource 仅展示关键字段，实际必须发送完整的合法资源快照。

事件类型：`widget.snapshot`、`widget.removed`、`resource.snapshot`、`action.result`。资源事件独立于对话，没有强制 turnId；由一次工具请求触发时可附 causation 的 sessionId/turnId/commandId。

`action.result` 区分 `committed`（服务端接受状态）、`rendered`（目标客户端完成渲染）、`succeeded`（播放等动作真实成功）、`failed`。接受播放命令不等于已经播放。ack 必须匹配 commandId、clientId、canvasId、sessionId/turnId（如存在）。

## 持续更新

HTTP 提交命令，独立 SSE 订阅数据；不复用随回答结束而关闭的 `/chat` 响应。首次订阅提供一致的快照和事件游标，断线按游标恢复；过期游标改取完整快照。客户端忽略重复 eventId 和不大于当前 revision 的快照。

外部更新：业务服务提交 → webhook/MCP 通知/轮询 adapter → 读取并验证新数据 → 发布资源快照 → 更新绑定节点。MCP 通知本身不假定携带完整数据，也不保证重放。

隐藏实例不会因资源变化重新显示；资源可以继续由服务端维护，前端恢复时先读取最新版本。数据更新不重新生成 view，不重新排序卡片，不重新调用模型。不同来源更新不同资源；不能用全局“最后返回的请求”覆盖所有卡片。

当前 loopback 后端不向外开放。其他客户端写 Finance 服务，Joe adapter 主动连接该服务；远程直接写 Joe 的能力需要另行实现认证和授权。

## 当前绑定映射与迁移

| widgetType | 当前来源 | 目标绑定 |
| --- | --- | --- |
| builtin.costs | useJoe.bootstrap.usage，`/usage` 轮询；`/voice-account` | usage / accounts 两个资源 |
| builtin.settings | bootstrap.settings、models、configured；PUT `/settings` | settings / capabilities 资源，保存动作 |
| builtin.weather | `/weather` | 按地点和日期查询的天气资源 |
| youtube.video | 固定视频播放器 | 搜索结果资源、选中视频引用；播放状态留在目标客户端 |

本次只兼容现有 `card.open(costs|settings)`。下一阶段由后端分配稳定实例 ID 并建立注册表，将事件映射到 `widget.present`；移除兼容入口前，先升级旧页面与桌面客户端。已有布局按旧 ID 映射到新 instanceId，保留用户位置，不能直接清空 localStorage。

## 展示决策：仅使用 Think

卡片是否显示、显示哪个类型及绑定什么内容，统一由 Think LLM 通过结构化工具调用决定。卡片链路不调用 Jev，不提前创建预测卡片，不使用第二个意图分类器。模型配置中保留的 Decision 类型不参与此链路。

唯一展示时序：

```text
用户消息 → Think 选择工具及参数
         → 工具执行，取得真实数据或已存在的资源
         → Runtime 校验并提交实例与绑定
         → 工具成功返回，发布 widget.snapshot
         → 前端显示卡片或动画更新内容
         → Think 完成简短正文
```

“工具返回”指成功的结构化 tool result，不是流中的 tool-call 起始片段、未完成参数或模型正文。前端无需等待最终回答结束。查询期间仅在聊天区显示处理状态，新卡片在首次有效结果到达后入场；已有卡片保留原内容。

## 工具与运行时边界

- Think 可调用数据工具进行查询，但查询成功不自动等于用户要求展示。显示必须来自显式展示工具，或具有明确展示参数的业务工具；工具默认行为写在注册定义中。
- `widget.present` 绑定已校验的资源引用与 view，返回持久化的实例快照。费用、设置可以读取已有真实资源后直接返回；视频列表、指定城市天气先完成查询再返回。
- 工具执行器记录已提交结果并发布快照，事件与提交结果保持一致。前端按 instanceId 和 revision 应用，不从模型文字解析卡片，也不让模型重新抄写业务数据。
- 控制工具的结果与展示数据分开：播放、暂停等操作仍需目标客户端执行回执，不能因工具接受请求就声称已经播放。
- 没有展示工具调用时，画布不因本轮对话改变。最终正文生成失败不删除已成功展示的卡片。

## 失败、并发与用户操作

保留必要的数据一致性控制，不引入预测仲裁、候选槽、置信度阈值、临时卡片 TTL 或整轮展示计划收敛事件。

1. 首次查询失败：不创建卡片，工具返回真实错误，Think 简短说明。已有卡片刷新失败：保留旧数据并标记 stale/error 与最后更新时间。
2. 同一次工具调用重试沿用 commandId；重复成功结果不会重复创建卡片。同类多实例按明确 instanceId 和标准化查询区分，不按类型直接覆盖。
3. 查询上下文携带 canvasId、sessionId、turnId、instanceId（更新时）和 queryGeneration。实例更新校验 expectedRevision；同实例的旧查询不能覆盖新查询，不同城市实例互不影响。
4. 用户取消或新轮次取代旧轮次时，阻止尚未提交的旧展示结果。已提交卡片保留，不通过取消对话隐式撤销业务状态。
5. 用户在请求期间隐藏或移除目标实例后，迟到结果不能重新打开它；可用实例版本或本轮隐藏记录拦截。后续新的明确打开请求可再次显示。
6. 用户拖动只更新布局，内容结果不能移动卡片或抢焦点。只有明确聚焦/展开操作才调用 widget.focus。
7. 已绑定资源的后台同步不经过 Think，也不受一次对话结束影响；只更新数据，不自动显示已隐藏的卡片。

动画使用 Motion 并尊重 reduced-motion：新卡片淡入，已有卡片按模板内稳定数据键更新内部内容，不重播整个画布入场或每次快照翻卡。

## 实施边界

当前运行代码没有 Jev 预测调用，因此无预测运行时需要删除。`backend/src/config/models.ts` 中的 Think/Decision 分类保留；本次取消的是卡片预测用途。

现有费用/设置仍由最终结构化回答的 card 字段触发 `card.open`。迁移到上述工具链路时，应把该副作用移入展示工具，并移除最终回答的 card 控制字段，避免工具结果和最终回答重复触发。旧客户端需要兼容时，在同一工具结果出口映射旧事件，不能保留第二个独立决策出口。本次协议修订不声称该迁移已经实现。

## 验收

1. 卡片链路只调用 Think；无 Jev 请求或预测展示事件。
2. tool-call 起始、流式参数及查询等待不会创建新卡片；展示工具成功返回后即显示，无需等待正文完成。
3. 无展示工具调用或首次查询失败时，不新增卡片；已有内容不会因此消失。
4. 重复工具结果不重复建卡；已成功展示的卡片不因后续正文失败被删除。
5. 两城市并行查询互不覆盖；取消后尚未提交的迟到结果不显示。
6. 用户关闭的卡片不会被本轮迟到结果重新打开；UI 更新保持焦点和卡片位置。
7. Finance 外部更新无需新对话或模型调用；断线恢复最新版本。
8. 未授权资源、未注册模板、非法视图参数、非法绑定和不匹配的回执被拒绝。
9. nanoid/旧 UUID 迁移保留会话与引用；事件去重和有序恢复使用独立字段。
10. 旧 time 输出被拒绝；costs/settings 可在示例与空白画布打开；旧布局升级保留坐标。
