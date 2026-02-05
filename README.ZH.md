# skilio

![GitHub top lang](https://img.shields.io/github/languages/top/Moushudyx/skilio)
[![GitHub license](https://img.shields.io/badge/license-Mulan_PSL_v2-blue)](https://github.com/moushudyx/skilio/blob/master/LICENSE)
![NPM Version](https://img.shields.io/npm/v/skilio)
![NPM Downloads](https://img.shields.io/npm/dm/skilio)
![NPM Bundle Size](https://img.shields.io/bundlejs/size/skilio?label=gzipped)

一个简单高效的智能体技能(Agent Skills)管理工具

## 使用方法

```bash
npm i -D skilio
```

在 `package.json` 中配置 `scripts`：

```json
{
  "scripts": {
    "prepare": "skilio"
  }
}
```

`skilio` 将会扫描项目子包(`packages/`)及其依赖(`node_modules/`)中的技能文件夹，创建符号链接到根目录下的 `skills/` 目录中，并根据本地环境信息推测使用的智能体/IDE，符号链接到对应的配置目录中(如 `.cursor/skills/`、`.github/skills/` 等)

此外，建议将 `skills/npm-*`、`skills/package-*` 等符号链接添加到 `.gitignore` 中

> 如果开发者使用不同的智能体/IDE，建议将不同智能体/IDE 的配置目录(如 `.cursor/skills/`、`.github/skills/` 等)添加到 `.gitignore` 中，仅维护一份中心化的 `skills/` 目录

-----

如果未推测出用户正在使用的智能体/IDE，工具将弹出交互式提示让用户选择；如果不想看到这个提示，可以通过 `--no-prompt` 参数禁用交互式提示，此时工具只会打印一行警告信息

```bash
skilio --no-prompt
```

如果你想指定目标智能体/IDE，可以通过 `--agent` 参数指定目标目录

```bash
skilio --agent cursor,copilot,trae
```

## 示例

示例，假设有一个项目，其使用的依赖 `some-module`、子包 `sub-package` 都包含了一些技能文件夹，项目大体结构如下：

```plain
root/
├── .cursor/
│   └── 一些文件...
├── .github/
│   ├── skills/
│   └── copilot-instructions.md
├── node_modules/
│   ├── @namespace/
│   │   └── ns-module/
│   │       └── skills/
│   │           └── ✨ns-skill/
│   └── some-module/
│       └── skills/
│           └── ✨some-skill/
├── packages/
│   └── sub-package/
│       └── skills/
│           └── ✨pkg-skill/
├── skills/
│   └── ✨my-skill/
└── 其他文件...
```

当你执行 `skilio` 后，工具将做这些事情：

1. 扫描 `node_modules/*/skills/` 与 `node_modules/@*/*/skills/`，发现 `some-module/skills/some-skill/` 与 `@namespace/ns-module/skills/ns-skill/`
2. 扫描 `packages/*/skills/`，发现 `sub-package/skills/pkg-skill/`
3. 将上述发现的技能文件夹**符号链接**到根目录下的 `skills/` 目录中
4. 根据 `.github/copilot-instructions.md` ***推测***用户正在使用 GitHub Copilot，将根目录下的 `skills/` 中所有技能符号链接到 `.github/skills/` 目录中
5. 根据 `.cursor/` 目录**推测**用户也在使用 Cursor，将根目录下的 `skills/` 中所有技能符号链接到 `.cursor/skills/` 目录中
6. 清理失效的技能符号链接

执行结束后，项目结构将变为：

```plain
root/
├── .cursor/
│   └── skills/
│       ├── 🔗my-skill/ -> ../../skills/✨my-skill
│       ├── 🔗npm-@namespace-ns-module-ns-skill/ -> ../../node_modules/@namespace/ns-module/skills/✨ns-skill
│       ├── 🔗npm-some-module-some-skill/ -> ../../node_modules/some-module/skills/✨some-skill
│       └── 🔗package-sub-package-pkg-skill/ -> ../../packages/sub-package/skills/✨pkg-skill
├── .github/
│   ├── skills/
│   │   └── 与 .cursor/skills/ 相同的符号链接
│   └── copilot-instructions.md
├── node_modules/
│   └── 这里不变...
├── packages/
│   └── 这里不变...
├── skills/
│   ├── ✨my-skill/
│   ├── 🔗npm-@namespace-ns-module-ns-skill/ -> ../node_modules/@namespace/ns-module/skills/✨ns-skill
│   ├── 🔗npm-some-module-some-skill/ -> ../node_modules/some-module/skills/✨some-skill
│   └── 🔗package-sub-package-pkg-skill/ -> ../packages/sub-package/skills/✨pkg-skill
└── 其他文件...
```

## 指令

### 扫描 `scan`

使用 `skilio scan` 指令或直接使用 `skilio` 即可扫描项目中的所有智能体技能(Agent Skills)并创建符号链接

若扫描到无效技能或同名冲突，将追加写入 `skilio-debug.log`

```bash
# 默认参数调用
skilio

# 使用 cursor 和 trae 作为目标智能体/IDE
skilio scan --agent cursor,trae

# 不扫描 node_modules 目录，不清理失效的符号链接
skilio scan --no-npm --no-clean
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |
| `--no-npm` | 禁用扫描 `node_modules/` 目录 |
| `--no-packages` | 禁用扫描 `packages/` 目录 |
| `--no-clean` | 禁用清理失效的符号链接 |
| `--npm` | 扫描 `node_modules/` 目录 |
| `--packages` | 扫描 `packages/` 目录 |
| `--clean` | 清理失效的符号链接 |

### 新增 `init`

使用 `skilio init <skill-name>` 指令新增一个技能到根目录下的 `skills/` 目录中，并符号链接到所有推测出的智能体/IDE 配置目录中

指令别名 `skilio create <skill-name>`

**注意：技能名称不能以`npm-`或`package-`开头，以避免混淆**

```bash
# 创建 my-new-skill 技能
skilio init my-new-skill

# 指定目标智能体/IDE 为 cursor 和 copilot
skilio init my-new-skill --agent cursor,copilot
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |

### 删除 `del`

使用 `skilio del <skill-name>` 删除**本地手动创建**的技能，并删除所有智能体/IDE 配置目录中的对应符号链接

指令别名 `skilio remove <skill-name>`

若技能来自 npm/子包/安装来源，请使用“禁用”指令

```bash
# 删除本地技能
skilio del my-old-skill
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示，直接删除 |

### 禁用 `disable`

使用 `skilio disable <skill-name>` 禁用技能，并删除对应智能体/IDE 配置目录中的符号链接

```bash
# 禁用 my-old-skill 技能
skilio disable my-old-skill

# 仅对 windsurf 和 trae 禁用
skilio disable my-old-skill --agent windsurf,trae
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示，直接禁用 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |

### 启用 `enable`

使用 `skilio enable <skill-name>` 取消禁用并恢复符号链接

```bash
# 启用 my-old-skill 技能
skilio enable my-old-skill

# 仅对 windsurf 和 trae 启用
skilio enable my-old-skill --agent windsurf,trae
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示，直接启用 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |

### 列出 `ls`

使用 `skilio ls` 指令列出当前项目中所有已管理的智能体技能(Agent Skills)

指令别名 `skilio list`

默认列出所有中心化维护在 `skills/` 目录中、且正在使用(没有被禁用)的技能，也可以指定智能体/IDE 仅列出该智能体/IDE 的技能

> 由于智能体/IDE 配置目录中可能存在一些手动添加的技能符号链接，因此指定智能体/IDE 时，可能出现某些技能并不在中心化维护的 `skills/` 目录中

```bash
# 列出所有的技能(中心化维护在 skills/ 目录中的技能)
skilio ls

# 列出某个智能体/IDE 的技能(仅这个智能体/IDE的技能)
skilio ls --agent copilot
```

| 参数 | 说明 |
| ---- | ---- |
| `--show-disabled` | 显示已禁用的技能 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |

### 修改配置 `config`

使用 `skilio config <key> [value]` 指令查看或修改工具的配置项，具体配置项见下方“配置”章节

指令别名 `skilio cfg`

> 这个指令无法修改 `skillDisabled`、`installSources` 配置项，该配置项由工具自动维护

```bash
# 查看所有配置项
skilio config

# 查看某个配置项
skilio config showPrompt # 输出 true 或 false

# 修改某个配置项
skilio config showPrompt false # 将 showPrompt 配置项修改为 false
skilio config defaultAgents cursor,copilot # 将 defaultAgents 配置项修改为 ["cursor", "copilot"]

# 特殊配置项 skillLinkPrefixNpm 和 skillLinkPrefixPackage
# 这两项修改时会检查并自动更新已有的符号链接名称
skilio config skillLinkPrefixNpm np- # 将 skillLinkPrefixNpm 配置项修改为 "np-"
skilio config skillLinkPrefixPackage pkg- # 将 skillLinkPrefixPackage 配置项修改为 "pkg-"
```

### 检查更新 `check`

使用 `skilio check` 指令检查已安装技能是否有更新可用，不会修改本地文件

```bash
# 检查所有已安装来源
skilio check

# 检查指定来源
skilio check --source moushudyx/foreslash

# 检查指定技能
skilio check --skills deep-clone-any-object
```

| 参数 | 说明 |
| ---- | ---- |
| `--source <sources>` | 指定来源，多个来源用逗号分隔 |
| `--skills <skills>` | 指定技能名称，多个技能用逗号分隔 |

### 安装技能 `install`

使用 `skilio install` 指令安装指定来源仓库的技能到根目录下的 `skills/` 目录中，并符号链接到所有推测出的智能体/IDE 配置目录中

指令别名 `skilio i` 或者 `skilio pull`

```bash
# 默认从 GitHub 安装，格式为 <owner>/<repo>
skilio install moushudyx/foreslash # 从 GitHub 仓库 moushudyx/foreslash 安装技能

# 可以指定安装某个分支的技能，格式为 <owner>/<repo>/tree/<branch>
skilio install moushudyx/foreslash/tree/main

# 可以指定安装某个分支上的某个技能，格式为 <owner>/<repo>/tree/<branch>/skills/<skill-name>
skilio install moushudyx/foreslash/tree/main/skills/deep-clone-any-object

# 可以指定 git URL 安装，只要该 URL 指向的仓库中包含 skills/ 目录即可
skilio install git@github.com:moushudyx/foreslash.git
skilio install git@gitee.com:moushu/foreslash.git
skilio install https://gitee.com/moushu/foreslash.git

# 从本地路径安装
skilio install ./source-repo
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |

### 更新技能 `update`

使用 `skilio update` 指令更新已安装的技能到最新版本

指令别名 `skilio up`

```bash
# 更新所有已安装的技能
skilio update

# 更新指定来源安装的技能
skilio update --source moushudyx/foreslash

# 更新指定技能
skilio update --skills deep-clone-any-object
```

| 参数 | 说明 |
| ---- | ---- |
| `--no-prompt` | 禁用交互式提示 |
| `--agent <agents>` | 指定目标智能体/IDE，多个智能体/IDE 使用逗号分隔 |
| `--source <sources>` | 指定技能来源，多个来源使用逗号分隔 |
| `--skills <skills>` | 指定技能名称，多个技能使用逗号分隔 |

## 配置

可以在项目根目录下创建一个 `skilio-config.json` 文件以配置工具的行为，所有的配置项均为非必填

部分配置项(如 `skillDisabled`)由工具自动维护，用户无需手动编辑

支持的配置项如下：

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `showPrompt` | `boolean` | `true` | 没有推测出智能体/IDE时，是否显示交互式提示 |
| `scanNpm` | `boolean` | `true` | 是否扫描 `node_modules/` 目录 |
| `scanPackages` | `boolean` | `true` | 是否扫描 `packages/` 目录 |
| `cleanLinks` | `boolean` | `true` | 扫描时是否清理失效的符号链接 |
| `defaultAgents` | `string[]` | `[]` | 默认目标智能体/IDE 列表，没有推测出智能体/IDE时，若此表有值则使用该列表，且**不会显示交互式提示** |
| `skillLinkPrefixNpm` | `string` | `"npm-"` | 技能符号链接的前缀，例如设置为 `"np-"` 后，`some-skill` 技能的符号链接将命名为 `np-some-skill` |
| `skillLinkPrefixPackage` | `string` | `"package-"` | 技能符号链接的前缀，例如设置为 `"pkg-"` 后，`some-skill` 技能的符号链接将命名为 `pkg-some-skill` |
| `skillDisabled` | `Record<string, string[]>` | `{}` | 已删除的技能列表，键为技能名称，值为已删除该技能的智能体/IDE 列表，例如：`{ "some-skill": ["cursor", "copilot"] }` 表示 `some-skill` 技能在 `cursor` 和 `copilot` 智能体/IDE 中已被删除，如果值为空数组则表示该技能在所有智能体/IDE 中已被删除 |
| `installSources` | `Record<string, string[]>` | `{}` | 已安装的技能来源列表，键为技能来源，值为从该来源安装的技能列表，工具会记录通过 `skilio install` 指令安装的技能来源 |

## 支持的智能体/IDE

| 智能体/IDE | `--agent` | 配置目录 | 推测依据 |
| ---------- | --------- | -------- | -------- |
| Cursor     | `cursor`  | `.cursor/skills/` | `.cursor/` 目录 |
| GitHub Copilot | `copilot` | `.github/skills/` | `.github/copilot-instructions.md` 文件或`.github/skills/` 目录 |
| Windsurf   | `windsurf` | `.windsurf/skills/` | `.windsurf/` 目录 |
| Trae       | `trae` | `.trae/skills/` | `.trae/` 目录 |
| Claude Code | `claude` | `.claude/skills/` | `.claude/` 目录 |
| OpenClaw   | `openclaw` | `skills/` | 无需推测 |
| Qoder      | `qoder` | `.qoder/skills/` | `.qoder/` 目录 |
| Qwen Code  | `qwen` | `.qwen/skills/` | `.qwen/` 目录 |
| Cline      | `cline` | `.cline/skills/` | `.cline/` 目录 |
| Codex      | `codex` | `.codex/skills/` | `.codex/` 目录 |
| Continue   | `continue` | `.continue/skills/` | `.continue/` 目录 |
| Gemini CLI | `gemini` | `.gemini/skills/` | `.gemini/` 目录 |
| Kimi Code CLI | `kimi` | `.agents/skills/` | `.agents/` 目录 |
| Roo Code   | `roo` | `.roo/skills/` | `.roo/` 目录 |
| Zencoder   | `zencoder` | `.zencoder/skills/` | `.zencoder/` 目录 |

