# <img src="web/public/favicon.svg" alt="Joe Logo" width="48" height="48" align="absmiddle" /> Joe

**Joe 是只关注生活和娱乐的个人智能助理。No Work！**

下班之后，和 Joe 说说话、听听回应，看看天气、找段喜欢的视频，或整理自己的账户。你可以用语音与 Joe 对话，确认后的识别文字进入输入框，回答也可以通过语音播报。Joe 希望成为你日常生活里随时可以回应的陪伴。

Joe 的 UX 理念是 **万物皆 Widget**。天气 Widget 把“今天外面怎么样”变成眼前的天气；YouTube Widget 把“找点想看的”变成搜索结果和可播放的视频。你表达想法，Joe 调用能力，让对应的 Widget 出现、更新或播放，不必先寻找功能入口。

**让 Joe 控制一切、响应一切，并一直陪伴**，是这个产品的设计构想。目前这些能力作用于 Joe 自己的画布与已接入工具；持续在线的陪伴体验是后续方向。

![Joe 工作空间](docs/media/workspace.png)

[观看演示视频](docs/media/demo.mp4) · 35 秒

## 启动

需要 Bun 1.3.14+ 和 Node.js 22.13+（推荐 Node.js 24）。

```sh
bun install
cp backend/.env.example backend/.env
```

在 `backend/.env` 填写 `OPENROUTER_API_TOKEN`，按需配置语音、天气和视频数据服务。配置项见 [环境变量示例](backend/.env.example)，对话、决策与图片识别模型见 [模型配置](backend/src/config/models.ts)。凭据只保存在后端。

```sh
bun run dev
```

打开 <http://127.0.0.1:5173/joe>，根路径也会跳转到此页面。后端运行在 `127.0.0.1:4111`。独立启动命令见 [根目录脚本](package.json)。

## 功能

- **对话**：流式回答、图片和文本附件、语音输入与播报；会话保存在本地。
- **画布**：两个空间，自由与 Bento 布局，卡片拖动、展开和收起。
- **记账**：添加图片，输入 `/tally` 后发送，识别账户与余额；支持银行卡、信用卡和支付宝余额宝，保留余额历史。未展开时隐藏金额。
- **天气**：按客户端公网 IP 或指定城市查询当前天气。
- **视频**：通过独立数据服务搜索 YouTube，卡片内播放并记录观看进度。
- **费用**：查看模型用量与费用，以及已配置语音供应商的账户数据。

图片识别会将原图发送至 OpenRouter 对应模型服务。

## Agent Reach 与 YouTube

视频搜索通过独立的 Python MCP 服务调用 [Agent Reach](https://github.com/Panniantong/Agent-Reach)，不嵌入 Joe 后端。先按其官方说明安装并配置 YouTube 渠道，确保运行服务的环境能执行 `agent-reach`；再从项目根目录启动适配服务：

```sh
python3 -m venv services/data-mcp/.venv
source services/data-mcp/.venv/bin/activate
python -m pip install -r services/data-mcp/requirements.txt
python services/data-mcp/server.py
```

在 `backend/.env` 设置 `DATA_MCP_URL=http://127.0.0.1:4120/mcp`，然后重启 Joe 后端。该服务需单独保持运行，`bun run dev` 不会启动它。若 Agent Reach 不在服务进程的 PATH 中，可在启动服务时设置 `AGENT_REACH_BIN` 为其绝对路径。适配接口见 [server.py](services/data-mcp/server.py)，后端连接见 [data-mcp.ts](backend/src/joe/data-mcp.ts)。

YouTube 卡片支持：

- **搜索**：输入“找一些周末旅行视频”，结果显示在卡片中，点击视频展开播放。
- **指定播放**：发送 YouTube 链接，或用最近播放中的标题片段、频道定位，例如“播放 OpenDots 视频”。有多个匹配时给出编号选项，可回复“第二个”。
- **最近播放**：实际开始播放后加入记录，按视频去重，最多保留 10 条，保存在当前浏览器；刷新后保留，不跨设备同步。
- **声音切换**：打开视频播放会停止 Joe 当前轮的语音播报。浏览器阻止自动播放时，点击“点击播放”。

观看进度的记录口径见 [行为协议](docs/widget-behavior/protocol.md)，卡片交互见 [视频组件](web/src/joe/video/youtube-card.tsx)。

## 代码与文档

实现细节以代码为准；协议与设计说明见对应文档。

| 内容 | 入口 |
| --- | --- |
| 领域词汇 | [CONTEXT.md](CONTEXT.md) |
| Web 画布与交互 | [web/src/joe](web/src/joe) |
| Agent、语音与本地存储 | [backend/src/joe](backend/src/joe) |
| 账户识别与余额存储 | [识别流程](backend/src/joe/tally.ts)、[账户存储](backend/src/joe/finance-store.ts) |
| 卡片实例与数据绑定 | [卡片协议](docs/widget-protocol.md) |
| 画布编辑 | [编辑协议](docs/canvas-edit-protocol.md) |
| 视频行为记录 | [行为文档](docs/widget-behavior/index.md) |
| Mastra 集成 | [能力审查](docs/mastra-capability-audit.md) |

## 检查与部署

```sh
bun run test
bun run typecheck
bun run build
```

数据默认保存在 `backend/data`，可用 `JOE_DATA_DIR` 修改。备份需包含 `joe.sqlite`、`mastra.db` 及其 WAL 文件，或停服后备份整个目录。

当前用于本地单用户环境。部署时需将 `/joe-api/*` 同源代理至后端并关闭流缓冲；端口、Origin 与数据目录配置见 [服务配置](backend/src/joe/config.ts) 和 [HTTP 边界](backend/src/joe/routes.ts)。构建与启动命令见 [Web 脚本](web/package.json) 和 [后端脚本](backend/package.json)。

## 后续运营

joe-agent 计划保留公共体验入口，让每个人都能认识 Joe；同时提供需要用户登录的商业私有部署，让个人拥有自己的 Joe、数据与使用空间。登录认证、用户数据隔离和商业部署能力尚未实现，当前版本仍用于本地单用户环境。

## 许可证

Joe 自有代码采用 [GNU AGPL-3.0-only](LICENSE)。允许使用、修改、分发和商业运营；通过网络提供修改版服务时，应依协议向交互用户提供对应源码。公共体验、收费托管与私有部署都需遵守协议，AGPL 不限制他人合规开展商业运营。条款以 [GNU 官方全文](https://www.gnu.org/licenses/agpl-3.0.html) 为准。

第三方代码和素材保留各自许可证，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。其中 OrbKit SHDR-01 着色器仅限非商业使用，Rare UI 组件带有额外的 Commons Clause 与署名条款；本项目的 AGPL 授权不覆盖这些第三方内容，也不表示整套素材均可按 AGPL 再授权。商业部署前须替换受限素材或取得相应商业授权。

## 致谢

界面使用 [Rare UI](https://www.rareui.com/)。光球包含 [OrbKit SHDR-01](https://orbkit.zzzzshawn.cloud/) 着色器，由 [XorDev](https://x.com/XorDev) 创作、zzzzshawn 移植，仅限非商业使用并需保留署名。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
