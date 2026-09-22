---
title: "Leaving tmuxinator for WezTerm's multiplexer"
description: "The workflow didn't change at all. Four glued-together tools became one Lua file, with the same keybinding and the same search paths."
publishDate: 2026-11-03
tags:
  - tmux
  - wezterm
  - dotfiles
draft: true
---

Three years ago I wrote about [a workflow built on tmux, tmuxinator and
fzf](/posts/tmux-tmuxinator-fzf-workflow/): hit a key, fuzzy-search my project directories, and get
a session with the layout I always wanted, editor in one window and a couple of panes in another.

I still work exactly that way. I just don't run any of those three tools anymore.

## Why I switched

tmux is a layer between the program and the terminal, and a layer can only pass through what it
understands. Every capability my terminal grew that tmux had no concept of was a capability I didn't
have while working inside tmux, which was all of the time.

Image rendering is the clearest case. A terminal that can draw an image is useless to you if
everything you run is inside a multiplexer with no representation for one. Same for other newer
escape sequences: the multiplexer has to learn each one before anything under it can use it, and
that's a permanent lag.

So I didn't go looking for a better multiplexer. I wanted things the terminal could already do,
found out tmux was what stood between me and them, and only then checked whether I could get my
workflow back without it.

## What the old setup was made of

The dependency count is the other argument, and I only noticed it properly afterwards. Four moving
parts:

1. A base tmuxinator config at `~/.tmuxinator/project.yml`, with an ERB placeholder for the project
   directory.
2. An optional per-project override, `.tmuxinator.yml`, in my global `~/.gitignore` so it wouldn't
   pollute every repository.
3. A bash script, `~/.local/bin/tmux-sessionizer`, running
   `find ~/dev/work ~/dev/personal -mindepth 1 -maxdepth 1 -type d | fzf`, then starting tmuxinator
   with either the local config or the base one.
4. A tmux binding: `bind-key -r f run-shell "tmux neww ~/.local/bin/tmux-sessionizer"`.

Plus tmux, tmuxinator (and therefore Ruby), fzf and bash underneath.

Look at what each part is for. The script exists because tmux can't enumerate directories. fzf
exists because tmux has no fuzzy picker. tmuxinator exists because tmux has no declarative layout
format. Only one of the four is doing something intrinsic to running a multiplexer.

## What it is now

One file, `project-manager.lua`, loaded by my WezTerm config. Same workflow, part for part.

| | before | now |
|---|---|---|
| Layout definition | `project.yml` with ERB | a Lua table |
| Per-project override | `.tmuxinator.yml`, globally gitignored | `.wezterm.json` in the project root |
| Project discovery | `find … \| fzf` in a bash script | the same `find`, same two paths, inside the module |
| Fuzzy picker | fzf | WezTerm's own `InputSelector` with `fuzzy = true` |
| Glue | a bash script | none |
| Session unit | tmux session | WezTerm workspace |
| Binding | `bind-key -r f` | `LEADER + f` |
| Runtime deps | tmux, tmuxinator, Ruby, fzf, bash | WezTerm |

The keybinding is still `f`. I didn't plan that, I just never had a reason to change it.

The per-project override kept the same shape. If a project has a config, use it, if not use the
default:

```json
{
  "workspace": "my-web-project",
  "root": ".",
  "windows": [
    { "name": "editor", "command": "nvim ." },
    {
      "name": "server",
      "layout": "main-vertical",
      "panes": [
        { "command": "npm run dev", "send_keys": true },
        { "command": "npm run test:watch", "send_keys": true }
      ]
    }
  ]
}
```

Compare that to the YAML it replaced and the difference is the file extension.

The picker surprised me most. WezTerm ships `InputSelector`, which takes a list of choices and a
`fuzzy = true` flag, and that's fzf's entire role in my workflow. It's not a replacement for fzf,
fzf is a much better program than that, but the specific job I was using it for turned out to be
built in.

Workspace reuse works the way tmux sessions did. If a workspace with that name already exists,
switch to it, otherwise build it, so mashing the key is safe.

The one thing I gave up is persistence. A tmux session outlives the terminal that started it and a
WezTerm workspace doesn't, and I run a session-manager module to save and restore state instead. I
sit at these machines, so it cost me nothing. If you work over ssh it's the whole point of tmux.
