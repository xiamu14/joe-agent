# 协议设计：卡片行为记录 v1 草案

[返回索引](./index.md) · [方案](./solution.md) · [架构](./architecture.md)

状态：首期视频子集已实现，非 Mastra API。通用扩展字段按实际业务需要接入，不启用其他行为采集。

首期启用范围（Q1、Q14）：仅视频观看记录，无独立关闭记录功能。Canvas 仅为上下文；展开、最小化及其他卡片不采集。下述协议扩展能力不代表产品启用范围。

## 1. 卡片声明与实例绑定

卡片类型注册记录定义，实例化时绑定；公共层只理解协议，不内置领域事件清单。

| 声明字段 | 含义 |
| --- | --- |
| widgetType / definitionVersion | 已注册卡片类型及记录定义版本 |
| events | 允许的事件名称与各自 payload schema |
| captureWhen | 领域确认时机，例如保存成功、播放器确认、拖动结束 |
| allowedFields | 允许保存的字段；未声明字段拒绝，非任意 JSON 透传 |
| evidencePolicy | 引用、快照或差量；允许内容及基线要求 |
| retentionPolicy | 保留策略标识；视频观看按 Q5/Q6 显式声明 indefinite，首期无清除能力，其他定义不继承 |
| sensitiveFields | 需要删除或脱敏的字段；公共限制始终生效 |

实例绑定包含 instanceId、canvasId、definitionVersion、policyVersion、enabled 及受约束的覆盖项。未来 memorySignals 扩展另行设计，本期不执行证据到偏好的转换。

公共运行时根据注册表绑定真实类型与版本，禁止客户端任意声明自己使用更宽松的定义。

## 2. 事件公共信封

| 字段 | 必要性与语义 |
| --- | --- |
| behaviorProtocolVersion | 必填；独立于现有 widget protocolVersion |
| eventId | 必填；一次事实事件的稳定 ID，重试复用 |
| actionInstanceId | 动作事件必填；一次动作贯穿请求与结果。避免与既有 actionId 动作名称混淆 |
| eventName / definitionVersion / policyVersion | 必填；确定领域语义、载荷解释及有效记录策略 |
| userId | 必填；服务端按可信身份确定，不信任客户端 owner |
| canvasId | 必填；行为发生时画布 |
| subject | 必填；kind=widget 或 canvas；widget 要有 instanceId、widgetType、widgetVersion |
| initiator / executor / trigger | 必填；发起者、实际执行者及触发原因；无法证明时明确 unknown |
| occurredAt / receivedAt | 必填；客户端发生时间与服务端接收时间，UTC 时间；不据客户端时钟建立全局顺序 |
| clientId / deviceId / clientSequence | 客户端来源按可用性附带；区分连接客户端与稳定设备身份，不能伪造缺失值 |
| causation | 可选；commandId、sessionId、turnId、runId、toolCallId、parentEventId 等真实关联 |
| effectScope | 状态修改时必填；global/user/canvas/device/entity 等实际生效范围及对应 ID |
| outcome | 结果事件必填；见下一节 |
| resourceRefs | 有关联资源时携带 widgetResourceId、revision 及证据引用 |
| payload | 按事件定义校验的领域数据 |

initiator 表示 user/agent/system/unknown；executor 表示 client/server/provider/unknown。用户要求 Agent 执行时，只有存在可追溯明确指令才标记用户发起。

trigger 区分 directInteraction、userInstruction、agentInitiative、automaticRefresh、autoplay、restore、replay、unknown。该字段是事实归因，不是模型推断的心理动机。

widgetResourceId 映射现有资源 resourceId；Mastra resourceId 在适配层称 memoryResourceId，二者不得混用。

## 3. 动作结果与同步语义

- phase：requested / committed / rendered / execution。沿用既有协议对接受状态、渲染和真实执行的区别。
- execution 的 status：succeeded / failed / cancelled / unknown。
- 超时等待产生 unknown 观测，不虚构 failed；迟到的真实结果可追加关联事件。
- 后续结果不覆写旧事实，查询投影展示最新已验证结果；结果顺序需结合因果与动作阶段，不单看到达时间。
- 取消工具等待不证明客户端已停止；需要客户端确认才能记录执行取消。
- 命令完成与记录接收确认分离；记录层确认表示事件已持久化，不表示动作成功。
- 回执必须匹配目标客户端、Canvas、实例及已存在的命令关联；存在会话／轮次时一并验证。

单次动作允许多个不同阶段事件，共享 actionInstanceId，各有 eventId；一个阶段的网络重试复用原 eventId。

## 4. ID、去重与顺序

- 应用生成 ID 使用安全 nanoid()，创建一次后贯穿持久化、重试与展示。
- 外部及 Mastra ID 原样引用，不套用应用 ID 的长度约束。
- eventId 重复且规范化载荷相同：返回原接收结果；相同 ID 不同载荷：拒绝冲突。
- actionInstanceId 用于动作关联，commandId 用于执行幂等；不能用“只记录一次”替代“只执行一次”。
- 服务端持久 cursor 用于接收顺序和恢复，不将 nanoid 或发生时间当作全局顺序。
- 重放已有同步事件只更新客户端状态，不重新上报用户行为。
- 服务端记录的动作结果与客户端补充结果按阶段区分，不能重复计作独立操作。

## 5. 数据证据

| 模式 | 要求 |
| --- | --- |
| reference | 所引用版本在有效期内可读取；不允许引用会被覆盖的当前行冒充历史 |
| snapshot | 只包含声明允许的必要字段、schema 版本及观测时间 |
| delta | 有明确基线、修改字段及结果版本；基线失效时明确不可还原 |

同一不可变证据可被多个事件引用。截图、完整 DOM、媒体文件、凭据不属于默认采集内容。外部文本是数据，不是记忆或工具执行指令。

资源自动更新可以记录为系统数据事件；是否记录及保留多少由产品策略决定，不伪装成用户动作。无具体 Canvas 的共享资源更新留在资源日志；卡片消费时再关联真实 Canvas，不编造画布归属。

## 6. 生命周期与作用域

- Q14：不记录独立卡片关闭事件；关闭只结算已有观看，未成功播放不产生记录。收起／最小化、展开不产生事件；不得因内部 close 或 remove 命名误判。
- 移动卡片时，事件 canvasId 为来源，payload 携带目标 Canvas；跨画布移动能力本期不新增。
- 重建实例产生新 instanceId；复制或移动是否保留身份须在该功能设计时明确，不从视觉相同推定。
- 全局设置保留操作发生 Canvas，同时 effectScope=user 或实际全局范围。
- 首期不实现观看记录清除；未来引入时再明确关联证据及共享引用处理。
- 当前没有 workflow 关联时省略，不用空造 ID 填充；未来扩展关系需显式版本化。

## 7. 首期视频载荷边界（Q2）

- 已确认：用户发起播放与播放时长；Q14 排除独立关闭记录。Q13 允许 directInteraction 和有可追溯明确指令的 userInstruction；agentInitiative 不创建用户观看记录。两种允许来源均须通过 Q7、Q8 的实际播放门槛。
- 业务字段：provider、videoId（外部 ID 原样保存）、playedDurationMs、videoDurationMs；时长未知时明确为空。公共上下文沿用前文。
- 播放时长仅统计可观测的真实播放时间，不含暂停与缓冲；播放器状态用于内部计量，不扩张为暂停／结束等独立行为采集。
- Q3 已确认：playedDurationMs 是实际播放时间，重复播放会累加，倍速不放大真实用时。
- coveredRangesMs 是内容时间轴上实际播放区间的有序并集，区间采用 [start,end)，重叠合并、跳过不补齐；用于去重覆盖计算，不保存每次进度采样轨迹。
- completionRatio = 已播放区间并集长度 / videoDurationMs，范围为 [0,1]；总时长必须有效且大于零，未知或观测不足时不伪造零或完整覆盖。
- 倍速按实际覆盖内容计入区间；结束状态、最大播放位置及累计真实用时都不能替代覆盖率。跳转识别、采样精度需在实现时验证，不能跨观测缺口插值为已播放。
- 区间只允许有限非负数并限制在有效内容范围；记录计量版本以解释算法变化。直播等无稳定总时长内容的比例保持未知。
- Q4 已确认：watchSessionId 标识一次观看，使用 nanoid() 创建一次并复用；与对话 sessionId、动作 actionInstanceId 分离。
- 一次观看的临时上下文从主动选视频并发起播放开始；Q7 要求确认成功播放后才持久化，未成功播放则丢弃临时上下文，Q8 已确认正的可测实际播放时长即可，不设额外最低门槛；暂停／最小化／恢复不拆分；切换视频、关闭卡片、离开／刷新页面结束。结束原因是观看摘要字段，不扩充为额外产品行为采集。
- 观看摘要含 watchSessionId、revision、provider/videoId、Canvas／实例归属、startedAt、可知时的 endedAt、playedDurationMs、coveredRangesMs、videoDurationMs、计量版本及完整性。
- 摘要检查点是累计值；同 revision 重试幂等，不将每份检查点求和。事件 ID 仍按每次独立更新生成并在重试时复用。
- Q7：未成功播放不保留点击或零播放观看记录；Q10 确认中途出错保留已确认的时长和片段，不补算故障期间时间或保存详细报错；未关闭或切换视频时恢复后继续同次观看。
- Q9：同次观看只记一次发起；暂停后继续、最小化后恢复不增加点击次数或明细，只更新时长与覆盖片段。
- 页面异常退出不伪造 endedAt 或关闭事实；最后确认摘要标为不完整或未知。
- 跨次实际时间求和，覆盖区间求并集；不将多个完播率直接相加。
- 不保存搜索词、结果列表、列表顺序、未选中内容、标题、频道或字幕。
- 显式点击与播放成功是不同事实：点击失败不持久化观看记录；自动恢复 playing 不能伪造新点击。关闭不生成独立记录，不附带失败点击详情。
- 现有跨域 iframe 内原生播放按钮点击缺少直接观测入口；来源不确定时不能标记用户点击。具体观测覆盖范围需实施验证并如实表达。

## 8. 前后台计量规则（Q11 已确认）

- 用户切换到其他标签页或应用时，视频必须暂停，playedDurationMs 与 coveredRangesMs 同步停止增长。
- 暂停请求和计量冻结都由视频适配器负责，不由公共记录层处理浏览器状态。
- 该暂停不结束 watchSessionId，不新增切换页面、切换应用或暂停点击事件。
- 回到前台不得根据内容进度跳跃补齐后台区间；返回保持暂停并保留进度，不自动续播；Q12 用户确认此能力已实现。
- 播放器 iframe 内部操作不得直接视为切换应用。复用已有宿主焦点和可见性控制，计时接入时验证与现有暂停行为一致。

## 9. 视频观看保留策略（Q5、Q6 已确认）

- 视频观看记录及其计算所需片段默认长期保留，不自动按天清理。
- 首期不实现清除入口或清除 API，不实现级联删除、删除统计重算及离线防复活机制。
- 该策略仅适用于已批准的观看数据，不扩张到搜索结果、诊断日志或其他卡片。
- 关闭卡片不清除观看记录；清除能力未来另行确认和设计。

## 10. 决策与实现边界

首期产品决策见 [方案访谈记录](./solution.md#产品访谈记录)，已落实至 Q11；Q12 为已有能力，跳过。Q13 已确认直接点击与明确委托 Agent 播放均可作为观看发起来源；Q14 明确没有关闭记录功能，关闭只结算观看。本期采样与接口已落实，见方案的实现说明和下节 HTTP 契约；通用契约不授权扩展采集。


## 11. 已实现 HTTP 契约

`POST /joe-api/behaviors`：请求 `{ sessionId, event }`，成功响应 `{ eventId, cursor }`。复用现有 Host／Origin／跨站校验和 64 KiB 请求上限。仅接收注册的 `video.watch.checkpoint`，客户端来源限 `directInteraction`；服务端未来可信播放执行器才可提交 `userInstruction`。

事件字段以 shared/widget-behavior.ts 为准：behaviorProtocolVersion、eventId、recordId、revision、widgetType、widgetVersion、definitionVersion、policyVersion、eventName、occurredAt、trigger、canvasId、instanceId、payload。`recordId` 在视频定义中即 watchSessionId；它不是命令 ID。没有工具调用就不伪造 toolCallId、runId 或 actionInstanceId。

本期用户身份与 receivedAt 由服务端保存；执行路径是客户端，主体由已验证 trigger 表达。未实施设备标识采集。没有业务资源内容引用，不将搜索资源放入观看证据。

payload：provider、videoId、startedAt、endedAt、playedDurationMs、videoDurationMs、coveredRangesMs、measurementVersion、completeness。仅允许这些字段，未知字段拒绝。completeness=partial 表示尚无最终结算，final 表示已正常结算，不代表百分之百观看或零测量误差。完播率由读取时计算，不接受客户端提交的百分比。

`GET /joe-api/video-watches?canvasId=…`：返回当前用户的 records 和按 provider/videoId 汇总的 summary；canvasId 可省略以汇总所有画布。读取不缓存。未知总时长或不同观看记录的总时长不一致时，累计完播率为空；历史不会因此被清除。

事件 ID 重试相同载荷返回原确认；相同 ID 不同载荷拒绝。recordId 的归属与视频身份不可变；新版本的时长、区间不能回退，最终结算后不可继续写。迟到旧版本不覆盖新投影，累计快照不逐条求和。

当前片段最多 2000 个／记录；超出或超过请求大小时明确拒绝，客户端保留待投递数据，不静默合并未观看空洞。长时间高频跳转场景需后续评估分段协议，不能用丢片段换取上传成功。
