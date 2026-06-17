# Drama UI Aesthetic Scorecard

基于 Asyar、Penpot、Zen Browser、Craft、Warp、AFFiNE、Craft Docs 形成的 UI 美学评选打分表。用于评审 Drama Graph、Drama PLM、Skill Crew 以及未来 Zen Browser 内嵌版本。

## 参考定位

| 参考 | 可借鉴点 | 在 Drama 中的边界 |
| --- | --- | --- |
| Craft Docs | 美学主标杆：排版、留白、文档感、跨端一致性 | 借鉴克制、系统感和内容层级；Drama 不能变成松散文档页 |
| Zen Browser | 美学主标杆：浏览器原生感、侧栏、空间、主题系统 | Zen 负责外壳；Drama 内层必须像原生工作台，不像普通网页 |
| Asyar | 美学辅助标杆：本地工具感、命令入口、轻量动效、图标气质 | 借鉴气质和入口，不追它的产品完整度 |
| Claude | 工作流/信息架构标杆：上下文、生成流、结果承接 | 不作为 Drama 美学标杆，界面语言偏朴素 |
| Penpot | 工作流/信息架构标杆：专业工具密度、设计系统、组件/Token 意识 | 借鉴工具专业性，不照搬工程化设计工具台视觉 |
| Warp | 深色技术工作台、Agent/Terminal 密度、状态可见性 | 借鉴紧凑和技术感，避免过亮紫蓝渐变 |
| AFFiNE | Docs + Whiteboard + Database 的空间切换与知识图谱感 | 借鉴文档和画布统一，不做 Notion/Miro 混搭感 |

## 参考产品双轴基准

Drama 的目标拆成两条轴：`UI/UX 美学分` 和 `产品成熟度分`。这两条不能混用：Claude/Penpot 的成熟度很高，但不代表它们是 Drama 的美学标杆；Craft Docs/Zen/Asyar 的美学更接近目标，但成熟度参考价值不同。

| 产品 | UI/UX 美学分 | 产品成熟度分 | 备注 |
| --- | ---: | ---: | --- |
| Craft Docs | 92 | 86 | 美学最稳：排版、留白、文档感、跨端一致性都强。不是复杂 agent 工作台，但作为知识/文档产品成熟度已高 |
| Zen Browser | 88 | 78 | Firefox 外壳深改，侧栏、空间、主题系统有明确审美；但运行截图仍有 beta 感，产品成熟度更多依赖 Firefox 内核 |
| Asyar | 87 | 68 | Tauri + Svelte 5，视觉个性强，本地 launcher 气质好；但 v0.1 系列产品厚度、生态、稳定性还没到 80 |
| Claude | 72 | 93 | 交互成熟、工作流清楚，AI 产品能力强；但界面语言偏朴素，不适合作为 Drama 的美学标杆 |
| Penpot | 76 | 88 | 源码和功能厚度很强，专业工具成熟；视觉比纯工程台更好，但依然不是 Drama 应追的气质 |

Drama 的参考关系：

- **美学主标杆**：Craft Docs > Zen Browser > Asyar
- **工作流/信息架构标杆**：Claude + Penpot
- **Asyar 只借鉴气质**：本地工具感、命令入口、轻量动效、图标艺术感；不借鉴成熟度目标
- **Drama 目标**：UI/UX 美学 `90+`，产品成熟度先到 `80`

当前判断依据：

- Zen 本地源码：`4cb4de2`
- Asyar 本地源码：`ab118c1`
- Penpot 本地源码：`b03537f`
- 本地运行截图目录：`open-source-ui-screenshots`
- Craft/Claude 为闭源产品，按公开运行态和产品资料判断

## 总分规则

总分 100。每项按 1-5 分评审，再乘权重。

| 分数 | 含义 |
| --- | --- |
| 1 | 破坏体验：默认 HTML、错位、冲突、不可读 |
| 2 | 可用但粗糙：风格不统一、密度失衡、状态不清 |
| 3 | 合格：能完成任务，基本统一，但缺少高级感 |
| 4 | 优秀：清晰、稳定、有辨识度，适合长期使用 |
| 5 | 标杆：审美、效率、信息架构和品牌感同时成立 |

## 打分表

| 维度 | 权重 | 主要参考 | 5 分标准 | 扣分信号 |
| --- | ---: | --- | --- | --- |
| 宿主融合感 | 10 | Zen Browser | 像 Zen 原生面板，浏览器侧边栏/标题栏/工作区自然衔接 | 像单独网页、iframe 感明显、默认浏览器控件外露 |
| Drama 品牌一致性 | 10 | Warp + Craft Agents | 外层统一为 Drama/Warp 深色工作台，Graph/PLM/Crew 命名清晰 | Storylet/PlotPilot/Craft 原风格抢占主品牌 |
| 信息密度与层级 | 10 | Warp + Penpot | 工具型密度高但不拥挤，标题、状态、路径、动作层级明确 | 大块空白、重复标题、路径挤压主体、文字铺满首屏 |
| 视觉精致度 | 10 | Asyar + Craft | 图标、边框、阴影、材质、间距有艺术感且克制 | 粗糙按钮、低质图标、边框混乱、圆角/阴影随机 |
| 可读性与排版 | 10 | Craft + Craft Docs | 中文和英文都清晰，长路径/长标题不撑破布局 | 字号混乱、行高拥挤、中文断行难读、内容遮挡 |
| 工具专业性 | 10 | Penpot + Warp | 画布、面板、命令、Inspector 都像专业生产工具 | 像演示页/营销页/玩具 Demo |
| 画布与空间感 | 8 | AFFiNE + Penpot | Graph/Canvas 占据主空间，小地图、缩放、节点关系清晰 | 画布被 UI 挤压、节点太小、关系线杂乱不可追踪 |
| Agent 状态可见性 | 8 | Warp + Craft Agents | Runtime、Sidecar、Crew、任务状态用状态点/Chip/日志清楚呈现 | 状态藏在文字里、失败没有恢复入口、debug 直出 |
| 交互手感 | 8 | Zen Browser + AFFiNE | 切换、拖拽、缩放、搜索、面板展开符合桌面应用习惯 | 滚动怪、点击无反馈、快捷操作缺失、面板跳动 |
| 组件系统一致性 | 6 | Penpot + Craft Docs | Token、按钮、输入框、卡片、Badge、Tooltip 可复用且一致 | 同一页面出现多套按钮/输入/卡片风格 |
| 本地工作台可信度 | 5 | Warp + Zen Browser | 本地路径、保存、备份、恢复、运行时边界清晰 | 用户不知道数据在哪、是否保存、服务是否运行 |
| 性能与稳定观感 | 5 | Zen Browser + Warp | 首屏稳定、无闪烁、无未加载 CSS、动画少且准 | 白屏、CSS 裸奔、加载抖动、模糊/动画影响性能 |

## 快速评审表

| 页面/截图 | 宿主融合 10 | 品牌一致 10 | 信息层级 10 | 精致度 10 | 排版 10 | 专业性 10 | 画布 8 | 状态 8 | 交互 8 | 组件 6 | 可信度 5 | 性能 5 | 总分 | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Drama Graph / Zen | 9 | 8 | 8 | 7 | 7 | 8 | 7 | 7 | 5 | 5 | 5 | 4 | 80 | 已进入 Zen 原生 sidebar panel：`zen-drama-button`、Drama icon、Graph tab、runtime badge、panel browser 均通过 Marionette 验证；下一步补画布交互手感。截图：`.codex-run-logs/drama-browser-shell-graph-zen-vtb.png` |
| Drama PLM / Zen | 9 | 8 | 9 | 8 | 8 | 8 | 6 | 8 | 6 | 7 | 7 | 5 | 89 | 已进入 Zen 原生 sidebar panel，并升级为浅色 Script Studio：左侧项目/节拍导航、中央纸张式剧本区、脚本工具栏、右侧固定控制 rail、人设/提示词存储卡、底部音乐播放器、runtime 根路径自动跳转 PLM。仍需补卡片编辑保存、生成过程细粒度反馈和截图回归固化。 |
| Skill Crew / Zen | 9 | 8 | 8 | 8 | 7 | 8 | 4 | 7 | 6 | 5 | 5 | 4 | 80 | 已进入 Zen 原生 sidebar panel，Crew tab 和 runtime 状态通过验证；下一步接真实 Crew API 和可折叠右栏。截图：`.codex-run-logs/drama-browser-shell-crew-zen-v2.png` |
| Legacy Electron Graph |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Legacy Electron Crew |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Drama 专用硬性红线

出现任一项，最高只能评 60 分：

- 首屏出现默认 HTML 样式、默认按钮、默认输入框。
- `Graph / PLM / Crew` 只是裸文本链接。
- Zen 内嵌后像打开了一个普通网页，而不是浏览器原生面板。
- Storylet 或 PlotPilot 成为主标题，Drama 退成来源说明。
- Graph 画布没有占据主工作区。
- Runtime / Sidecar / 保存状态不可见。
- 长 Windows 路径把标题栏或主体布局撑坏。
- 裸 JSON、stack trace、debug 文本铺满首屏。

## 推荐判定

| 总分 | 判定 | 行动 |
| ---: | --- | --- |
| 90-100 | 可作为 Drama UI 标杆 | 固化为截图基准和组件规范 |
| 80-89 | 可发布 | 只做小修和一致性补齐 |
| 70-79 | 可用但不够高级 | 进入 UI polish |
| 60-69 | 功能可测，不应交付 | 优先修布局、样式、状态 |
| < 60 | 失败 | 回到 shell / token / route 结构重做 |

## 高级成品专项评分表

这张表只判断一件事：当前 Drama 是否已经达到“高级成品”。它比上面的可用性评分更严格，不能因为 Zen panel 打通、功能能跑、局部页面好看就给高分。

高级成品判定线：

| 总分 | 判定 | 含义 |
| ---: | --- | --- |
| 95-100 | 标杆级高级成品 | 可以作为 Drama 长期设计基准，截图可进入官网/README |
| 90-94 | 高级成品 | 可以交给真实用户长期使用，只剩轻微 polish |
| 85-89 | 高级候选 | 主体气质成立，但还有一个关键短板 |
| 80-84 | 可发布雏形 | 可以试用或内测，但还不是高级成品 |
| 70-79 | 可用原型 | 方向对，质感、交互或闭环不足 |
| < 70 | 未成品 | 需要回到结构、视觉或稳定性重做 |

高级成品硬门槛：

| 门槛 | 要求 |
| --- | --- |
| 无裸奔 | 首屏不得出现默认 HTML、默认按钮、裸 JSON、浏览器错误页、未加载 CSS |
| 无伪内嵌 | 不能只是地址栏开发 URL，必须是 Zen 原生 sidebar/panel/toolbar 路径 |
| 无主品牌混乱 | 主入口和主标题必须是 Drama，Storylet/PlotPilot/Craft 只能作为能力来源或兼容说明 |
| 无数据不确定 | 用户必须知道当前 workspace、保存状态、备份/恢复位置、runtime 是否可用 |
| 无关键崩溃残留 | 正常启动/退出不能留下 Crash Reporter、僵尸 runtime、旧 Electron 干扰 |
| 无核心交互断层 | Graph/PLM/Crew 至少各有一个完整主工作流，不只是展示壳 |

专项打分：

| 维度 | 权重 | 5 分标准 | 3 分标准 | 1 分标准 |
| --- | ---: | --- | --- | --- |
| Zen 原生融合与外壳边界 | 8 | 像 Zen 自带工作台，sidebar、panel、toolbar、主题、窗口生命周期自然衔接 | 能嵌进 Zen，但仍有网页感或开发路径痕迹 | 像 iframe/普通网页，地址栏和浏览器错误页外露 |
| Drama 视觉身份 | 10 | 有独立、克制、有记忆点的 Drama/Warp 深色艺术工作台气质 | 基本统一，但仍能看出 Storylet/PlotPilot/Craft 拼接感 | 多套风格混杂，主品牌不清 |
| 信息架构与工作台密度 | 8 | 左侧导航、主工作区、右侧 inspector/status 各司其职，密度高但不挤 | 结构可用，但标题、路径、状态或按钮层级偶尔拥挤 | 文字堆叠、重复标题、路径撑破布局 |
| Graph 画布与编辑器成熟度 | 12 | 接近 Obsidian/AFFiNE 画布手感：拖拽、缩放、多选、搜索、编辑、保存、minimap 都自然 | 画布展示成立，但编辑、选择、布局或保存手感不足 | 只是静态图或节点难读难操作 |
| PLM 与 Crew 业务深度 | 10 | PLM 章节生成/回写和 Crew 任务/agent/event 能闭环，用户能完成真实叙事工作流 | 主要 API 或页面接通，但还有断点/ mock / 弱反馈 | 只是入口或壳，不能完成业务主线 |
| 交互手感与反馈 | 12 | 点击、切换、拖拽、面板开合、生成过程、失败重试都有即时反馈和桌面应用感 | 主要按钮可用，但反馈、焦点、快捷操作不完整 | 点击无感、状态跳变、滚动/布局怪异 |
| 状态、恢复与本地可信度 | 10 | runtime、sidecar、保存、备份、失败恢复、日志入口清晰，重启电脑后状态可解释 | 状态能看见，但恢复路径或日志入口不够产品化 | 用户不知道是否保存、服务是否活着、数据在哪里 |
| 组件系统与 token 一致性 | 8 | 按钮、输入、卡片、badge、toolbar、inspector、空状态都来自同一设计语言 | 大体一致，但局部仍有旧组件或临时样式 | 同一页面出现多套按钮、输入、卡片风格 |
| 排版、中文与内容质量 | 6 | 中文/英文混排稳定，长路径折叠合理，字段文案专业且不解释功能废话 | 基本可读，但局部长标题、长路径、字段文案粗糙 | 字号行高混乱、内容遮挡、中文断行难读 |
| 可访问性与键盘效率 | 5 | 主要操作可键盘完成，焦点、tooltip、ARIA、快捷键符合工具习惯 | 部分按钮可键盘访问，但快捷键和焦点管理不足 | 鼠标之外基本不可用 |
| 性能与稳定观感 | 6 | 首屏稳定、无白屏闪烁、无 CSS 裸奔、生成/画布不卡顿，错误可恢复 | 常规路径可用，偶发慢/闪/测试路径问题可解释 | 经常白屏、崩溃、加载抖动或阻塞 |
| 包装、安装与验收证据 | 5 | 桌面快捷方式、安装包、Graph/PLM/Crew 自动验收、截图回归和日志都有证据 | 安装和部分验证可用，但缺截图回归或完整发布说明 | 只能开发环境启动，无法复现交付 |

高级成品不允许用平均分掩盖硬伤：

| 情况 | 最高判定 |
| --- | --- |
| 任一硬门槛失败 | 最高 79，可用原型 |
| Graph 画布与编辑器成熟度低于 8/12 | 最高 84，可发布雏形 |
| 交互手感与反馈低于 8/12 | 最高 84，可发布雏形 |
| 状态、恢复与本地可信度低于 7/10 | 最高 84，可发布雏形 |
| Zen 原生融合低于 6/8 | 最高 79，可用原型 |

高级成品验收证据要求：

| 证据 | 达标要求 |
| --- | --- |
| 自动验证 | 一条命令验证安装版 Graph / PLM / Crew、Drama icon、runtime ready、无 Crash Reporter 残留 |
| 截图回归 | Graph / PLM / Crew 三张截图无裸奔、无默认控件、无布局撑破 |
| 手动路径 | 桌面双击启动、已运行聚焦、退出、再次启动都能复现 |
| 数据路径 | 明确显示 workspace、`.drama` 文件、备份/事件日志路径 |
| 失败路径 | runtime 挂掉时显示 Drama 风格恢复面板，不显示浏览器错误页 |

当前作品按高级成品表的暂估：

| 模块 | 暂估分 | 判定 | 主要扣分 |
| --- | ---: | --- | --- |
| Drama Graph / Zen | 80 | 可发布雏形 | 画布编辑器和交互手感还没到高级成品 |
| Drama PLM / Zen | 86 | 高级候选 | Script Studio 气质成立，右侧存储卡和音乐播放器提升独特性；还缺卡片编辑/保存、真实 prompt registry 写回、生成过程流式反馈 |
| Skill Crew / Zen | 80 | 可发布雏形 | Crew 真实 API 闭环和右侧状态视图还需加强 |
| 整体 | 82 | 可发布雏形 | Zen 主路径、Graph/PLM/Crew shell、root redirect、安装包验证已完成；Graph 编辑手感、Crew 深闭环、失败截图回归还没到高级成品 |

## 当前优先级验收

| 优先级 | 目标 | 当前完成度 | 证据 | 剩余问题 |
| --- | --- | ---: | --- | --- |
| P1 UI 壳 | Zen 中第一眼像原生工作台，不裸奔 | 88% | Graph/PLM/Crew 已有 DramaWorkbenchShell；PLM 已升级为 Craft/Zen 气质的 Script Studio，包含右侧固定控制 rail、人设/提示词存储卡和音乐播放器；根路径 `/` 自动进入 PLM，避免裸 JSON | 还要继续提高 Graph 编辑手感、Crew 真实闭环和截图回归覆盖 |
| P2 Zen 原生 panel | 从开发 URL 变成 Zen sidebar panel | 100% | `bun run zen:drama:check:win` 通过；dev build 和 installed package 的 `graph/plm/crew` panel 均通过 Marionette 验证，检查 `zen-drama-button`、Drama icon、panel 可见、surface active、runtime ready；桌面快捷方式指向安装版 `Start-Drama-Zen.ps1` | P2 已完成；后续归入 P3/P4：恢复面板、截图回归、主题细节 polish |
| P3 稳定性与数据可信度 | 双击/关闭/重启后状态可解释 | 72% | standalone runtime、`.drama` workspace、package/install verifier、runtime health badge、`/` -> `/app/plm` redirect 已有 | 仍需 runtime unavailable 截图回归、workspace missing 面板和 Electron legacy 进程清理策略 |

## 当前发布快照（2026-06-17）

| 项目 | 状态 |
| --- | --- |
| Zen Browser 迁移 | 源码和打包脚本已整理进仓库；Windows 安装路径为 `%LOCALAPPDATA%\Programs\DramaZen` |
| Graph | Zen panel 可打开，画布、toolbar、minimap、inspector 可渲染；高级画布编辑手感仍是后续重点 |
| PLM | 已是浅色 Script Studio：剧本纸张、脚本工具栏、右侧控制器、人设/提示词存储卡、音乐播放器、root redirect |
| Crew | Zen panel 可打开，保留 crew tree、room feed、AgentOS 状态；真实 AgentOS 深闭环仍需加强 |
| 验证命令 | `bun run browser-shell:typecheck`、`bun run browser-shell:build`、`bun run runtime:typecheck`、`bun run zen:drama:package:win`、`bun run zen:drama:install:win`、root redirect smoke |
| 发布边界 | 可作为 public preview 发布；不声明高级成品完成，不声明 PlotPilot/Crew parity 完成 |

## 参考来源

- Penpot: https://penpot.app/
- Zen Browser: https://zen-browser.app/
- Craft: https://www.craft.do/
- Craft Documentation: https://craft-support.mintlify.app/en
- Warp: https://www.warp.dev/
- Warp Docs: https://docs.warp.dev/
- AFFiNE: https://affine.pro/
- AFFiNE Docs: https://docs.affine.pro/
