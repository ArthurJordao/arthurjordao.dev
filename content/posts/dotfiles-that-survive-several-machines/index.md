---
title: "Dotfiles that survive several machines"
description: "Symlinks work until the second machine isn't like the first. What replaces them is describing your machines as data, and then validating that description."
publishDate: 2027-01-05
tags:
  - dotfiles
  - chezmoi
  - linux
draft: true
---

Dotfiles repositories almost all start the same way: a folder of config files and a script that
symlinks them into place. That works, and it keeps working right up until you have a second machine
that isn't like the first.

Then the config that was one file has to be two files, or one file with an `if` in it. A third
machine arrives and the `if` becomes a chain. Somewhere in there you stop trusting the repository,
because you can't tell anymore what any given machine will actually get.

What replaces the symlink is describing your machines as data, and then treating that description as
something that can be *wrong* and should be checked.

I use chezmoi, but almost nothing here is specific to it. The ideas transfer to any tool that can
template a file, and the last two sections transfer to no tool at all, because nobody ships them.

## Where symlinks stop working

The first crack is small. Your shell config needs one line on the laptop and a different line on the
server, so you branch inside the file, and now the file carries knowledge about your fleet.

That's the wrong place for it. The file should describe one configuration, and something else should
know which machine is being configured. So the difference moves out of the file and into data about
the host:

```
{{ if eq .chezmoi.os "darwin" }}
...
{{ end }}
```

This is still branching, but it branches on a fact about the machine and not on a hardcoded
hostname, and the fact lives somewhere you can read as a list.

## Use roles, not hostnames

Branching on the machine's name is the version most people write first and it degrades badly. Every
template accumulates a list of hostnames, and adding a machine means auditing all of them.

Branch on what the machine is for. Mine carry roles like `dev`, `gaming`, `server`, `edge`. A
template asks whether this host has the `dev` role, and a new laptop inherits everything correct on
the day I add it, because it declares the same roles the old one did.

The test is whether adding a machine is an addition or an edit. If a new host means touching ten
templates, the fleet knowledge is still inside the templates.

## The data needs a schema

Once your machines are described by a data file, that file is code, and it can be wrong the way data
is wrong: a typo, a misspelled key, a value where a list belongs. The failure mode is nasty because
it's silent. A misspelled key doesn't error, it just means the thing you thought you configured
isn't configured, and you find out weeks later.

So the data file gets a JSON Schema and it's validated before anything is applied.

The most valuable line in mine is `additionalProperties: false`. An unrecognised key becomes an
error instead of something quietly ignored. Without it a schema catches almost nothing that matters,
because the common mistake isn't a wrong value, it's a key that never existed.

I have fourteen data files and fourteen schemas beside them: hosts, DNS, packages, firewall,
secrets, themes and so on. Each one is validated on every check.

## Checking that the files agree

A schema validates one file in isolation. It can't see that two files disagree.

That gap is where my worst breakages lived, so it has its own tool now: a set of numbered
consistency rules, each one knowing a way the description can be internally coherent and still
wrong. Some real ones, with what they prevent:

- A name that matches nothing deploys nothing, with no error. A package list referring to something
  no source provides is silently a no-op.
- An endpoint nothing listens on is a 502. The reverse proxy will happily forward to a port that no
  unit ever binds.
- A container missing from the units list keeps running through gaming mode. The stop-list and the
  container list are two places that have to agree, and only one of them is obvious.
- Auth declared on a portless endpoint guards nothing. No port means no proxy block, so there's
  nowhere for the token check to exist. The config looks protected.
- A name declared as both a package and a locally built binary races. Whichever runs last wins,
  which is not a decision anybody made.

Every one of those is a state where each file is valid on its own and the system is broken anyway.
No schema catches them, because the mistake is in the space between the files.

Each rule is numbered and the number appears in the failure message. That sounds bureaucratic, but
when a check fails six months later the number is what lets you find the comment explaining why the
rule exists. A rule whose reasoning is lost gets deleted the first time it's inconvenient.

## Secrets, and why you can't test them

Secrets don't live in the repository. They're fetched at apply time from a password manager and
rendered into the file that needs them. That part is well-trodden.

The problem nobody warns you about is testing. Once templates reference secrets, rendering a
template requires an unlocked vault, so you can't check that your templates are valid in CI, on a
fresh machine, or at three in the morning when the vault session has expired. In practice you stop
checking them, and template errors get found by applying them to a real machine.

The fix is a fake. A small script stands in for the password manager's binary and returns plausible
values for any field asked of it, wired in only when rendering a simulation. Every template for
every host can then be rendered on any machine with no secrets present, which turns "do my templates
still compile" into something a check can answer.

The fake harvests the field names it should answer to from the templates themselves, so a newly
referenced secret doesn't require updating it. It's deliberately over-inclusive, since an extra
field costs nothing and a missing one fails the render.

## What this costs

It's more machinery than most people need.

One machine: don't. A folder and a symlink script is correct, and everything above is overhead with
no payoff.

Two similar machines: probably don't. You'll branch twice and it'll be fine.

Three or more, or two that differ in kind, like a laptop and a server or work and personal, and the
calculation flips. It flips because of the silent failures, not because of the typing. This approach
costs a few hours of setup and a schema to keep current. Not having it costs finding out in three
weeks that a machine has been missing a config the whole time and nothing told you.

None of this makes the first machine better. It makes the fifth machine possible.
