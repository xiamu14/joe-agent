# Widget Unified Protocol V1：UI 协议

日期：2026-10-31。状态：方案，尚未实现；字段和方法示例待契约阶段冻结。归属：[Widget Unified Protocol V1](./widget-unified-protocol-v1.md)。本文件不定义安装包、压缩格式或导入细节，这些仍待讨论。

## 1. 目标与范围

第三方仅提交 UI 描述、数据 schema 和获准操作声明，即可实现当前 YouTube Card 的列表、最近播放、选播、返回、状态提示及观看记录体验，不提交 React 代码或修改 Joe 核心类型分支。

采用受控组件目录、声明式布局与绑定、有限交互规则和宿主能力组件。内置视频 Widget 也使用同一描述契约。此前只能选择整张固定模板的范围据此扩展；不开放通用脚本或任意组件执行代码。

首期 Web、单活跃客户端，不使用 iframe 承载 Widget，不实现多窗口路由。未来 App 复用语义与能力协商，不承诺跨平台逐像素相同。不依赖 LLM 解释或执行 UI；描述可以手写或由 AI 辅助生成，均须严格验证。

## 2. 参考与取舍

| 参考 | 借鉴 | 不直接照搬 |
| --- | --- | --- |
| Open Intelligent UI / OpenUI | 带 schema 的组件注册、响应式状态、动作、从目录生成开发辅助信息 | 完整表达式语言、HtmlView、直接浏览器持久化和组件自行网络访问 |
| A2UI | 组件目录、结构与数据分离、路径绑定、局部交互与外部事件分离 | 将全部界面状态自动交给 Agent，或以双向绑定代替存储授权 |
| json-render | 受控 catalog、JSON 描述与宿主组件映射 | 将渲染器视为身份、授权或虚拟存储实现 |

参考项目的 YouTube 组件主要是视频嵌入，并不覆盖 Joe 的最近播放、播放控制回执和观看计量。媒体适配与测量仍由 Joe 提供。

资料依据（2026-10-31 阅读）：[组件注册](https://github.com/thesysdev/open-intelligent-ui/blob/main/src/lib/library.ts)、[参考播放器](https://github.com/thesysdev/open-intelligent-ui/blob/main/src/lib/components/extra.tsx)、[OpenUI](https://github.com/thesysdev/openui)、[A2UI 数据绑定](https://a2ui.org/concepts/data-binding/)、[A2UI 动作](https://a2ui.org/concepts/actions/)、[json-render](https://json-render.dev/docs)。借鉴概念不表示采用或兼容其完整 wire format；具体依赖另行评估。

## 3. UI 描述结构

| 部分 | 内容 |
| --- | --- |
| requirements | 组件目录、版本与宿主能力要求 |
| sources | 操作引用、输入、触发、并发、响应投影、订阅 |
| state | 可写局部 UI 状态的类型、默认值和恢复策略 |
| view | 组件、布局、插槽、绑定、可见条件与事件映射 |
| actions | 本地状态操作、Bridge 调用及结果处理 |
| presentation | 样式 token、尺寸档位、动画语义和无障碍 |

描述使用可序列化数据结构；JSON Schema 定义实际契约，下文 YAML 仅为可读示例。验证未知组件、错误属性、非法绑定、重复节点 ID、循环引用、超大列表和过深结构。组件目录由宿主安装，不因声明一个目录 URL 就下载执行代码。

节点 ID 是描述内的稳定语义键，列表 key 使用稳定业务 ID；渲染不得生成新 ID。结构与数据独立版本化，普通数据更新不重建整张卡片或播放器。第一版加载完整、已验证的 UI 描述，不要求流式执行半完成描述。

## 4. 宿主组件目录

| 层 | 首批组件 | 职责 |
| --- | --- | --- |
| 基础布局 | Stack、Row、Grid | 有限方向、间距、滚动与排列 |
| 内容 | Text、Image、Icon | 纯文本、获准资源和图标 |
| 控件 | Button、Disclosure | 操作和折叠 |
| 数据展示 | Collection、EmptyState、Status | 列表与请求状态 |
| 媒体能力 | MediaList、MediaPlayer、MediaPoster | 媒体条目、播放和紧凑封面 |
| 画布能力 | WidgetSurface | 紧凑/展开插槽、尺寸请求与宿主动作 |

每个组件声明 props schema、事件及参数 schema、可绑定输入、只读输出、重置条件、无障碍要求和能力依赖。基础控件映射到 RareUI，布局/样式用 Tailwind，动画用 Motion。

MediaPlayer 输入经过校验的 mediaRef 和允许的 controls；宿主输出 idle/loading/ready/playing/paused/blocked/error 状态、进度和时长。动作包括 play/pause；事件包括 ready/playbackStarted/paused/blocked/failed/ended。第三方不能给 playing 任意赋值。

WidgetSurface 控制权仍属于宿主：请求展开不等于可覆盖用户隐藏，尺寸档位不等于任意 CSS。背景专注效果由 `mediaFocus` 等语义请求表达，不能让描述操作 portal、DOM 或全局遮罩。

缺少必需媒体能力则拒绝以完整播放模式启用，或使用清单明确声明的封面/外链降级；不能静默伪装为已支持。新供应商播放器仍需受信任宿主适配，不会由 UI 描述自动产生。

## 5. 数据域与绑定

| 数据域 | 示例 | 可写主体 |
| --- | --- | --- |
| data | 搜索结果、最近播放、业务记录投影 | 经校验的 Bridge 响应/资源事件 |
| ui | 当前页、折叠状态、表单草稿 | 有限本地动作 |
| runtime | 活跃媒体、实际播放状态、播放器错误 | 宿主能力，只读给描述 |
| host | 可见性、展开状态、主题、语言 | 宿主，只读给描述 |

绑定支持字面量和有明确作用域的 JSON Pointer；列表事件绑定限制在当前条目，字段必须满足对应 schema。禁止原型属性访问、任意求值和跨 Widget 数据路径。

格式化只使用宿主注册的有界纯函数，如 duration、compactNumber。条件限 equals/exists/and/or 等明确定义操作，并限制复杂度。双向绑定只写 ui 草稿，不直接写持久记录。

UI 本地状态变化同步生效，再解析后续事件参数。新搜索返回列表等行为显式声明，不依赖组件偶然重建。页面恢复不自动重放播放或写入动作；持久业务数据必须通过虚拟存储，不将本地状态缓存视为权威数据。

## 6. 操作声明与传输适配

```text
初始化 / UI 事件
→ 数据源或动作引用
→ Bridge：身份、授权、参数、取消
→ HTTP / MCP / Joe 内部能力 / 虚拟存储
→ 标准结果或更新事件
→ 数据源模型
→ 绑定组件更新
```

HTTP/MCP 是传输方式，不代表内部或外部身份。同进程宿主能力不必为了统一绕 MCP。manifest 声明操作、连接引用、输入输出 schema、副作用与权限；UI 只引用 operation。

同一个搜索操作的两种适配示例（实际安装选择其一）：

```yaml
operations:
  videos.search:
    transport:
      kind: mcp
      connection: video-provider
      tool: youtube_search
    inputSchema: video-search-input@1
    outputSchema: video-search-result@1
    effect: read
```

```yaml
operations:
  videos.search:
    transport:
      kind: http
      connection: video-api
      request:
        method: GET
        path: /videos/search
        query:
          q: { input: /query }
    inputSchema: video-search-input@1
    outputSchema: video-search-result@1
    effect: read
```

Joe 绑定连接的地址与凭据并强制执行出站策略。UI 不能改变目标、方法、敏感 header 或权限。MCP 内容封装和 HTTP 状态码由适配器归一化；按已声明的 schema 验证。不同 Provider 的字段差异通过受限映射或 Provider 统一输出解决，不允许上传任意转换脚本。

## 7. 数据源：请求、响应与状态

```yaml
sources:
  searchResults:
    operation: videos.search
    input:
      query: { state: /query }
    trigger:
      event: search.submit
    concurrency: replace
    retainPreviousData: true
    result:
      items: { response: /data/videos }
      query: { response: /data/query }
```

第一版触发包括初始化、明确用户事件、刷新、受限参数变化、获准定时刷新。参数变化须声明依赖、去抖与频率；定时刷新须定义可见性/卸载时的暂停规则，后台刷新另需权限。不得以渲染或任意状态变化隐式发起请求。

数据源运行时维护 data、status、error、revision、updatedAt。status 为 idle/loading/ready/refreshing/stale/error；UI 只能读取，不能伪造成功。

- 首次请求 loading；有效响应即使为空列表也为 ready。
- 保留旧数据时刷新为 refreshing；刷新失败有旧数据为 stale，无数据为 error。
- 先验证操作输出，再做字段投影；缺失必需字段是 schema 错误，不隐式当空列表。
- replace 用于可取代的读取：取消旧请求并用请求代次丢弃迟到结果；取消不是唯一防乱序手段。
- 写动作不默认 replace。并发策略与操作 effect 在注册时校验，避免取消掩盖副作用。
- 普通网络失败保留旧数据不意味着撤权后也可保留展示；撤权/空间删除须清理相关投影与访问。

调用结果与资源快照不同：前者描述本次操作状态，后者描述资源有效内容与 revision。结果体示意（位于统一协议响应内，不另建信封）：

```json
{
  "operationId": "operation-id",
  "status": "succeeded",
  "data": { "query": "音乐", "videos": [] },
  "resource": { "resourceId": "resource-id", "revision": 12 }
}
```

accepted 不等于 succeeded；长任务返回 operationId 后通过结果查询/事件完成。错误沿用统一协议安全错误码、可展示信息与重试建议，禁止原始堆栈和凭据进入 UI。请求失败不自动生成新 operationId 重试写操作，外部结果未知遵循主协议。

## 8. 持续更新、订阅与恢复

```yaml
sources:
  recentVideos:
    operation: history.list
    trigger:
      lifecycle: initialize
    updates:
      subscription: history.changed
      mode: invalidate
```

第一版支持 snapshot 与 invalidate：前者发送校验后的完整快照并按 revision 应用，后者合并失效通知后重读。暂不开放任意 JSON Patch；未来增量必须带基础版本与允许路径。

| 来源 | 适配 |
| --- | --- |
| HTTP 普通接口 | 单次请求结果 |
| HTTP SSE / WebSocket | backend 消费并转为获准资源事件 |
| MCP 资源通知 | 服务支持时重读资源；不假定通知含完整数据或可重放 |
| Joe 内部资源 | 业务提交后发布资源事件 |
| 虚拟存储 | 事务提交后发布记录/集合变化 |
| 无推送的服务 | 经授权的有界轮询 |

Web 通过统一事件通道接收，不为每个 source 创建独立外部客户端。Bridge 管理订阅释放、限流和引用计数；后台持有订阅须有明确生命周期和授权。

一致快照+cursor 防止初始化与订阅间遗漏。可重放日志按 cursor 恢复；远端不可重放则重新取快照。cursor 失效重新同步，不声称从未漏过远端事件。重复 snapshot 忽略，不触发播放或历史写入。对话结束不自动停止独立业务订阅。

## 9. 动作与结果处理

本地允许设置声明字段、切换布尔、有限条件与状态转移；外部副作用调用声明过的 Bridge 动作。禁止循环、递归、动态方法名、任意 URL 拼接和自动级联请求 watcher。事件处理步骤与调用链须有限额。

```yaml
actions:
  renameItem:
    operation: items.rename
    input:
      id: { event: /itemId }
      title: { state: /draftTitle }
      expectedRevision: { event: /revision }
    onSuccess:
      invalidate: [items]
```

写成功后只支持应用已提交快照或使相关数据源失效重读。第一版不做持久数据乐观写入；UI 草稿可立即变化。onAccepted 可以展示处理中或切换页面，不能伪造最终业务状态。失败保留用户草稿并显示安全错误，冲突不自动覆盖。

事件来源、权限、operationId 和原始调用者由运行时管理。Agent、UI 和跨 Widget 调用进入相同动作入口，不从按钮文案隐式生成模型指令。数据源不能调用未授权的其他 Widget 空间。

宿主本地动作可以由 Bridge 本地分发，保留逐次宿主策略检查，不强制每次等待 backend 往返；服务器数据与网络操作仍由 backend 最终鉴权。浏览器用户手势和自动播放限制由真实媒体结果决定，不能通过协议绕过。

## 10. YouTube 参考描述与能力映射

下面只展示组合方式；完整契约 fixture 还需列明状态类型、折叠事件、sources、返回/错误/空态等，不能将片段当作可安装描述。

```yaml
uiVersion: 1
requirements:
  catalogs: [core@1, media@1]
  capabilities: [media.youtube.playback@1]
state:
  page: { type: enum, values: [browse, player], default: browse }
  recentExpanded: { type: boolean, default: false }
view:
  component: WidgetSurface
  props: { title: 视频, sizeProfile: media }
  slots:
    content:
      component: Stack
      children:
        - component: Disclosure
          visibleWhen: { stateEquals: [page, browse] }
          props:
            title: 最近播放
            expanded: { state: /recentExpanded }
          content:
            component: MediaList
            props:
              items: { source: recentVideos, path: /items }
              layout: grid
              itemKey: id
            events: { select: chooseVideo }
        - component: MediaList
          visibleWhen: { stateEquals: [page, browse] }
          props:
            items: { source: searchResults, path: /items }
            layout: list
            itemKey: id
          events: { select: chooseVideo }
        - id: player
          component: MediaPlayer
          visibleWhen: { stateEquals: [page, player] }
          props:
            media: { runtime: /activeMedia }
actions:
  chooseVideo:
    operation: media.selectAndPlay
    input:
      mediaRef: { event: /item/mediaRef }
    onAccepted:
      setState: { page: player }
```

mediaRef 由经校验的媒体结果/显式视频链接解析产生，原视频 schema 可由宿主适配为该引用；不是任意 URL 或可执行入口。最近播放和搜索来源使用相同的媒体条目契约。

| 当前功能 | 协议与宿主分工 |
| --- | --- |
| 搜索列表 | source 调用 HTTP/MCP 操作，MediaList 绑定结果 |
| 最近播放 | history.list + 变更订阅，Disclosure 和网格展示 |
| 选择播放 | select 事件调用 media.selectAndPlay，接受后切换页面 |
| 返回列表 | 先请求暂停，再切换本地页面；宿主强制隐藏播放器暂停 |
| 加载、受阻、失败 | runtime 只读状态驱动 Status/Button/安全外链 |
| 紧凑封面 | MediaPoster，显式点击才请求展开/播放 |
| 背景与尺寸变化 | mediaFocus/尺寸档位，由宿主 Motion 与画布实现 |
| 观看记录 | 宿主测量器按已有规则采样，Bridge 授权与可靠投递 |

完整流程：搜索响应 → 校验/投影 → 列表；选择 → 接受/加载 → 实际播放开始 → 幂等更新最近播放 → 存储事件刷新列表；正的可测播放时长 → 观看记录。自动播放受阻显示“点击播放”，失败不报告已播放。

最近播放写入由实际播放事件触发，不由任意 UI 状态变化触发；每次有效播放选择的操作身份用于去重。观看时长和覆盖区间来自宿主适配器，第三方描述不能伪造测量或用户确认。

保留当前后台暂停、返回不自动续播、隐藏不被刷新重新打开等产品语义。资源更新保持节点身份，不重建播放器；更换媒体和销毁的重置/结算规则由能力契约明确。独立业务持久化失败不伪装播放失败，采用有界可靠重试并保留可观测结果。

## 11. 外观、安全和媒体边界

样式只允许布局方向、compact/comfortable 密度、有限间距/圆角/字体/表面 token、尺寸档位及 appear/collapse/contentResize 等动画语义。无任意 CSS、className、固定定位、z-index、DOM 查询或 portal。交互标签和无障碍名称按组件 schema 校验；自动尊重 reduced-motion。

宿主把 token 映射为 RareUI/Tailwind/Motion，未来 App 映射为对应实现。mediaFocus 不允许覆盖宿主授权/系统界面，业务内容不能假冒宿主确认。

所有图片、外链、媒体来源遵循主协议展示资源与网络规则。组件不自行搜索替代图片或扩展域名。YouTube 现有供应商嵌入播放器可由受信任媒体适配器保留；它不是 Widget 容器。若未来禁止供应商媒体 iframe，需另评估媒体方案，不能声称 UI 协议已消除该底层依赖。

## 12. 与实现计划的衔接及验收

[实现计划](./widget-unified-protocol-v1-implementation.md) P0 增加 UI/data-source schema 与目录契约；P3 增加组合渲染器、绑定、有限动作及 source 状态机；P4 用同一描述迁移内置视频；P5 验证第三方 Provider 仅交付声明即可工作。不改变主协议的身份、权限、存储与单客户端范围。

必须验证：

1. 内置和第三方视频描述使用同一目录、Bridge 与权限，完成相同业务操作序列。
2. HTTP/MCP 返回经 schema 校验，空列表、加载、刷新失败、结果未知有明确 UI。
3. 新搜索取代旧搜索，迟到结果不能覆盖；卸载和撤权后不再应用结果。
4. 订阅重复、断线、cursor 过期、invalidate 风暴不会重复写入或无限请求。
5. 刷新资源不重建播放器、不自动播放；blocked 与实际成功准确区分。
6. 最近播放和观看测量符合当前语义，重试幂等，不由 UI 任意声明伪造。
7. 非法组件、绑定、循环、未授权操作、危险资源 URL 在执行前拒绝。
8. 新增同类第三方 Widget 不修改核心工具分支；新增底层媒体能力仍需审核宿主适配器。

文档描述不等于完成 SDK/播放器/第三方网络集成验证；具体字段、限额、目录版本和响应适配 fixture 在实现前冻结。
