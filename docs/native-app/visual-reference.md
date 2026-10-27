# Rare UI 视觉对照

2026-10-26 实际读取官网渲染样式、CSS 和 Fluid Orb 展示源码。此记录替代此前暖白背景与系统字体的自行选型。

来源：[官网](https://www.rareui.com)、[Fluid Orb](https://www.rareui.com/components/fluidorb)。

| 项目 | 官网观测 | 原生映射 |
| --- | --- | --- |
| 背景 | #000000 | 窗口底色 |
| 内容表面 | #121212，32px 圆角 | 主内容区、卡片 32pt 圆角 |
| 次级表面 | #171717 | 输入、用户消息和按钮 |
| 正文 | #e5e5e5，Inter 16px / 24px | 内嵌 Inter Regular 16pt，自适应文字尺寸 |
| 辅助文字 | #a3a3a3 | 状态文字 |
| 标题 | Open Runde Bold；二级 24px / 32px，字距 -0.6px | Joe 标题 24pt、字距 -0.6pt |
| 控件 | Inter 14px，中等／半粗字重 | 内嵌 Inter Medium 14pt |
| 强调色 | #F75001 | 语音启用、发送等主要状态 |
| Orb | #1A73F2，默认直径 240px，白色上部／蓝色下部 | 240pt 原版流体着色，紧凑态 54pt |

正文不使用官网营销页 36px 大标题；原生控制布局适配 560pt 窗口。中文字符由系统中文字库回退。原生按钮维持 44pt 可点击区域；系统减少动态效果时静止 Orb 并减少空间动画。

Fluid Orb 采用官网的 hash/noise/fbm、漂移公式与 0.22 时间系数；圆边 smoothstep 使用递增边界以避免 GLSL 未定义行为。注册 Inter 和 Open Runde 原始 OTF，不依赖用户安装字体。来源及完整字体许可随 App 资源打包。

不复制官网内高光与重复边框，遵循本项目禁止内阴影、多重边框的规则。
