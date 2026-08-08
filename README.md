# AkiConvert

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/AkiroMusic/AkiConvert)](https://github.com/AkiroMusic/AkiConvert/releases)

A cross-platform desktop audio format converter built with Electron. Decrypts proprietary music formats (NCM, KWM, KGM, QMC) and converts between standard audio formats — all processing is done **entirely offline** on your local machine.

一款基于 Electron 构建的跨平台桌面音频格式转换工具。解密专有音乐格式（NCM、KWM、KGM、QMC），并在标准音频格式之间进行转换——**所有处理完全在本地离线完成**。

> **Developer**: [Akiro](https://akiromusic.com) (AkiroMusic) · Contact: [akiromusic@qq.com](mailto:akiromusic@qq.com)

> **开发者**：[Akiro](https://akiromusic.com)（AkiroMusic）· 联系：[akiromusic@qq.com](mailto:akiromusic@qq.com)

> **History**: This project was originally named **Format Converter**. The formal version has been renamed to **AkiConvert** starting from v2.0.0. It is part of the **Aki series** of software.

> **历史说明**：本项目原名为 **Format Converter**，自 v2.0.0 起正式更名为 **AkiConvert**，属于 **Aki 系列**软件之一。

---

## Features

## 功能特性

| Category | Capabilities |
|----------|-------------|
| **Format Support** | Decrypt `.ncm` (NetEase), `.kwm`/`.kgm` (Kuwo/Kugou), `.qmc` (QQ Music); convert to MP3, FLAC, WAV, OGG, M4A, AAC, AIFF, ALAC, Opus |
| **Batch Processing** | Queue hundreds of files, configurable concurrency (auto or manual 1–10), real-time progress bars |
| **Metadata Preservation** | Automatically writes title, artist, album, cover art, track number, genre, and year as ID3v2 tags |
| **Audio Preview** | Built-in player with play queue, previous/next, volume control, seek, and lyrics display |
| **Custom File Naming** | Flexible template system using `{title}`, `{artist}`, `{album}`, `{track}`, `{year}` variables |
| **Conversion History** | Persistent history with status filtering, clear, and retry capabilities |
| **Loudness Normalization** | EBU R128 standard (−23 to −6 LUFS), with presets matched to streaming platform targets |
| **Lyrics** | Extract embedded lyrics from source files; embed companion `.lrc` files during conversion |
| **Themes** | 7 themes: System, Dark, Light, Sepia, Forest, Ocean, Lavender |
| **i18n** | English & 简体中文, auto-detected or user-selected |
| **Encrypted Key Management** | QMCv2 ekey and KGG key database import for decryption of key-protected formats |
| **Conversion Presets** | Save and load preset configurations (format, bitrate, sample rate, etc.) |
| **Settings Sync** | Export/import settings across machines |
| **Zero Configuration** | FFmpeg is bundled in the installer — no manual setup needed |

| 类别 | 能力 |
|------|------|
| **格式支持** | 解密 `.ncm`（网易云）、`.kwm`/`.kgm`（酷我/酷狗）、`.qmc`（QQ 音乐）；输出 MP3、FLAC、WAV、OGG、M4A、AAC、AIFF、ALAC、Opus |
| **批量处理** | 队列容纳数百文件，可调节并发数（自动或手动 1–10），实时进度条 |
| **元数据保留** | 自动写入标题、艺术家、专辑、封面图、音轨号、流派、年份等 ID3v2 标签 |
| **音频预览** | 内置播放器，支持播放队列、上下曲、音量控制、进度拖拽和歌词显示 |
| **自定义文件名** | 灵活的模板系统，支持 `{title}`、`{artist}`、`{album}`、`{track}`、`{year}` 变量 |
| **转换历史** | 持久化历史记录，支持状态过滤、清除和重试 |
| **响度标准化** | EBU R128 标准（−23 ~ −6 LUFS），提供流媒体平台目标预设 |
| **歌词** | 提取源文件内嵌歌词；转换时嵌入同目录 `.lrc` 歌词文件 |
| **主题** | 7 种主题：跟随系统、深色、浅色、暖棕、森林、海洋、薰衣草 |
| **多语言** | 简体中文 & English，自动检测或手动选择 |
| **密钥管理** | 导入 QMCv2 ekey 和 KGG 密钥数据库，解密受密钥保护的音乐格式 |
| **转换预设** | 保存和加载预设配置（格式、比特率、采样率等） |
| **设置同步** | 跨设备导出/导入设置 |
| **零配置** | FFmpeg 已内置在安装包中，无需手动配置 |

---

## Downloads

## 下载

Grab the latest installer from the [Releases](https://github.com/AkiroMusic/AkiConvert/releases) page.

从 [Releases 页面](https://github.com/AkiroMusic/AkiConvert/releases) 获取最新安装包。

| Platform | Architecture | File |
|----------|-------------|------|
| Windows | x64 | `AkiConvert-Setup-*.exe` |
| macOS | Universal (Intel + Apple Silicon) | `AkiConvert-*.dmg` |

| 平台 | 架构 | 文件 |
|------|------|------|
| Windows | x64 | `AkiConvert-Setup-*.exe` |
| macOS | 通用（Intel + Apple Silicon） | `AkiConvert-*.dmg` |

---

## Keyboard Shortcuts

## 键盘快捷键

| Action | Shortcut |
|--------|----------|
| Paste file(s) from clipboard | `Ctrl+V` |
| Remove selected files | `Delete` |
| Select all / Deselect all | `Ctrl+A` (toggles) |
| Toggle fullscreen | `F11` |
| Play / Pause audio preview | `Space` |
| Close context menu | `Escape` |

| 操作 | 快捷键 |
|------|--------|
| 从剪贴板粘贴文件 | `Ctrl+V` |
| 移除选中的文件 | `Delete` |
| 全选 / 取消全选 | `Ctrl+A`（切换） |
| 切换全屏 | `F11` |
| 播放 / 暂停音频预览 | `Space` |
| 关闭右键菜单 | `Escape` |

---

## Tips

## 提示

- **Drag & drop**: You can drag files or entire folders directly onto the drop zone.
- **拖放操作**：可以直接将文件或整个文件夹拖入拖放区域。
- **Encrypted formats**: NCM, KWM, KGM, QMC files are decrypted automatically during conversion. Some formats (QMCv2, KGG) may require importing additional keys.
- **加密格式**：NCM、KWM、KGM、QMC 文件在转换时自动解密。部分格式（QMCv2、KGG）可能需要导入额外密钥。
- **FFmpeg fallback**: If the bundled FFmpeg is not found, you can manually locate an existing FFmpeg binary in Settings.
- **FFmpeg 回溯**：如果内置 FFmpeg 未找到，可在设置中手动指定已有的 FFmpeg 二进制文件路径。
- **No data leaves your computer**: All decryption and conversion is done locally. Your files never leave your machine.
- **数据安全**：所有解密和转换均在本地完成，您的文件不会离开本机。

---

## Development

## 开发

### Prerequisites

### 前置条件

- [Node.js](https://nodejs.org/) 22+
- [Node.js](https://nodejs.org/) 22 或更高版本
- npm 10+
- npm 10 或更高版本

### Setup

### 安装

```bash
git clone https://github.com/AkiroMusic/AkiConvert.git
cd AkiConvert
npm install
```

### Commands

### 命令

| Command | Description |
|---------|-------------|
| `npm run dev` | Launch development mode (Vite HMR + Electron) |
| `npm run build` | Build production bundles (main + preload + renderer) |
| `npm test` | Run test suite (Vitest) |
| `npm run download:ffmpeg` | Download FFmpeg for the current platform |
| `npm run download:ffmpeg:all` | Download FFmpeg for all platforms |
| `npm run build:win` | Build Windows installer (NSIS) |
| `npm run build:mac` | Build macOS disk image (DMG) |
| `npm run build:linux` | Build Linux AppImage |

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发模式（Vite HMR + Electron） |
| `npm run build` | 构建生产包（main + preload + renderer） |
| `npm test` | 运行测试套件（Vitest） |
| `npm run download:ffmpeg` | 为当前平台下载 FFmpeg |
| `npm run download:ffmpeg:all` | 为所有平台下载 FFmpeg |
| `npm run build:win` | 构建 Windows 安装程序（NSIS） |
| `npm run build:mac` | 构建 macOS 磁盘映像（DMG） |
| `npm run build:linux` | 构建 Linux AppImage |

### Tech Stack

### 技术栈

| Layer | Technology |
|-------|------------|
| Framework | Electron 33 + electron-vite |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State | Zustand |
| i18n | i18next + react-i18next |
| Encryption | Node.js crypto (AES-128-ECB, RC4) |
| Tag Writing | Native ID3v2 implementation |
| Testing | Vitest |
| Packaging | electron-builder (NSIS / DMG / AppImage) |

| 层次 | 技术 |
|------|------|
| 框架 | Electron 33 + electron-vite |
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 状态管理 | Zustand |
| 国际化 | i18next + react-i18next |
| 加密 | Node.js crypto（AES-128-ECB、RC4） |
| 标签写入 | 原生 ID3v2 实现 |
| 测试 | Vitest |
| 打包 | electron-builder（NSIS / DMG / AppImage） |

### Project Structure

### 项目结构

```
src/
├── main/               # Electron main process
│   ├── ipc/            # IPC handlers (convert, dialog, settings, history, etc.)
│   ├── ffmpeg.ts       # FFmpeg/FFprobe wrapper
│   ├── ffmpeg-path.ts  # Platform-aware FFmpeg binary path resolution
│   ├── ffmpeg-check.ts # FFmpeg health check
│   ├── kggKeys.ts      # Kugou decryption key management
│   ├── history.ts      # Conversion history persistence
│   ├── simpleStore.ts  # JSON-backed key-value store
│   └── window.ts       # BrowserWindow creation & management
├── renderer/           # Electron renderer process (React app)
│   └── src/
│       ├── components/ # React components
│       ├── store/      # Zustand stores
│       ├── locales/    # i18n JSON files
│       └── styles/     # CSS tokens + Tailwind utilities
├── core/               # Shared core logic
│   ├── decoders/       # Per-format decryption implementations
│   ├── ncmDecrypt.ts   # NetEase Cloud Music (.ncm) decryption
│   ├── id3Writer.ts    # ID3v2 tag writer
│   ├── template.ts     # File name template engine
│   ├── types.ts        # Shared type definitions
│   └── supportedFormats.ts # Format support matrix
└── preload/            # Electron preload scripts
```

---

## License

## 许可证

This project is licensed under the [GNU General Public License v3.0](LICENSE).

本项目基于 [GNU 通用公共许可证 v3.0](LICENSE) 授权发布。

---

<br>

<h2 align="center">AkiConvert</h2>

<p align="center">基于 Electron 的跨平台桌面音频格式转换工具。解密专有音乐格式（NCM、KWM、KGM、QMC）并在标准音频格式之间进行转换——<strong>所有处理完全在本地离线完成</strong>。</p>

<blockquote align="center">
  <strong>历史说明</strong>：本项目原名为 <strong>Format Converter</strong>，自 v2.0.0 起正式更名为 <strong>AkiConvert</strong>，属于 <strong>Aki 系列</strong>软件之一。
</blockquote>

<h3>功能特点</h3>

| 类别 | 能力 |
|------|------|
| **格式支持** | 解密 `.ncm`（网易云）、`.kwm`/`.kgm`（酷我/酷狗）、`.qmc`（QQ 音乐）；输出 MP3、FLAC、WAV、OGG、M4A、AAC、AIFF、ALAC、Opus |
| **批量处理** | 队列容纳数百文件，可调节并发数（自动或手动 1–10），实时进度条 |
| **元数据保留** | 自动写入标题、艺术家、专辑、封面图、音轨号、流派、年份等 ID3v2 标签 |
| **音频预览** | 内置播放器，支持播放队列、上下曲、音量控制、进度拖拽和歌词显示 |
| **自定义文件名** | 灵活的模板系统，支持 `{title}`、`{artist}`、`{album}`、`{track}`、`{year}` 变量 |
| **转换历史** | 持久化历史记录，支持状态过滤、清除和重试 |
| **响度标准化** | EBU R128 标准（−23 ~ −6 LUFS），提供流媒体平台目标预设 |
| **歌词** | 提取源文件内嵌歌词；转换时嵌入同目录 `.lrc` 歌词文件 |
| **主题** | 7 种主题：跟随系统、深色、浅色、暖棕、森林、海洋、薰衣草 |
| **多语言** | 简体中文 & English，自动检测或手动选择 |
| **密钥管理** | 导入 QMCv2 ekey 和 KGG 密钥数据库，解密受密钥保护的音乐格式 |
| **转换预设** | 保存和加载预设配置（格式、比特率、采样率等） |
| **设置同步** | 跨设备导出/导入设置 |
| **零配置** | FFmpeg 已内置在安装包中，无需手动配置 |

### 下载

从 [Releases 页面](https://github.com/AkiroMusic/AkiConvert/releases) 获取最新安装包。

### 提示

- **拖放操作**：可以直接将文件或整个文件夹拖入拖放区域。
- **加密格式**：NCM、KWM、KGM、QMC 文件在转换时自动解密。部分格式（QMCv2、KGG）可能需要导入额外密钥。
- **FFmpeg 回溯**：如果内置 FFmpeg 未找到，可在设置中手动指定已有的 FFmpeg 二进制文件路径。
- **数据安全**：所有解密和转换均在本地完成，您的文件不会离开本机。
