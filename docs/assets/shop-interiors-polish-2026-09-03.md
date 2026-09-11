# 种子店与铁匠铺精修采用记录

## 来源

- 用户于 2026-09-03 认可首批小屋视觉，并确认延续到种子店和铁匠铺。
- 沿用零采购预算和既有 Phaser/Vue；没有新增第三方素材、依赖、静态媒体 URL 或 CDN 对象。
- `cottage-art.ts` 导出同一个色板与绘制原语，小屋原有像素配方不变。
- `shop-interiors-art.ts` 调用原有木作配方，再绘制种子货架、货箱、种子袋、账台、柜台、门垫，以及锻炉、铁砧、工具架、水桶、工作台、煤箱、柴架、风箱和石地。

## 交付

- 运行时 texture key：`shop-interiors`，256×256，16×16 tile 单元；只在 client 生成，不进入存档。
- 两个正式 TMJ 拥有布局、Collision、NPC 锚点和查看范围；新增 camera anchors 分别为 `seed-shop-room-view` 与 `blacksmith-room-view`。
- `src/tiled/shop-interiors.runtime.png` 仅为 ignored 编辑缓存，按同一绘图指令导出；无需上传或修改 manifest。
- 现有 VectoRaith/GARDENS 等原图字节及产品署名保持原样。

## 功能边界

- 华强依旧按照原有营业时间、休息日和天气提供交易；没有新增商品或修改价格。
- 工坊锻炉保持冷却/余温表现，工具架使用原有查看说明；没有增加采矿、建造或新工具服务。
- 往返验收发现原 Town 店门落点压在入口 inclusive 边界上，切图输入又未共享锁定，拒绝分支可能保持黑屏。本批只前移该落点一格，并补齐完整过渡锁与失败恢复。

## 验证与证据

类型、构建、地图/日程/路径以及柜台/查看/往返结果保留在本批提交历史中。
截图保留在 ignored `artifacts/shop-interiors-polish-v1/`。真人最终审美仍待用户反馈。
