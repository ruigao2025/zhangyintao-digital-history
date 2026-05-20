# 张隐韬数字历史项目

本仓库保存“张隐韬数字历史”网站的网页文件、数据和前端资源。网站从日记、路线和人际关系入手，追问一个出身普通的青年怎样进入工人教育、铁路组织、黄埔军校和农民武装，最终成为早期共产党行动者。

公开网站：<https://ruigao2025.github.io/zhangyintao-digital-history/>

## 网站结构

- `index.html`：首页
- `introduction.html`：引言，1902—1918
- `chapter1.html`：破壁，1919—1922
- `chapter2.html`：狂飙，1922—1924春
- `chapter3.html`：觉醒，1924.3—1924.9
- `chapter4.html`：燎原，1925—1926
- `appendix-diary.html`：日记全文与关键词检索
- `appendix-sources.html`：史料说明与来源整理
- `about.html`：创作者、制作说明、引用方式与许可协议
- `downloads/zhang-yintao-diary-tei.xml`：日记全文 TEI XML 下载版

## 网站里有什么

- 章节地图：看张隐韬如何离乡、奔走、赴考，并进入农民自卫军
- 人物网络：看他在不同阶段和哪些人、哪些组织发生联系
- 书信与日记摘录：保留他的情绪、判断和行动之间的关系
- 微观史模块：讨论书报代卖社、移动成本、自卫军瓦解等具体问题
- 史料说明：说明整理本、回忆材料和后出研究分别能用到什么程度
- TEI XML：提供校对后日记文本的结构化下载版，方便后续检索和文本分析

## 仓库结构

```text
assets/             字体与图像资源
css/                样式文件
data/               关键词、书信、地点与网络数据
js/                 交互脚本
index.html          首页
introduction.html   引言
chapter1-4.html     后四个叙事章节
appendix-*.html     日记与史料附录页
```

## 本地查看

该项目为纯静态网站。可直接打开 `index.html`，也可在仓库目录运行：

```bash
python3 -m http.server 8000
```

随后访问 `http://127.0.0.1:8000/`。

## 说明

网站中的论述、材料选择、文字校读与史料取舍以配套论文为准。本仓库主要保存最终展示所需的网页文件、结构化数据和视觉资源。
