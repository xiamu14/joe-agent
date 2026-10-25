# 浅蓝背景

- 工具：内置 imagegen。
- 参考：https://i.pinimg.com/736x/61/b3/b1/61b3b172c837bbd926f9d25709212280.jpg
- 项目资源：`web/public/backgrounds/blue-gauze.jpg`，1080 × 2016。
- 生成原图为 918 × 1714；等比缩放后导出 JPEG，未裁切。宽屏使用居中 cover 裁切。

## 最终提示词

Use case: stylized-concept. Asset type: full-screen background wallpaper for a frosted glass UI. Input image: reference image only. Redraw this reference faithfully as a new high-quality bitmap. Preserve its portrait composition and aspect ratio (736:1303), requested output width 1080 pixels, height approximately 1912 pixels. Very pale cool blue and pearl white, softly defocused luminous cloudy silk-like gradients in the upper two thirds; a delicate translucent icy blue woven micro-square mesh or gauzy fabric rises diagonally from lower left toward mid-right, dissolving along its upper edge into tiny white sparkling grains. Preserve the spacious soft upper area and detailed gauzy lower-right area. Gentle daylight, restrained highlights, low saturation, airy subtle tactile texture. No text, logos, border, UI elements, extra objects. Match the reference's colors, diagonal geometry and softness closely.

## 横屏修复

竖版 cover 用于横屏会大幅放大裁切，因此横屏改用独立重绘图 `web/public/backgrounds/blue-gauze-landscape.png`，竖屏保留原版。内置 imagegen 请求 3840 × 2160，实际返回 1672 × 941；直接使用原生 PNG，没有放大或有损转码。按窗口宽高比切换资源，背景与缩略图使用相同规则。

### 横版提示词

Use case: stylized-concept. Create a LANDSCAPE desktop wallpaper, 3840x2160 pixels requested, 16:9 aspect ratio. Reference image is a style and texture reference, not an aspect-ratio constraint. Recompose it naturally across a wide horizontal canvas, never stretch or enlarge a portrait crop. Preserve the pale cool blue and pearl white gauzy aesthetic. Soft luminous cloudy silk-like light in upper half, with fine translucent icy blue woven micro-square mesh in lower half rising diagonally from bottom-left toward right-middle, dissolving into fine sparkling white grains at the edge. Important: individually resolved small weave squares and crisp tiny grains, ample native detail across the wide canvas, no global blur; only the atmospheric upper region is gently defocused as in reference. Natural restrained daylight, low saturation. No text, logo, borders, UI, or additional objects. Intended for a full-width desktop background beneath glass cards.
