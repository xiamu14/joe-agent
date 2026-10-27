# Joe Desktop

SwiftUI 原生 macOS 客户端。需要 Swift 6.4／Xcode 27.1，部署目标 macOS 15。主窗口与卡片使用 SwiftUI／AppKit；两个网页实例和 Fluid Orb 使用隔离的 WKWebView。

## 运行

在仓库根目录启动已配置的后端：

```sh
npm run dev:backend
```

另开终端构建 App：

```sh
./desktop/scripts/build-app.sh
open desktop/build/Joe.app
```

也可以用 Xcode 打开 `desktop/Package.swift`。麦克风权限请使用生成的 `.app` 测试，裸命令行可执行程序不作为权限验收环境。首次启动会请求麦克风权限；拒绝后可用键盘继续。

模型与语音凭据仍只存放在后端。客户端仅连接 `127.0.0.1:4111`，不新增供应商密钥。会话 ID 和输入静音偏好存放于本机 UserDefaults，X 登录使用 WebKit 默认持久化存储。

## 操作

- “播放视频”“保留视频，打开 X”“并排显示”“放大看”“退出沉浸”“关闭全部卡片”。
- 菜单「卡片」提供手动入口；卡片右上角提供播放、放大和关闭。
- 点击后方卡片只前置，不触发网页内部链接。
- 输入按钮为添加文件、麦克风、键盘。附件沿用后端的 `.txt`／`.md` 限制。
- Agent 通过受限工具发送操作；客户端执行并回传结果，Agent 再生成最终回答。取消后的旧轮次不能回传新结果。

## 验证

```sh
swift test --package-path desktop
npm --prefix backend run typecheck
cd backend && node --import tsx --test tests/desktop.test.ts
```

核心状态测试覆盖保留／替换、沉浸恢复、显式暂停优先级及 WAV 编码。后端测试覆盖回执隔离、取消及参数边界。详细产品规则见 `docs/native-app/design-session.md`。

## 实测边界

- 本轮使用原生 AVAudioEngine 语音处理和活动检测，经现有后端文件转写接口识别；不是 ElevenLabs 实时部分转写客户端。支持持续接听和句末提交。
- 活动检测阈值尚需目标麦克风与扬声器环境校准。开启系统语音处理不能视为已经证明外部网页音频不会触发录音。
- YouTube 使用官方 IFrame API，网站限制、嵌入来源或自动播放策略可能阻止指定视频；真实错误会显示，浏览器打开仅作备用，不计内嵌验收成功。
- X 登录／跳转需真实网站验证，登录弹窗目前在同一卡片导航，不承诺支持所有第三方登录路径。
- 暂不实现自动 thread 交接、视频搜索、AI 读取 X、跨重启卡片恢复或自包含后端发行包。

## 致谢

Fluid Orb 复用 [Rare UI](https://www.rareui.com) 的已有着色器，原生配色与排版以其克制的中性色界面为参考。许可证及版权见 `Sources/Desktop/Resources/THIRD_PARTY_NOTICES.md`。原生界面不是对 Rare UI Web 组件的直接移植。
