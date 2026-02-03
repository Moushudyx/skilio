# skills-manager

![GitHub top lang](https://img.shields.io/github/languages/top/Moushudyx/skills-manager)
[![GitHub license](https://img.shields.io/badge/license-Mulan_PSL_v2-blue)](https://github.com/moushudyx/skills-manager/blob/master/LICENSE)
![NPM Version](https://img.shields.io/npm/v/skills-manager)
![NPM Downloads](https://img.shields.io/npm/dm/skills-manager)
![NPM Bundle Size](https://img.shields.io/bundlejs/size/skills-manager?label=gzipped)

A simple, efficient agent-skills manager for Node.js projects.

## What it does

- Collects skills from local packages and dependencies into a single `skills/` directory
- Links skills into supported agent/IDE config folders
- Helps add, remove, enable, or disable skills as your project evolves

## Install

```bash
npm i -D skills-manager
```

## Quick start

```bash
# Scan and link skills
skills-manager

# Add a new local skill
skills-manager add my-skill
```

## Docs

- Chinese guide: [README.ZH.md](README.ZH.md)
- Design notes: [design/modules.md](design/modules.md)
