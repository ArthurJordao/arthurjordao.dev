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

tmux isn't bad, it's excellent, and it does something WezTerm doesn't. But most of my setup was
there to compensate for things the terminal couldn't do, and the terminal can do them now.

## What the old setup was made of

Four moving parts:

1. A base tmuxinator config at `~/.tmuxinator/project.yml`, with an ERB placeholder so the project
   directory could be passed in.
2. An optional per-project override, `.tmuxinator.yml`, which I added to my global `~/.gitignore` so
   it wouldn't pollute every repository I worked in.
3. A bash script, `~/.local/bin/tmux-sessionizer`, which ran
   `find ~/dev/work ~/dev/personal -mindepth 1 -maxdepth 1 -type d | fzf`, then started tmuxinator
   with either the local config or the base one.
4. A tmux binding to launch it: `bind-key -r f run-shell "tmux neww ~/.local/bin/tmux-sessionizer"`.

Plus the runtime dependencies underneath: tmux, tmuxinator (and therefore Ruby), fzf, and bash.

It worked for years. But look at what each part is *for*. The script exists because tmux can't
enumerate directories. fzf exists because tmux has no fuzzy picker. tmuxinator exists because tmux
has no declarative layout format. Only one of the four is doing something intrinsic to running a
terminal multiplexer.

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

The per-project override kept the same shape too. If a project has a config, use it, if not use the
default. That fallback is the whole reason the original setup was pleasant, and it survived the
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

The picker surprised me most. WezTerm ships `InputSelector`, which takes a list of choices and a
`fuzzy = true` flag, and that's fzf's entire role in my workflow. It's not a reimplementation of
fzf, fzf is a much better program than that, but the specific job I was using it for turned out to
be built in.

Workspace reuse works the way tmux sessions did. If a workspace with that name already exists,
switch to it, otherwise build it. So mashing the key is safe.

## What actually made me switch

None of the above. The dependency count argument is real but it isn't what moved me, I only noticed
it afterwards.

What moved me is that tmux is a layer between the program and the terminal, and a layer can only
pass through what it understands. Every capability my terminal grew that tmux had no concept of was
a capability I didn't have while working inside tmux, which was all of the time.

Image rendering is the clearest case. A terminal that can draw an image is useless to you if
everything you run is inside a multiplexer with no representation for one. Same for other newer
escape sequences: the multiplexer has to learn each one before anything running under it can use it,
and that's a permanent lag.

So I didn't find a better multiplexer. I wanted things the terminal could already do, found out my
multiplexer was what stood between me and them, and only then checked whether I could get my
workflow back without it. tmux wasn't just requiring three helper tools to be pleasant, it was also
blocking features I wanted, and paying maintenance for a layer that takes capabilities away is an
easy decision.

## What I lost

Persistence, which is the thing tmux is actually for. A tmux session outlives the terminal that
started it. Kill the emulator, lose the ssh connection, close the laptop lid, then reattach and
everything is still running. WezTerm's multiplexer is a different model, and I now run a separate
session-manager module to save and restore state, which is not the same guarantee. If your work
lives on the other end of an ssh connection this trade probably isn't worth making, and tmux is
still the right answer.

I own 367 lines of Lua where I used to own about twenty lines of bash and a YAML file. A dependency
became code I maintain. I'd rather debug my own Lua than someone's Ruby gem, but it's a trade, not a
free win.

My code has a limit the old setup didn't. The tiled layout caps at four panes and logs a warning
past that, because splitting into more than a 2×2 grid got fiddly and I stopped. tmux's layout
engine had no such opinion. That limit exists because I wrote it, and that's the kind of thing you
inherit when you replace a mature tool with a file of your own.

Ruby left and Lua arrived. For me that's an improvement, it isn't universally one.

## Who should not do this

If you work over ssh, or on machines you connect to rather than sit at, stop reading. tmux's
persistence isn't a feature you can trade away and none of the above applies.

If you're already happy, same. Four tools that work are better than one tool plus a weekend.

What made this worth doing was noticing that three of my four dependencies existed to fill gaps that
don't exist anymore. That's worth asking about any setup you've carried for a few years: how much of
it is compensating for something that got fixed?
