# 天气 SVG 对应表

原 SVG 从用户提供的 Downloads/1、2、3 复制，文件内容保持不变。按图形语义命名；密集降雨、冰粒等名称用于区分图形，不代表源文件包含气象编码。

| 原文件 | 本地文件 | 图形含义 |
|---|---|---|
| `1/Ellipse 30.svg` | `clear-day.svg` | 晴天 |
| `1/Group 1214.svg` | `clear-night.svg` | 晴夜 |
| `1/Union.svg` | `snowflake.svg` | 雪花 |
| `1/Vector 15.svg` | `lightning.svg` | 闪电 |
| `2/Group 1.svg` | `scattered-clouds-day.svg` | 白天疏云 |
| `2/Group 2.svg` | `scattered-clouds-night.svg` | 夜间疏云 |
| `2/Group 3.svg` | `wind-day.svg` | 晴天大风 |
| `2/Group 4.svg` | `wind-night.svg` | 晴夜大风 |
| `2/Group 1233.svg` | `haze-day.svg` | 晴天薄雾 |
| `2/Group 1231.svg` | `hot.svg` | 高温 |
| `3/Group 1.svg` | `cloudy.svg` | 多云或阴天 |
| `3/Group 17.svg` | `partly-cloudy-day.svg` | 晴间多云 |
| `3/Group 5.svg` | `partly-cloudy-night.svg` | 晴夜间多云 |
| `3/Group 6.svg` | `cloudy-night.svg` | 夜间多云 |
| `3/Group 20.svg` | `rainbow.svg` | 彩虹 |
| `3/Group 4.svg` | `light-snow.svg` | 小雪 |
| `3/Group 7.svg` | `snow.svg` | 降雪 |
| `3/Group 8.svg` | `drizzle.svg` | 毛毛雨 |
| `3/Group 9.svg` | `wind-clouds.svg` | 多云大风 |
| `3/Group 11.svg` | `rain.svg` | 降雨 |
| `3/Group 18.svg` | `heavy-rain.svg` | 密集降雨 |
| `3/Group 12.svg` | `ice-pellets.svg` | 冰粒或雨夹雪 |
| `3/Group 19.svg` | `showers.svg` | 阵雨 |
| `3/Group 14.svg` | `fog.svg` | 雾 |
| `3/Group 3.svg` | `thunder.svg` | 雷暴 |
| `3/Group 15.svg` | `thunder-showers.svg` | 雷阵雨 |
| `3/Group 16.svg` | `thunder-rain.svg` | 雷雨 |
| `3/rain.svg` | `raindrops.svg` | 雨滴 |
| `3/snow.svg` | `snowflakes.svg` | 多片雪花 |
| `3/wind.svg` | `wind.svg` | 风 |

## 运行时选择

- 晴天使用太阳，晴夜使用月亮；多云按昼夜切换。
- 小雨、毛毛雨、密集降雨和阵雨使用各自的云雨图标。
- 霰、冰粒、冻雨和雨夹雪采用颗粒降水图形；降雪按强弱区分。
- 雷雨、雷阵雨分别使用水滴和雨线的闪电组合；雷雪使用通用雷暴图标，避免显示为普通降雨。
- 晴天风速达到 30 km/h 切换日夜大风；白天晴天温度达到 35°C 使用高温图标。
- 彩虹、独立雨滴/雪花/闪电等资源保留，当前接口不能可靠推断彩虹，不自动显示。
- 未识别天气代码使用中性的云图标，保留服务端的实际天气描述。
