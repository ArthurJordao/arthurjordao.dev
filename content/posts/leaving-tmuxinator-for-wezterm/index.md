---
title: "Leaving tmuxinator for WezTerm's multiplexer"
description: "The workflow did not change at all. Four glued-together tools became one Lua file, with the same keybinding and the same search paths — and the trade was real."
publishDate: 2026-09-09
tags:
  - tmux
  - wezterm
  - dotfiles
draft: true
---

Three years ago I wrote about [a workflow built on tmux, tmuxinator and
fzf](/posts/tmux-tmuxinator-fzf-workflow/): hit a key, fuzzy-search my project directories, and get
a session with the layout I always wanted — editor in one window, a couple of panes in another.

I still work exactly that way. I just do not run any of those three tools any more.

This is not a post about tmux being bad. tmux is excellent and it does something WezTerm does not.
It is a post about noticing that most of a setup existed to compensate for something the terminal
could not do, and what happened when the terminal could.

## What the old setup was made of

Four moving parts, and it is worth listing them because the count is the point:

1. **A base tmuxinator config** at `~/.tmuxinator/project.yml`, with an ERB placeholder so the
   project directory could be passed in.
2. **An optional per-project override**, `.tmuxinator.yml`, which I added to my global
   `~/.gitignore` so it would not pollute every repository I worked in.
3. **A bash script**, `~/.local/bin/tmux-sessionizer`, which ran
   `find ~/dev/work ~/dev/personal -mindepth 1 -maxdepth 1 -type d | fzf`, then started tmuxinator
   with either the local config or the base one.
4. **A tmux binding** to launch it: `bind-key -r f run-shell "tmux neww ~/.local/bin/tmux-sessionizer"`.

Plus the runtime dependencies underneath: tmux, tmuxinator (and therefore Ruby), fzf, and bash.

It worked, and it worked for years. But look at what each part is *for*. The script exists because
tmux cannot enumerate directories. fzf exists because tmux has no fuzzy picker. tmuxinator exists
because tmux has no declarative layout format. Only one of the four is doing something intrinsic to
running a terminal multiplexer.

## What it is now

One file: `project-manager.lua`, loaded by my WezTerm config. Same workflow, part for part.

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

**The keybinding is still `f`.** I did not plan that as a tidy detail — I just never had a reason to
change it, which is the most honest evidence I have that the workflow itself did not move.

The per-project override kept the same shape too. If a project has a config, use it; if not, use the
default. That fallback is the whole reason the original setup was pleasant, and it survived
translation:

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

The picker is the part that surprised me most. WezTerm ships `InputSelector`, which takes a list of
choices and a `fuzzy = true` flag, and that is fzf's entire role in my workflow. Not a
reimplementation of fzf — fzf is a much better program than that — but the specific job I was using
it for turned out to be a built-in.

Workspace reuse works the way tmux sessions did: if a workspace with that name already exists,
switch to it; otherwise build it. Idempotent, so mashing the key is safe.

> **TODO before publishing:** the one thing only I can write. What actually made me switch —
> whether it was adopting WezTerm for other reasons and noticing the multiplexer afterwards, or
> going looking for this. The structural argument above is true either way, but the honest personal
> trigger belongs here and I should not let a tidy narrative stand in for it.

## What I lost, and it is not nothing

Any comparison that finds no downsides is an advertisement. Here are mine.

**Persistence, which is the thing tmux is actually for.** A tmux session outlives the terminal that
started it. Kill the emulator, lose the ssh connection, close the laptop lid — reattach and
everything is still running. WezTerm's multiplexer is a different model, and I now run a separate
session-manager module to save and restore state, which is not the same guarantee. If your work
lives on the other end of an ssh connection, this trade is probably not worth making, and tmux
remains the right answer.

**I own 367 lines of Lua** where I used to own about twenty lines of bash and a YAML file. A
dependency became code I maintain. That is the correct trade *for me* — I would rather debug my own
Lua than someone's Ruby gem — but it is a trade, not a free win.

**My code has a limit the old setup did not.** The tiled layout caps at four panes and logs a
warning past that, because splitting into anything more than a 2×2 grid got fiddly and I stopped.
tmux's own layout engine had no such opinion. That limit exists because I wrote it, and it is the
kind of thing you inherit when you replace a mature tool with a file of your own.

**Ruby left; Lua arrived.** For me that is an improvement. It is not universally one.

## Who should not do this

If you work over ssh, or on machines you connect to rather than sit at, stop reading — tmux's
persistence is not a feature you can trade away, and none of the above applies.

If you are already happy, the same. Four tools that work are better than one tool plus a weekend.

What made this worth doing was noticing that three of my four dependencies existed to fill gaps
that no longer exist. That is a question worth asking about any setup you have carried for a few
years: not "is there something better", but **"how much of this is compensating for something that
got fixed?"**
