# 空间修改协议

Joe 的 `editCanvas` 工具提供 `inspect` / `apply`。通过 RequestContext 注入当前会话的修改能力；工具不能自行扩大空间范围。

## 意图输入

```json
{
  "mode": "apply",
  "target": { "name": "空间1" },
  "changes": [
    { "type": "canvas.rename", "name": "娱乐间" },
    { "type": "widget.retain", "selector": { "widgetType": "youtube.video" } }
  ]
}
```

目标支持 id、名称，省略表示当前空间。重复名称和未找到名称返回 `needs_clarification`。保留操作恢复匹配卡片、隐藏其余卡片，保留实例和资源；不存在匹配类型则整批拒绝。支持 `widget.visibility` 按类型显示或隐藏。首期仍维持每类型一张卡片的限制。

## 持久命令

服务端将意图编译为 `canvas.change`：包含 `protocolVersion: 1`、生成一次的 nanoid `commandId`、`canvasId`、`expectedCanvasRevision` 和操作数组。内部操作白名单为 `canvas.rename` 和按 instanceId/expectedRevision 定位的 `widget.visibility`。

`CanvasStore.change` 在一个 SQLite 事务中执行完整命令、保存结果和批量事件。失败回滚。相同命令 ID 和相同载荷返回原结果，载荷不同则拒绝。调用方重试持久命令时必须保留原 commandId；模型发起的新工具调用被视为新意图。

空间版本由名称修改及卡片增删改维护；资源内容刷新不影响空间版本。数据库触发器覆盖已有卡片写入入口。版本号是单调计数，单批操作可能增长多次。

结果状态：`inspected`、`applied`、`unchanged`、`needs_clarification`、`rejected`、`conflict`。模型只在 applied/unchanged 后确认结果。

## 目录与迁移

`canvas_metadata` 保存名称、版本；`canvas_directory` 保存浏览器工作区 ID、侧栏位置和 canvas ID。首次打开现有两空间时，沿用浏览器保存的会话及 canvas ID 绑定目录，名称仅初始化一次。后续新对话继续绑定现有 canvas。

目录沿用当前单用户服务的信任模型；如引入账户，必须将目录绑定身份验证后的用户，不能将客户端 workspaceId 当作账户授权凭据。

## 同步和扩展

复用 widget_events、SSE 和游标。一次成功修改只发布一个 `canvas.changed`，携带 canvas 元数据、commandId 和变化实例。前端一次应用批量结果，按实例版本抵御重复事件；重连通过快照和游标恢复。事务提交后取消回答不会撤销修改。

新增修改功能时扩展 Zod 判别联合、事务执行规则和前端事件消费。需要删除、布局持久化或同类多卡时再增加专用操作。需要审批的功能使用 Mastra 原生审批或 suspend/resume，并补齐客户端事件适配。
