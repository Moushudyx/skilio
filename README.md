# skilio

![GitHub top lang](https://img.shields.io/github/languages/top/Moushudyx/skilio)
[![GitHub license](https://img.shields.io/badge/license-Mulan_PSL_v2-blue)](https://github.com/moushudyx/skilio/blob/master/LICENSE)
![NPM Version](https://img.shields.io/npm/v/skilio)
![NPM Downloads](https://img.shields.io/npm/dm/skilio)
![NPM Bundle Size](https://img.shields.io/bundlejs/size/skilio?label=gzipped)

A simple, efficient agent-skills manager for Node.js projects.

## What it does

- Collects skills from local packages and dependencies into a single `skills/` directory
- Links skills into supported agent/IDE config folders
- Helps add, remove, enable, or disable skills as your project evolves

## Install

```bash
npm i -D skilio
```

## Quick start

```bash
# Scan and link skills
skilio

# Add a new local skill
skilio add my-skill
```

## Docs

- Chinese guide: [README.ZH.md](README.ZH.md)
- Design notes: [design/modules.md](design/modules.md)
