# 模块设计

本文件描述模块职责与调用边界，细节约束与检查点见 [design/constraints.md](constraints.md)。

## 术语与原则

- 唯一真源：项目根目录的 `skills/`。
- 技能名称必须等于技能文件夹名。
- 来自 npm/子包/安装的技能，统一以 `skills/` 为准；冲突由用户决策。
- 不做不可恢复操作：默认不覆盖/删除非符号链接的技能目录，对于非符号链接的目录，即使删除也是移动到回收站。
- 发生冲突且无法继续时，记录日志并报错退出。

## 公共方法（utils）

- `listAllDirsByDir(dir)` 列出指定目录下的一层子文件夹
- `listAllFilesByDir(dir)` 列出指定目录下的一层子文件
- `readSkillByDir(dir)` 读取 `SKILL.md` 并返回 `name`/`description`/`metadata` 或错误信息
- `checkSkillDir(dir)` 判断是否为有效技能文件夹（包含有效的 `SKILL.md`）
- `checkSymlink(path)` 判断符号链接是否有效，且目标为有效技能文件夹
- `createSymlink(source, target)` 创建符号链接；Windows 使用 `junction`
- `deleteSymlink(path)` 删除符号链接
- `getAgentConfigDir(agent)` 返回智能体/IDE 配置目录
- `guessAgent(rootDir)` 推测当前使用的智能体/IDE
  - 依据配置目录是否存在
  - copilot 额外检查 `.github/copilot-instructions.md` 或 `.github/skills/`
- `readJSONFile(path)` 读取并解析 JSON（error-first）
- `writeJSONFile(path, data)` 写入 JSON
- `updateJSONFile(path, data)` 浅合并更新，等同于 `Object.assign`
- `runCommand(cmd, options)` 运行 shell 命令并返回结果
- `info/subInfo/warn/success/error` 日志打印

## 配置模块 config

负责读取和写入 `skilio-config.json`。

- 返回值永远完整（缺省字段补默认值）
- 写入为浅合并覆盖，`skillDisabled` 与 `installSources` 由业务模块提供完整值
- 并发写入不做处理，直接报错

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `showPrompt` | `boolean` | `true` | 未推测出智能体/IDE时是否提示 |
| `scanNpm` | `boolean` | `true` | 是否扫描 `node_modules/` |
| `scanPackages` | `boolean` | `true` | 是否扫描 `packages/` |
| `cleanLinks` | `boolean` | `true` | 扫描时是否清理失效链接 |
| `defaultAgents` | `string[]` | `[]` | 默认目标智能体/IDE 列表 |
| `skillLinkPrefixNpm` | `string` | `"npm-"` | npm 技能链接前缀 |
| `skillLinkPrefixPackage` | `string` | `"package-"` | 子包技能链接前缀 |
| `skillDisabled` | `Record<string, string[]>` | `{}` | 禁用列表，值为空数组表示对所有智能体禁用 |
| `installSources` | `Record<string, string[]>` | `{}` | 来源 -> 技能名列表 |

## 智能体/IDE 模块 agents

- 内置已知智能体/IDE 列表（名称、配置目录、推测依据）
- OpenClaw 无需配置目录，忽略推测
- Copilot 需检查 `.github/copilot-instructions.md` 或 `.github/skills/`

输入项目根目录，返回识别到的智能体/IDE 列表。

## 扫描模块 scan

### 核心扫描

输入路径，扫描一层子目录中的 `*/skills/`：

- 仅一层，不深入更深层目录
- 进入每个 `skills/`，扫描其下所有技能文件夹
- 读取 `SKILL.md`（兼容大小写）
- 解析名称、描述、元信息
- 无效技能写入 debug 日志并跳过

输出技能列表（名称、描述、元信息、路径、来源类型）。

### 外壳逻辑

- 根据配置处理 `node_modules/` 与 `packages/` 的扫描
- 处理 `node_modules/@scope/name` 形式
- 合并扫描结果后写入根目录 `skills/`（创建符号链接）
- 获取目标智能体/IDE：配置、命令行、`guessAgent`；仍为空则提示
- 扫描目标配置目录，得到已安装技能
- 对比并同步：删除多余链接、创建缺失链接、更新变更链接
  - 读取 `skillDisabled` 跳过被禁用技能
  - 若目标为真实目录则不覆盖，记录 debug 日志并退出
- 扫描过程输出进度，避免无响应感知

## 新增模块 init

- 技能名不得以 `skillLinkPrefixNpm` 或 `skillLinkPrefixPackage` 开头
- 技能名必须等于文件夹名且合法（不含路径分隔符等非法字符）
- 在 `skills/` 下创建同名目录并生成 `SKILL.md`

```markdown
---
name: <技能名称>
description: <留空>
metadata:
  author: <留空>
---
```

- 获取目标智能体/IDE：配置、命令行、`guessAgent`；仍为空则提示
- 对未被选中的智能体写入 `skillDisabled`
- 创建符号链接到所有目标配置目录
- 若同名目录已存在（无论是否为符号链接）则记录 debug 日志并退出

## 删除/禁用/启用模块

将“删除”和“禁用/启用”拆分为不同功能：

- **删除**：仅适用于手动创建的本地技能（非 npm、非子包、非安装来源）
- **禁用**：适用于任何来源，支持“全局”或“按智能体”禁用
- **启用**：从 `skillDisabled` 中移除禁用记录，并恢复符号链接

### 删除

- 仅针对本地手动创建的技能
- 对所有智能体/IDE 生效，不支持按智能体删除
- 交互确认后删除根目录 `skills/<name>`（放入回收站）
- 清理所有目标智能体/IDE 的符号链接

### 禁用

- 写入 `skillDisabled`（可按智能体或全局）
- 删除相应符号链接

### 启用

- 从 `skillDisabled` 中移除禁用记录
- 恢复相应符号链接

## 列出 list

- 默认列出根目录 `skills/` 中的技能
- 可区分手动技能与符号链接
- `--show-disabled` 读取 `skillDisabled` 并标注禁用范围
- 指定智能体/IDE 时列出该目录下技能
  - 多个智能体合并显示并标注来源
  - 同名但元信息不一致时标注冲突

## 安装模块 install

- 读取 `installSources`，若来源已存在则退出
- 解析来源：`owner/repo`、`owner/repo/tree/branch`、`owner/repo/tree/branch/skills/name` 或 git URL
- 克隆到临时目录（尽量浅克隆）
- 扫描临时 `skills/` 获取技能列表
  - 过滤不合法名称与非法前缀
  - 指定技能时仅保留目标技能
- 冲突交由用户选择，默认跳过（不覆盖真实目录原则）
- 获取目标智能体/IDE 并同步禁用记录
- 复制技能到根目录 `skills/`
- 创建符号链接
- 更新 `installSources`
- 删除临时目录

## 更新模块 update

- 基于 `installSources` 解析来源并克隆
- 扫描临时目录并生成新技能列表
- 根据模式过滤技能：全量、按来源、按技能
- 对比新旧列表：
  - 同名覆盖更新
  - 缺失技能仅在全量更新时执行卸载（并清理 `installSources`/`skillDisabled`），否则冲突交由用户选择，默认跳过
  - 新增技能直接安装
- 删除临时目录

## 日志与调试

冲突或解析失败时，追加写入项目根目录 `skilio-debug.log`：

- 时间
- 技能名
- 冲突双方路径或错误详情

## CLI 指令约定

- `scan` 扫描并同步链接
- `init` 新建本地技能（别名：`create`）
- `del` 删除本地技能（别名：`remove`）
- `disable` 禁用技能（支持按智能体）
- `enable` 启用技能（支持按智能体）
- `ls` 列出技能（别名：`list`）
- `config` 读取或修改配置（别名：`cfg`）
- `install` 安装技能（别名：`i`、`pull`）
- `update` 更新技能（别名：`up`）
