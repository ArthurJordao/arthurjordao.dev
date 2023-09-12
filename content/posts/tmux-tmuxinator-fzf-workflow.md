---
author: Arthur Jordão
title: Tmux + Tmuxinator + FZF workflow
date: 2023-09-12T01:00:00.000Z
description: An adventure for the perfect tmux workflow.
tags:
  - tmux
  - dotfiles
  - productivity
TocOpen: true
---
I adopted tmux to my workflow recently and one of the things that I wanted on my workflow was the ability to create tmux sessions for projects that I was working on using a specific layout. Most often I found myself using the following layout:

* Window 1 (editor)
  		- nvim .
* Window 2 (workspace vertical)
  		- Server
  		- Random commands workspace.

Creating this tmux session was kind of boring. My flow was something like:

* `cd` to the project.
* Start `nvim` on the first window.
* Create a new panel
* Split the window in two panels.

I thought well, I can optimize that!

First I tried [tmuxinator](https://github.com/tmuxinator/tmuxinator#erb), which is an awesome tool that you can describe a tmux session using yaml. You just need to save a yaml file under `.config/tmuxinator/sample.yml`, and the configuration looks something like that:

```yaml
# ~/.config/tmuxinator/sample.yml

name: sample
root: ~/dev/personal/sample

windows:
  - editor:
      layout: main-vertical
      panes:
        - vim
  - server: bundle exec rails s
  - logs: tail -f log/development.log
```

I started to use it, and I could just execute `tmuxinator start sample` and everything was setup as I wanted, but one thing that bored me was creating one tmuxinator config per project, and also having to type all the tmuxinator command, needing to remember the name of the project that I wanted to work on ~~my memory sucks!~~.

So, I got inspiration from [tmux sessionizer](https://github.com/ThePrimeagen/.dotfiles/blob/master/bin/.local/scripts/tmux-sessionizer) and gave a try to a way to integrate my tmux workflow with `fzf`. So I created a base `tmuxinator` configuration, which is the following:

```yaml
# ~/.tmuxinator/project.yml

name: project
root: <%= @settings["workspace"] %>

windows:
  - editor: nvim .
  - server:
      layout: main-vertical
      panes:
        -
        -
```

In this configuration, I just have my default config for every project which is one window with the editor and another with server/workspace panels. This config works for me in 90% of the projects.

Note that on the root I added an [erb](https://github.com/tmuxinator/tmuxinator#erb) syntax for passing the project directory.

Using this configuration, I created a new `bash` command using `fzf`, that finds all the folders located under `~/dev/noredink` (my work dev directory), and `~/dev/personal` (my personal dev directory). After that, I piped it to `fzf` so I could select the project that I wanted to work on.

If in the folder there is a `.tmuxinator.yml` I use the local config for the project, if not I use the default config and then I create a new tmux session using tmuxinator.

```bash
# ~/.local/bin
#!/usr/bin/env bash

if [[ $# -eq 1 ]]; then
    selected=$1
else
    selected=$(find ~/dev/noredink ~/dev/personal -mindepth 1 -maxdepth 1 -type d | fzf)
fi

if [[ -z $selected ]]; then
    exit 0
fi

selected_name=$(basename "$selected" | tr . _)
tmux_config_file="$selected/.tmuxinator.yml"
if [[ -f "$tmux_config_file" ]]; then
  cd $selected
  tmuxinator local
  cd -
else
  tmuxinator start project -n $selected_name workspace=$selected
fi
```

This is flexible enough to have custom configurations when needed or just use the default one!

I also added `.tmuxinator.yml` to my `~/.gitignore`, so it doesn't pollute my git projects with tmux configuration files.

```
# ~/.gitignore
...
.tmuxinator.yml
```

Finally, I added a keybinding to start the `tmux-sessionizer` on my tmux config:

```
# .config/tmux/tmux.conf
...
# Start tmux session on project
bind-key -r f run-shell "tmux neww ~/.local/bin/tmux-sessionizer"
```