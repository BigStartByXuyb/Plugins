# Project Adapter Initialization

Use this reference when a target project has no confirmed `framework.config.json`, component catalog, or resource-key catalog.

## Ownership

Project discovery data belongs to the target project, not to this Skill. Do not copy project-private source code, DLLs, business pages, real MasterGo URLs, absolute paths, or resource dumps into `references/`.

Recommended project-local files:

```text
<project-root>/framework.config.json
<project-root>/docs/ai-index/framework-index.json
<project-root>/docs/component-catalog.json
<project-root>/docs/mtslg-keys.json
<project-root>/docs/style-library-lock.json
```

## First-use flow

1. Locate the project root from the current workspace and user-provided target path.
2. Read `framework.config.json` if it exists. Resolve relative paths from the directory containing that file.
3. If the file is missing, or required paths are invalid, scan the project for likely source, index, resource, page, and layout directories.
4. Show the candidate paths and detected mode to the user. Ask for confirmation or corrections before writing configuration.
5. Write the confirmed configuration only to the target project.
6. Scan the configured sources and existing pages to create or update project-local indexes.
7. Record the source paths, scan time, and a source fingerprint in the index metadata.

Do not silently select a guessed project root, runtime directory, resource library, or page directory when multiple candidates exist.

## Reuse and refresh

Initialization is normally one-time per project. On later tasks:

- reuse a valid configuration and existing indexes without asking the same path questions again;
- validate that configured paths still exist before using them;
- refresh only a missing/invalid index, a changed source fingerprint, or when the user explicitly asks to rescan;
- ask before overwriting user-edited catalog entries;
- keep task-specific MasterGo mappings separate from the reusable project catalog.

## Configuration shape

The exact field names may be extended by an adapter, but paths must be project-relative or explicitly confirmed absolute paths:

```json
{
  "mode": "iocontrol",
  "source_root": "./Framework",
  "index_root": "./docs/ai-index",
  "pages_root": "./Config/Common/Pages",
  "resource_roots": ["./Resources"],
  "layout_file": "./Config/Common/Layout.xml",
  "key_catalog": "./docs/mtslg-keys.json"
}
```

`mode`, `source_root`, and `index_root` are the core routing fields. `pages_root`, `resource_roots`, `layout_file`, and `key_catalog` are adapter-specific and must be validated against the target project before use.

If the project uses reusable style libraries, add the selected library ID and version to the project configuration or a project-local lock file. Do not copy all available libraries into the project catalog and do not overwrite an existing profile version.

```json
{
  "framework_adapter": "mw-wpf",
  "style_library": "mw-style-a",
  "style_library_version": "1.1.0"
}
```

## Same framework, different resource library

If the XML/XAML protocol, `ControlType` set, property rules, and runtime lifecycle are unchanged, keep the existing adapter. Rebuild only the target project's component catalog and resource-key catalog. A different Button style library does not require a new adapter.

## New framework protocol

Create a new adapter only when the target framework changes the page format, control types, allowed properties, resource lookup, event/navigation protocol, coordinate host, or validation/synchronization lifecycle. The new adapter must be generic and sanitized; project-private facts remain in the target project's configuration and indexes.
