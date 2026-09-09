---
title: "Dotfiles that survive several machines"
description: "Symlinks work until the second machine is not like the first. What replaces them is not a better symlink — it is describing your machines as data, and then validating that description."
publishDate: 2027-01-05
tags:
  - dotfiles
  - chezmoi
  - linux
draft: true
---

Dotfiles repositories almost all start the same way: a folder of config files and a script that
symlinks them into place. That works, and it keeps working right up until you have a second machine
that is not like the first.

Then the config that was one file has to be two files, or one file with an `if` in it. Then a third
machine arrives and the `if` becomes a chain. Somewhere in there you stop trusting the repository,
because you can no longer tell what any given machine will actually get.

This post is about what replaces the symlink, and it is not a better symlink. It is describing your
machines as data, and then treating that description as something that can be *wrong* and should be
checked.

I use chezmoi. Almost nothing here is specific to it — the ideas transfer to any tool that can
template a file, and the last two sections transfer to no tool at all, because nobody ships them.

## Where symlinks stop working

The first crack is small. Your shell config needs one line on the laptop and a different line on
the server. So you branch inside the file, and the file starts to carry knowledge about your
fleet.

That is the wrong place for it. The file should describe *a* configuration; something else should
know which machine is being configured. Once you accept that split, the shape of the solution
follows: **the difference moves out of the file and into data about the host.**

```
{{ if eq .chezmoi.os "darwin" }}
...
{{ end }}
```

This is still branching, but it branches on a fact about the machine rather than on a hardcoded
hostname, and the fact lives somewhere a human can read as a list.

## Roles beat hostnames

Branching on the machine's name is the version most people write first, and it degrades badly:
every template accumulates a list of hostnames, and adding a machine means auditing all of them.

Branch on **what the machine is for** instead. Mine carry roles like `dev`, `gaming`, `server`,
`edge`. A template asks "does this host have the `dev` role?" and a new laptop inherits everything
correct on the day it is added, because it declares the same roles the old one did.

The test for whether you have this right: **adding a machine should be an addition, not an edit.**
If a new host means touching ten templates, the fleet knowledge is still inside the templates.

## The data deserves a schema

Here is where this stops being ordinary advice.

Once your machines are described by a data file, that file is code — and it can be wrong in the
particular way data is wrong: a typo, a misspelled key, a value where a list belongs. The failure
mode is nasty because it is silent. A misspelled key does not error. It just means the thing you
thought you configured is not configured, and you find out weeks later.

So the data file gets a JSON Schema, and it is validated before anything is applied.

The single most valuable line in mine is `additionalProperties: false`. It means an unrecognised key
is an *error* rather than something quietly ignored. Without it a schema catches almost nothing that
matters, because the common mistake is not a wrong value — it is a key that never existed.

I now have fourteen data files and fourteen schemas beside them: hosts, DNS, packages, firewall,
secrets, themes, and so on. Each one is validated on every check.

## The part nobody ships: checking the relationships

A schema validates one file in isolation. It cannot see that two files disagree.

That gap is where my worst breakages lived, so it now has its own tool — a set of numbered
consistency rules, each of which knows one way the description can be internally coherent and still
wrong. A few real ones, with what they prevent:

- **A name that matches nothing deploys nothing, with no error.** A package list referring to
  something no source provides is silently a no-op.
- **An endpoint nothing listens on is a 502.** The reverse proxy will happily be configured to
  forward to a port that no unit ever binds.
- **A container missing from the units list keeps running through gaming mode.** The stop-list
  and the container list are two places that have to agree, and only one of them is obvious.
- **Auth declared on a portless endpoint guards nothing.** No port means no proxy block, so there
  is nowhere for the token check to exist. The config *looks* protected.
- **A name declared as both a package and a locally built binary races.** Whichever runs last wins,
  which is not a decision anybody made.

Look at what these have in common: every one of them is a state where **each individual file is
valid** and the system is broken anyway. No schema can catch them, because the mistake is in the
space between the files.

Each rule is numbered, and the number appears in the failure message. That sounds bureaucratic and
is not: when a check fails six months later, the number is what lets you find the comment explaining
why the rule exists. A rule whose reasoning is lost gets deleted the first time it is inconvenient.

## Secrets, and the problem underneath them

Secrets do not live in the repository. They are fetched at apply time from a password manager and
rendered into the file that needs them. That part is well-trodden.

The problem nobody warns you about is **testing**. Once templates reference secrets, rendering a
template requires an unlocked vault — so you cannot check that your templates are valid in CI, on a
fresh machine, or at three in the morning when the vault session has expired. In practice that means
you stop checking them, and template errors are found by applying them to a real machine.

The fix is a fake. A small script stands in for the password manager's binary and returns
plausible values for any field asked of it, wired in only when rendering a simulation. Every
template for every host can then be rendered on any machine with no secrets present, which turns
"do my templates still compile" into something a check can answer.

The subtlety worth stealing: the fake harvests the field names it should answer to **from the
templates themselves**, so a newly referenced secret does not require updating the fake. It is
deliberately over-inclusive — an extra field costs nothing, a missing one fails the render.

## What this costs

It is more machinery than most people need, and the threshold is real.

**One machine: do not.** A folder and a symlink script is correct, and everything above is overhead
with no payoff.

**Two similar machines: probably not.** You will branch twice and it will be fine.

**Three or more, or two that differ in kind** — a laptop and a server, macOS and Linux, work and
personal — the calculation flips, and it flips because of the silent failures rather than the
typing. The cost of this approach is a few hours of setup and a schema to keep current. The cost of
not having it is finding out in three weeks that a machine has been missing a config the whole time
and nothing told you.

The honest summary is that none of this makes the first machine better. It makes the fifth machine
possible without the repository becoming something you are afraid of.
