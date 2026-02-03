# 流程设计

本文件描述主要指令的高层流程，便于实现与验收。

## scan

1. 读取配置与命令行参数。
2. 扫描 `node_modules/` 与 `packages/`（可配置），只扫描一层 `*/skills/`。
3. 解析技能（`SKILL.md`），无效技能写入 debug 日志并跳过。
4. 合并扫描结果到根目录 `skills/`（创建符号链接）。
5. 获取目标智能体/IDE：配置、命令行、`guessAgent`；仍为空则提示。
6. 同步到目标配置目录：
   - 跳过 `skillDisabled` 中禁用的技能。
   - 删除多余链接，创建缺失链接，更新变更链接。
   - 若目标为真实目录则不覆盖，记录冲突并退出。
7. 输出扫描进度与结果摘要。
8. 遇到同名冲突或不可继续错误，记录 debug 日志并退出。

## add

1. 校验名称合法且不含前缀 `skillLinkPrefixNpm` / `skillLinkPrefixPackage`。
2. 在 `skills/` 下创建目录与 `SKILL.md`。
3. 获取目标智能体/IDE，未选中的写入 `skillDisabled`。
4. 为目标智能体创建符号链接。
5. 冲突记录 debug 日志并退出。

## del

1. 校验技能来源为本地手动创建。
2. 交互确认。
3. 删除 `skills/<name>`（回收站）。
4. 清理所有智能体/IDE 目录的符号链接。

## disable

1. 校验技能存在于 `skills/` 或可识别来源。
2. 写入 `skillDisabled`（全局或按智能体）。
3. 删除对应配置目录中的符号链接。

## enable

1. 从 `skillDisabled` 移除禁用记录（全局或按智能体）。
2. 为目标智能体恢复符号链接。

## install

1. 校验来源未存在于 `installSources`。
2. 解析来源并克隆到临时目录（浅克隆）。
3. 扫描临时 `skills/` 并过滤非法技能名。
4. 冲突交由用户选择，默认跳过（不覆盖真实目录原则）。
5. 复制技能到根目录 `skills/`。
6. 同步到目标智能体/IDE。
7. 更新 `installSources`。
8. 清理临时目录。

## update

1. 读取 `installSources` 并按模式过滤来源与技能。
2. 克隆到临时目录并扫描 `skills/`。
3. 对比新旧技能列表：
   - 同名覆盖更新。
   - 缺失技能仅在全量更新时执行卸载（清理 `installSources`/`skillDisabled`），否则冲突交由用户选择，默认跳过。
   - 新增技能直接安装。
4. 同步到目标智能体/IDE。
5. 清理临时目录。
