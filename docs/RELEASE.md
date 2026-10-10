# 圣手编辑器 发布指南（Release SOP）

本文档描述「圣手编辑器」的完整发版流程：Secrets 配置、版本号管理、三平台 CI 构建、
Gitee 同步与大附件补传、更新器（updater）签名机制，以及热修纪律。

> 方案照搬姊妹项目「圣手码头」已验证的发布链路（Tauri 2 + tauri-action + tauri-plugin-updater），
> 踩坑经验汇总见圣手码头仓库 `docs/AUTO-UPDATE.md`（13 条，发版链路动手前先通读 §5）。
>
> 仓库：GitHub `cherish-zp/shengShouNotPadPro` / Gitee `princess-zp/shengShouNotPadPro`
> （本机 origin 已配双 pushurl，一条 `git push` 同时推两端）。

---

## 0. 前置条件一览

| 项目 | 需要什么 | 费用 | 当前状态 |
|---|---|---|---|
| 全平台 | GitHub 仓库 Actions 已启用 | 免费 | 就绪 |
| 更新器 | 一对 `tauri signer` 密钥（minisign） | 免费 | 已生成，私钥在本机 `~/shengshou-keys/shengshoubianjiqi.key` |
| Gitee | 私人令牌（同步 Release 附件用） | 免费 | 待配置 Secret |
| macOS 分发 | Apple Developer 证书（签名 + 公证） | $99/年 | 未配置（可选，见 §5） |
| Windows 分发 | 代码签名证书（消除 SmartScreen 拦截） | 数十~数百美元/年 | 未配置（可选） |

未配置 Apple / Windows 代码签名时，产物**可以正常发布和自动更新**，只是：

- macOS 用户首次打开需右键 → 打开（Gatekeeper 提示"未公证"）；
- Windows SmartScreen 会拦截未签名 exe，用户需点"仍要运行"。

## 1. GitHub Secrets 配置（3 个，一次性）

位置：仓库 → Settings → Secrets and variables → Actions → New repository secret。

| Secret 名 | 值 | 说明 |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 私钥文件 `~/shengshou-keys/shengshoubianjiqi.key` 的**原文内容**（`dW50…` 开头的单行 base64，即 `cat ~/shengshou-keys/shengshoubianjiqi.key` 的输出，全选复制粘贴） | 更新器 minisign 私钥。**永不入库、永不外传**。工作流内有 base64 归一化逻辑，填原文 / 单层 / 双层 base64 均可识别，推荐直接填文件原文 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | （可选）本密钥生成时未设密码，**可不配置**；若配置请填空字符串并注明"无密码" | 只在私钥带密码时才必填 |
| `GITEE_TOKEN` | [gitee.com/profile/personal_access_tokens](https://gitee.com/profile/personal_access_tokens) 生成的私人令牌，勾选 **projects** 权限 | 用于 CI 同步 Release 附件到 Gitee。未配置时 sync-gitee job 自动跳过（不影响 GitHub 发布），可用本地脚本兜底 |

> ⚠️ **私钥即命脉**：`TAURI_SIGNING_PRIVATE_KEY` 对应的私钥文件丢失 =
> 已发布用户**永远**收不到应用内更新（新版 latest.json 的签名与旧版内嵌公钥不配对）。
> U 盘 / 密码管理器双重备份 `~/shengshou-keys/` 目录（含 `.key` 与 `.key.pub`）。

## 2. 发版流程（每次发版照此执行）

### 2.1 准备

1. **版本号三处同步**（必须完全一致）：
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
   - `src-tauri/Cargo.toml` → `[package] version`（改完在 `src-tauri/` 下跑一次
     `cargo check` 刷新 `Cargo.lock`）
2. **更新 `CHANGELOG.md`**：新增版本小节，日期用发布日。
3. 本地验证：`npm test` + `npx tsc --noEmit` + `npx vite build` 全绿
   （改动涉及 Rust 时加 `cd src-tauri && cargo check`）。

### 2.2 提交并打 tag

```bash
git add -A && git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z：更新说明"
git push origin main --tags
```

（origin 已配 GitHub + Gitee 双 pushurl，一条命令同时推送两端；annotated tag 的
message 会出现在 GitHub Release 页面。）

### 2.3 CI 自动执行（`.github/workflows/build.yml`）

tag 触发后按序执行，全程无需人工干预：

1. `check` job（ubuntu 质量门禁）：`npm ci` → `npm test`（vitest）→
   `npx tsc --noEmit` → `npx vite build` → `cargo test`；
2. `build` job 三条流水线并行：
   - macOS arm64（slug `macos-arm64`）：中文 productName「圣手编辑器」；
   - macOS Intel（slug `macos-intel`）：中文 productName「圣手编辑器」；
   - Windows x64（slug `windows-x64`）：`--config` 覆盖为 ASCII productName
     `ShengShouBianJiQi`（NSIS 工具链对非 ASCII 文件名不可靠）；
   每条流水线都从 Secret 归一化解出 minisign 私钥给更新包签名（生成 `.sig` 附件）；
3. `assemble-updater-json` job：从 Release 的 `.sig` 附件**确定性重组** latest.json
   （绕开 tauri-action 并行合并丢平台键的缺陷），把被 GitHub 清洗成 `_` 前缀的
   附件改名回 `ShengShouBianJiQi` 前缀，校验 darwin-aarch64 / darwin-x86_64 /
   windows-x86_64 三键齐全后替换 Release 上的 latest.json；
4. `sync-gitee` job：创建 Gitee 版本化 Release 并上传全部 ≤50MB 附件（.sig、exe 等，
   附件名换回中文前缀「圣手编辑器」），同时维护 Gitee 常驻 `latest` release——
   把 latest.json 内的下载 URL 重写为 Gitee 版本化地址后覆盖上传。

### 2.4 检查 GitHub Release（约 15-30 分钟后）

```bash
# 附件应含三平台安装包 + .sig + latest.json（dmg 附件名为 ShengShouBianJiQi_* ASCII 前缀）
curl -s "https://api.github.com/repos/cherish-zp/shengShouNotPadPro/releases/tags/vX.Y.Z" | jq '.assets[].name'
# latest.json 三平台键齐全、URL 可下载
curl -s "https://github.com/cherish-zp/shengShouNotPadPro/releases/latest/download/latest.json" | jq '.platforms | keys'
```

### 2.5 大附件本机补传（**发版必做项**）

Gitee 附件从 GitHub Actions（US runner）跨境上传实测不可行（80MB+ dmg 卡数小时 0%），
CI 只传 ≤50MB 小文件；**mac dmg 常超 50MB**，必须本机补传（境内→境内直传，速度快）：

```bash
GITEE_TOKEN=<gitee私人令牌，勾 projects 权限> \
  ./scripts/sync-gitee-release.sh vX.Y.Z
```

脚本幂等（只传 Gitee 缺失的附件），同时会把 latest.json 重写为 Gitee 直链并覆盖
常驻 `latest` release。受 Gitee 单附件 100MB 上限约束；单仓库附件总容量 1GB，
版本积多时注意清理旧版本大附件。

### 2.6 验收 Gitee

```bash
# 版本化 Release 附件齐全（dmg 已补传）
curl -s "https://gitee.com/api/v5/repos/princess-zp/shengShouNotPadPro/releases/tags/vX.Y.Z" | jq '.assets[].name'
# 自动更新端点可用：应返回 JSON，platforms 内 URL 全部指向 gitee.com 且逐个可下载
curl -s "https://gitee.com/princess-zp/shengShouNotPadPro/releases/download/latest/latest.json"
```

最后用旧版本应用「检查更新」验证能看到新版本，即完成一次完整发版。

### 2.7 辅助入口（不需要重新构建）

- **手动构建验证**（不发布）：Actions → `build` → Run workflow（不填 tag），
  产物以 `shengshoubianjiqi-macos-arm64` / `shengshoubianjiqi-macos-intel` /
  `shengshoubianjiqi-windows-x64` 为名上传到 workflow artifacts。
- **仅重跑清单组装 + Gitee 同步**：Actions → `build` → Run workflow 并填 tag
  （如 `v0.2.0`）；或 Actions → `sync-gitee` → Run workflow 填 tag（只同步附件，
  不重组 latest.json）。发版后修补**不需要重打 tag 重构建**。

## 3. 热修纪律（务必遵守）

1. **不删已发布 tag 重打**：应用内更新端点按 tag 版本化寻址，重打同名 tag 会造成
   已下载用户的清单错乱；热修走版本号 +1（如 `v0.2.1`）完整发版流程。
2. **私钥备份**：`~/shengshou-keys/` 目录（`shengshoubianjiqi.key` + `.key.pub`）
   U 盘 / 密码管理器双重备份。私钥丢失 = 已发布用户永远收不到更新，且无法补救。
3. **latest.json 只能经 API/CI 替换**：GitHub 网页端上传会按扩展名白名单拦截
   `.json`（"We don't support that file type"），别在网页端手工传。

## 4. 更新器签名（minisign）≠ Apple 代码签名

两个签名机制互不相干，**没有 Apple 证书也能让应用内更新完整工作**：

| | 更新器签名（minisign） | Apple 代码签名 / 公证 |
|---|---|---|
| 作用 | 防更新包被篡改：updater 用 `tauri.conf.json` 内嵌公钥验证 latest.json 及其指向的更新包 | 防安装包被篡改 + 向 Gatekeeper 证明开发者身份 |
| 密钥 | `tauri signer` 密钥对（`TAURI_SIGNING_PRIVATE_KEY` Secret） | Apple Developer `Developer ID Application` 证书（`APPLE_*` Secrets） |
| 缺失后果 | **无法发更新**（签名失败，CI 直接红） | 仅影响首次安装体验（右键打开 / "仍要运行"），应用内更新不受影响 |
| 本项目状态 | ✅ 已启用 | ❌ 未配置（可选增强，启用见 §5） |

## 5. 可选增强：Apple 签名 + 公证（未实施）

购买 Apple Developer Program（$99/年）并创建 `Developer ID Application` 证书后：

1. 导出证书为 `.p12`，base64 后连同公证所需 Apple ID 配置 Secrets：
   `APPLE_CERTIFICATE` / `APPLE_CERTIFICATE_PASSWORD` / `APPLE_SIGNING_IDENTITY` /
   `APPLE_ID` / `APPLE_PASSWORD`（App 专用密码）/ `APPLE_TEAM_ID`；
2. 取消 `.github/workflows/build.yml` 中 tauri-action env 里 `APPLE_*` 六行的注释
   （**不要以空字符串形式保留**——secret 不存在时 `${{ secrets.X }}` 仍注入空串，
   bundler 检测到变量存在（哪怕为空）就会尝试导入证书并直接失败）；
3. 如需 universal2 通用包，把两个 macOS 矩阵项合并为一个
   `--target universal-apple-darwin`（构建时间变长、包体积约翻倍，latest.json 的
   两个 darwin 键需相应调整附件后缀映射）。

Windows 代码签名（OV/EV 证书）同理为可选增强，未配置不影响发布与更新。

## 6. 发版速查清单（Checklist）

- [ ] 版本号三处一致：`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml`（+ Cargo.lock）
- [ ] `CHANGELOG.md` 新增版本小节
- [ ] `npm test` + `npx tsc --noEmit` + `npx vite build`（+ Rust 变更时 `cargo check`）全绿
- [ ] commit + `git tag -a vX.Y.Z -m "..."` + `git push origin main --tags`
- [ ] CI 全绿（check → 3×build → assemble-updater-json → sync-gitee）
- [ ] GitHub Release 附件：三平台安装包 + `.sig` + `latest.json`（三平台键齐全）
- [ ] **本机补传 >50MB 大附件**：`GITEE_TOKEN=... ./scripts/sync-gitee-release.sh vX.Y.Z`
- [ ] Gitee 版本化 Release 附件齐全；`releases/download/latest/latest.json` 返回 JSON 且 URL 均为 Gitee 地址、可下载
- [ ] 旧版本应用内「检查更新」能看到新版本
