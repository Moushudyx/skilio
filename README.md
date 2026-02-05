# skilio

![GitHub top lang](https://img.shields.io/github/languages/top/Moushudyx/skilio)
[![GitHub license](https://img.shields.io/badge/license-Mulan_PSL_v2-blue)](https://github.com/moushudyx/skilio/blob/master/LICENSE)
![NPM Version](https://img.shields.io/npm/v/skilio)
![NPM Downloads](https://img.shields.io/npm/dm/skilio)
![NPM Bundle Size](https://img.shields.io/bundlejs/size/skilio?label=gzipped)

A simple, efficient agent-skills manager

## Quick start

```bash
npm i -D skilio
```

Add a `prepare` script in your `package.json`:

```json
{
  "scripts": {
    "prepare": "skilio"
  }
}
```

`skilio` will scan for skill folders in your project's subpackages (`packages/`) and dependencies (`node_modules/`), create symbolic links into a centralized `skills/` directory at the repository root, and attempt to detect the agent/IDE used in the local environment. It will also create symbolic links from the centralized `skills/` to the corresponding agent configuration directories (for example `.cursor/skills/`, `.github/skills/`).

We recommend adding links such as `skills/npm-*`, `skills/package-*` into `.gitignore`.

> If you use multiple agents/IDEs, consider adding each agent's configuration directory (e.g. `.cursor/skills/`, `.github/skills/`) to `.gitignore` and maintain a single centralized `skills/` directory.

-----

If the tool cannot infer the agent/IDE, it will show an interactive prompt for selection. To disable prompts, use `--no-prompt`; the tool will only print a warning in that mode.

```bash
skilio --no-prompt
```

You can explicitly specify target agents/IDEs using `--agent`:

```bash
skilio --agent cursor,copilot,trae
```

## Example

Suppose a project depends on `some-module` and contains a workspace package `sub-package`, each providing skill folders. Project layout:

```plain
root/
├── .cursor/
│   └── some files...
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
└── other files...
```

When you run `skilio`, it will:

1. Scan `node_modules/*/skills/` and `node_modules/@*/*/skills/`, finding `some-module/skills/some-skill/` and `@namespace/ns-module/skills/ns-skill/`.
2. Scan `packages/*/skills/`, finding `sub-package/skills/pkg-skill/`.
3. Create symbolic links for the discovered skills into the root `skills/` directory.
4. Based on `.github/copilot-instructions.md`, infer GitHub Copilot usage and link the root `skills/` into `.github/skills/`.
5. If `.cursor/` exists, infer Cursor usage and link the root `skills/` into `.cursor/skills/` as well.
6. Clean up broken skill symlinks.

After execution the project may look like:

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
│   │   └── same links as .cursor/skills/
│   └── copilot-instructions.md
├── node_modules/
│   └── unchanged...
├── packages/
│   └── unchanged...
├── skills/
│   ├── ✨my-skill/
│   ├── 🔗npm-@namespace-ns-module-ns-skill/ -> ../node_modules/@namespace/ns-module/skills/✨ns-skill
│   ├── 🔗npm-some-module-some-skill/ -> ../node_modules/some-module/skills/✨some-skill
│   └── 🔗package-sub-package-pkg-skill/ -> ../packages/sub-package/skills/✨pkg-skill
└── other files...
```

## Commands

### Scan `scan`

Run `skilio scan` or simply `skilio` to scan project agent skills and create symlinks.

If invalid skills or name conflicts are discovered, details will be appended to `skilio-debug.log`.

```bash
# default invocation
skilio

# target cursor and trae agents
skilio scan --agent cursor,trae

# do not scan node_modules and do not clean broken links
skilio scan --no-npm --no-clean
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |
| `--no-npm` | Disable scanning `node_modules/` |
| `--no-packages` | Disable scanning `packages/` |
| `--no-clean` | Disable cleaning broken symlinks |
| `--npm` | Scan `node_modules/` |
| `--packages` | Scan `packages/` |
| `--clean` | Clean broken symlinks |

### Init `init`

Use `skilio init <skill-name>` to create a new skill in the root `skills/` directory and link it into all inferred agent/IDE config directories.

Alias: `skilio create <skill-name>`

Note: skill names must not start with `npm-` or `package-` to avoid ambiguity.

```bash
# create my-new-skill
skilio init my-new-skill

# specify agents cursor and copilot
skilio init my-new-skill --agent cursor,copilot
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |

### Delete `del`

Use `skilio del <skill-name>` to remove a locally created skill and its corresponding links from agent/IDE config directories.

Alias: `skilio remove <skill-name>`

If the skill originates from npm or a package, use `disable` instead.

```bash
# delete a local skill
skilio del my-old-skill
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts and delete immediately |

### Disable `disable`

Use `skilio disable <skill-name>` to disable a skill and remove the corresponding links from agent/IDE config directories.

```bash
# disable my-old-skill
skilio disable my-old-skill

# disable only for windsurf and trae
skilio disable my-old-skill --agent windsurf,trae
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts and proceed |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |

### Enable `enable`

Use `skilio enable <skill-name>` to re-enable a disabled skill and restore links.

```bash
# enable my-old-skill
skilio enable my-old-skill

# enable only for windsurf and trae
skilio enable my-old-skill --agent windsurf,trae
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts and proceed |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |

### List `ls`

Use `skilio ls` to list all managed agent skills in the project.

Alias: `skilio list`

By default it lists all skills maintained in the centralized `skills/` directory and not disabled. You can also limit listing to a specific agent/IDE.

> Agent-specific directories may contain manually added symlinks; when listing for an agent you may see skills not centrally maintained.

```bash
# list centralized skills
skilio ls

# list skills for a specific agent
skilio ls --agent copilot
```

| Option | Description |
| ------ | ----------- |
| `--show-disabled` | Show disabled skills |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |

### Config `config`

Use `skilio config <key> [value]` to view or modify configuration options. Alias: `skilio cfg`.

Some options such as `skillDisabled` and `installSources` are maintained by the tool and cannot be edited manually.

```bash
# show all config
skilio config

# show single config value
skilio config showPrompt # prints true or false

# set a config value
skilio config showPrompt false
skilio config defaultAgents cursor,copilot

# special options: changing skillLinkPrefixNpm or skillLinkPrefixPackage
skilio config skillLinkPrefixNpm np- # rename npm link prefix to "np-"
skilio config skillLinkPrefixPackage pkg- # rename package link prefix to "pkg-"
```

### Install (work-in-progress) `install`

Install a skill from a source repository into the root `skills/` directory and link it into inferred agent/IDE config directories.

Alias: `skilio i` or `skilio pull`

```bash
# install from GitHub owner/repo
skilio install moushudyx/foreslash

# specify branch
skilio install moushudyx/foreslash/tree/main

# install a specific skill in a repo
skilio install moushudyx/foreslash/tree/main/skills/deep-clone-any-object

# install from git URL (repo must contain a skills/ directory)
skilio install git@github.com:moushudyx/foreslash.git
skilio install https://gitee.com/moushu/foreslash.git
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable interactive prompts; avoid overwriting on conflicts |
| `--agent <agents>` | Specify target agents/IDEs (comma-separated) |

### Update (work-in-progress) `update`

Update installed skills to their latest versions. Alias: `skilio up`.

```bash
# update all installed skills
skilio update

# update by source
skilio update --source moushudyx/foreslash

# update specific skills
skilio update --skills deep-clone-any-object
```

| Option | Description |
| ------ | ----------- |
| `--no-prompt` | Disable prompts; auto-resolve conflicts and deletions |
| `--source <sources>` | Specify sources (comma-separated) |
| `--skills <skills>` | Specify skills (comma-separated) |

## Configuration

You can create `skilio-config.json` in the project root to configure behavior. All options are optional. Some fields (e.g. `skillDisabled`) are maintained by the tool.

Supported options:

| Key | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `showPrompt` | `boolean` | `true` | Whether to show interactive prompt when agent/IDE can't be inferred |
| `scanNpm` | `boolean` | `true` | Scan `node_modules/` |
| `scanPackages` | `boolean` | `true` | Scan `packages/` |
| `cleanLinks` | `boolean` | `true` | Clean broken symlinks during scan |
| `defaultAgents` | `string[]` | `[]` | Default target agents/IDEs (if set, prompts won't show) |
| `skillLinkPrefixNpm` | `string` | `"npm-"` | Prefix for npm-origin skill links (e.g. change to `np-` to produce `np-some-skill`) |
| `skillLinkPrefixPackage` | `string` | `"package-"` | Prefix for package-origin skill links (e.g. change to `pkg-`) |
| `skillDisabled` | `Record<string, string[]>` | `{}` | Disabled skills map: key = skill name, value = array of agents where it's disabled. Empty array means disabled for all agents. |
| `installSources` | `Record<string, string[]>` | `{}` | Installed skill sources map: key = source, value = list of skills installed from that source. Managed by the tool. |

## Supported Agents/IDEs

| Agent/IDE | `--agent` | Config directory | Detection basis |
| --------- | --------- | -------------- | --------------- |
| Cursor | `cursor` | `.cursor/skills/` | presence of `.cursor/` |
| GitHub Copilot | `copilot` | `.github/skills/` | presence of `.github/copilot-instructions.md` or `.github/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` | presence of `.windsurf/` |
| Trae | `trae` | `.trae/skills/` | presence of `.trae/` |
| Claude Code | `claude` | `.claude/skills/` | presence of `.claude/` |
| OpenClaw | `openclaw` | `skills/` | no detection needed |
| Qoder | `qoder` | `.qoder/skills/` | presence of `.qoder/` |
| Qwen Code | `qwen` | `.qwen/skills/` | presence of `.qwen/` |
| Cline | `cline` | `.cline/skills/` | presence of `.cline/` |
| Codex | `codex` | `.codex/skills/` | presence of `.codex/` |
| Continue | `continue` | `.continue/skills/` | presence of `.continue/` |
| Gemini CLI | `gemini` | `.gemini/skills/` | presence of `.gemini/` |
| Kimi Code CLI | `kimi` | `.agents/skills/` | presence of `.agents/` |
| Roo Code | `roo` | `.roo/skills/` | presence of `.roo/` |
| Zencoder | `zencoder` | `.zencoder/skills/` | presence of `.zencoder/` |
