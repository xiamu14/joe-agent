# Widget Unified Protocol V1：实现方案与开发计划

日期：2026-10-31。状态：待实施。规范入口：[Widget Unified Protocol V1](./widget-unified-protocol-v1.md)。本文是关联实现方案，不表示接口或测试已经存在。

## 1. 实现原则

内部与外部仅安装来源和预置策略不同，使用相同 manifest、注册表、Bridge、授权、动作和存储。先适配已有组件，不重做外观。首期 Web、单活跃客户端、backend 权威写入，不实现 iframe Widget 容器、多窗口或离线写入。

目录按职责划分，代码文件目标不超过 200 行，硬上限 500 行；下列路径为建议，允许实施时按已有结构调整。

| 建议模块 | 职责 |
| --- | --- |
| shared/widget-protocol/ | 消息、错误、manifest、资源/动作/存储契约和版本 |
| backend/src/widgets/registry/ | 注册清单、版本固定、工厂预置和兼容性 |
| backend/src/widgets/runtime/ | 请求分发、执行上下文、因果与动作生命周期 |
| backend/src/widgets/permissions/ | 安装授权、逐次策略、确认、撤权 |
| backend/src/widgets/storage/ | 空间、记录、附件、配额、事务、变更日志 |
| backend/src/widgets/network/ | 出站策略、凭据引用、DNS/重定向限制 |
| backend/src/widgets/providers/ | 宿主业务适配与 Mastra MCPClient 接入 |
| web/src/widgets/bridge/ | 进程内协议客户端、会话、订阅、错误和取消 |
| web/src/widgets/renderers/ | 受信任模板注册及声明式数据/动作绑定 |
| backend/src/widgets/presets/ | 四个预置 Widget 的清单及默认安装策略 |

首期不要另建运行第三方脚本的插件系统。外部交付物只有受限 manifest/schema/模板绑定及远程 Provider 配置。

## 2. Web Bridge 与传输

模板调用 SDK → 标准化协议消息 → Web Bridge → backend dispatcher → 策略 → 执行器。进程内测试可替换 transport，但不能替换授权语义。

建议新增认证后的统一命令端点和事件端点，具体 URL 在契约阶段冻结。HTTP 承载请求/响应，SSE 承载持久事件；标准 JSON-RPC 数值错误与业务 reason 分开。

- 初始化创建短期运行上下文，绑定 Joe、Widget、空间与授权版本；Widget 参数不能覆写上下文。
- backend 认证连接引用运行上下文，仍逐次核验权限及空间状态；不能仅凭公开 widgetId 获得能力。
- Web 适配统一超时、取消、订阅释放、冲突展示和结果未知。写操作不自动生成新 operationId 重试。
- SSE 支持一致快照、cursor 恢复、删除事件及撤权后停止投递；通知丢失可从持久日志重放。
- 宿主组件只拥有其绑定的 Bridge 客户端，不接收原始数据库、fetch 或配置存储对象。
- 页面被用户自行修改不应突破服务端用户/资源权限；同源任意代码执行不在进程内 Bridge 可隔离范围，禁止加载第三方脚本是前提。

生命周期与原生 App 解耦：未来 App 实现相同客户端契约与本地动作处理器，不要求复制 React 组件或采用 iframe。

## 3. 身份与安全先决条件

为当前单用户 Joe 持久化稳定 joeId，并关联现有用户/Memory owner；不因新增会话重新生成。不直接变更 Mastra thread/resource IDs。

访问 backend 必须认证，Widget 运行会话从已认证宿主上下文派生。现有 loopback Host/Origin 检查继续保留，但不能替代认证和对象授权。保护命令、SSE、附件下载以及可能绕过它们的原生 Agent/Memory/API 入口；Cookie 模式必须处理 CSRF，SSE 不把长期 token 放 URL。

授权记录包含主体、空间、能力范围、清单摘要、有效期与撤销状态。工厂预置与用户安装调用同一授权服务；预置权限也可撤销，升级扩权不能自动继承。

高风险调用使用宿主确认，绑定 operationId、目标、参数摘要与期限。恢复执行时再次鉴权，防止确认后撤权仍继续写入。

## 4. 存储落地

沿用现有 SQLite/数据库工程能力，不为虚拟空间新建数据库服务。逻辑上建议新增以下表，具体 DDL 在实施时冻结：

| 表 | 关键约束 |
| --- | --- |
| widget_installations | `(joe_id, widget_id)` 唯一，版本、启用状态、活动空间引用 |
| widget_spaces | 稳定 space_id，活动/删除状态、schema 版本、配额 |
| widget_records | `(space_id, collection, record_id)` 唯一，revision、JSON 数据 |
| widget_objects | 空间归属、对象 ID、大小、摘要、状态和内部存储定位 |
| widget_operations | `(space_id, operation_id)` 唯一，请求摘要、状态、结果 |
| widget_changes | 持久 cursor、event_id、空间、对象版本及事件 |
| widget_grants | 授权范围、版本、撤销信息 |
| widget_legacy_bindings | 原画布/实例/资源到统一 Widget 与空间的可逆映射 |

这些是逻辑职责，不要求每个职责独占一张物理表。不要把 Mastra Memory 或费用账本复制成 Widget 的第二份权威数据。

业务更新、幂等结果和变更日志同事务提交。记录查询只允许声明的字段、过滤、排序及有界分页；值参数化，不拼接 SQL。配额在事务内核验，防止并发绕过。

文件实际存储于 Joe 管理的数据目录；对象 ID 到路径映射仅在服务器内部。流式上传先限制大小/类型、暂存、计算摘要，再提交对象元数据及记录引用；崩溃遗留对象可回收。删除对象检查引用与权限。

读写自己的空间不等于读取 Joe 全局配置、账单或记忆。此类数据通过获准宿主 Provider 输出最小投影。

首期受限 schema 迁移支持明确的增字段/默认值等可验证操作；破坏性或无法表达的迁移拒绝升级，保留旧版本，不执行第三方脚本。未来复杂迁移另设方案。

## 5. 网络执行器

Provider 与通用网络能力共用出站策略。优先用 manifest 中的连接/请求定义引用，参数只能填获准位置；不开放任意目标、敏感 header 或可执行请求模板。

网络实现必须测试 DNS 重绑定、IPv4/IPv6 特殊地址、端口、重定向和凭据跨源泄露。仅在 fetch 前检查 URL 不足够，应使用能够控制解析/实际连接及重定向的执行层。固定依赖版本后验证连接行为，不凭配置字段推断安全。

schema 校验、限额和白名单也适用于 Provider 的输入/输出与错误内容。敏感响应字段不传给 Widget 或模型；日志记录引用与摘要，不记录密钥。

浏览器媒体资源由模板提供受控加载器；缩略图、链接、播放器地址经过 schema 与来源规则。宿主 YouTube 播放器可以保留现有供应商媒体 iframe，这不等于采用 iframe 运行 Widget。

## 6. Mastra 复用边界

当前依赖基线为 `@mastra/core 1.79.0`、`@mastra/mcp 2.6.0`，实施时以锁文件和安装类型再次核验。

| 能力 | 实现选择 |
| --- | --- |
| Agent 工具与校验 | createTool、input/output/requestContext schema |
| 模型数据投影 | toModelOutput，不让完整空间数据进入上下文 |
| Provider 工具发现/调用 | MCPClient，明确获准工具列表 |
| Agent 人工确认 | requireApproval；底层策略仍统一执行 |
| 暂停与恢复 | suspend/resume，按实际动作需要使用 |
| 多步骤持久业务 | 确有需求时 Workflow，不将 CRUD 全改成 Workflow |
| 观测与脱敏 | 现有 Observability、logger、SensitiveDataFilter |
| 事件通知 | 可用 PubSub 唤醒；持久日志仍负责恢复 |
| 虚拟存储、归属、配额、出站限制 | Joe 业务层，不以 Memory 或审批替代 |

不新增 LLM 工具循环，不要求普通存储或跨 Widget 的确定性调用经过模型。通用 Widget 动作适配成 Mastra 工具后，Agent 与 UI 仍进入相同 dispatcher。

## 7. 分期开发计划

| 阶段 | 依赖 | 交付与完成条件 |
| --- | --- | --- |
| P0 契约 | 无 | 冻结方法、schema、错误、版本/生命周期；内部和外部使用同一契约 fixture |
| P1 身份与策略 | P0 | 持久 Joe 身份、注册/安装、认证、权限、撤权；伪造空间和跨用户访问被拒绝 |
| P2 虚拟存储 | P1 | 记录、附件、事务、配额、订阅、删除重建；重试和崩溃恢复有证明 |
| P3 Bridge 与模板 | P1、P2 | Web SDK、宿主渲染器、动作/资源投影；模板无直连业务接口 |
| P4 四卡迁移 | P3 | 完成关联迁移文档全部步骤，保留业务和历史，不双写 |
| P5 外部接入 | P1—P4 | Provider/网络执行器、第三方清单安装、跨 Widget 动作；无需修改核心分支 |
| P6 收敛 | P4、P5 | 移除旧专用业务入口、更新开发文档，兼容适配退场 |

网络与 Provider 的基础实现可在 P2/P3 同期开展，但外部安装入口必须等 P5 安全验收后开放。首期交付结束于 P6；App、离线写入、backend 迁移/复制另立项目。

## 8. 验证与发布门槛

- 契约：未知方法/版本拒绝，错误结构一致，必需能力缺失拒绝初始化。
- 授权：内部和外部同样撤权生效；伪造 owner/空间、调用者混淆和扩权升级失败。
- 存储：同 operationId 不重复写，不同载荷拒绝；冲突不覆盖；事务失败无半条事件；附件超额失败。
- 删除：旧会话、迟到请求、旧订阅无法访问或复活重建空间；卸载保留数据可重新绑定。
- 网络：SSRF、重定向绕过、凭据泄露、响应膨胀、未授权外传被阻止。
- UI：保持现有四卡交互，隐藏不被刷新重新打开，播放失败不报告成功。
- 协作：A 无法直接读 B；获准能力可调用；结果裁剪、循环与限流有效。
- 迁移：备份恢复、重复执行、历史 ID 保留、单一权威写入和回退可验证。
- 外部示例：一个使用现有模板的 Provider Widget 仅凭协议交付物即可安装、读写自身数据、调用网络及获准协作，不改核心源码。

每阶段先跑相关契约/集成测试，之后执行前后端 typecheck、相关构建与行数检查。真实网络/播放器联调单列结果，模拟测试不宣称已证明真实服务兼容。

## 9. 开发前需冻结的参数

配额数值、超时、日志保留期限、请求端点和具体 schema 字段由 P0/P1 形成 ADR；它们是实施参数，不改变已确认架构。首期不预先承诺多 backend 同步一致性或任意自定义 UI 能力。
