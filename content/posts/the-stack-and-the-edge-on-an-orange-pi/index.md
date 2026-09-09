---
title: "The whole stack and the edge on an Orange Pi"
description: "A 4 GB board runs nine containers, LAN DNS and the reverse proxy for my house. Most of the work was learning which limits are the board, which are the peripheral, and which are lies the hardware tells you."
publishDate: 2026-09-09
tags:
  - selfhost
  - orange-pi
  - linux
draft: true
---

Everything I self-host runs on an Orange Pi Zero 3. Four gigabytes of RAM, an Allwinner H618, four
cores, nine containers — and it is also the network edge, so it answers DNS for the house and
terminates the tunnel that makes a couple of services reachable from outside.

It works well. Getting there took a month of finding out that half the things I believed about the
hardware were wrong, and that some of them were wrong because a chip was lying to me.

This post is the part I would have wanted before starting: not a list of `docker run` commands, but
which decisions matter, which limits are real, and what the failure looks like when you get one
wrong.

## Storage is the decision that matters

Not the board, not the RAM. Storage.

The default is to run everything from the microSD card, and the default is wrong for anything
running 24/7 — cards die from write cycles and they die *silently*, corrupting a filesystem rather
than reporting an error. So: root on a real SSD in a USB enclosure, and only `/boot` on the card.

Two things about that split will bite you.

**Do not move `/boot` onto the SSD.** This board has no separate boot partition — u-boot loads the
kernel from a `/boot` directory inside an ext4 filesystem, and it loads it *from the card*. If you
copy `/boot` to the SSD and mount it there, apt writes the SSD copy while u-boot keeps reading the
card's, and every kernel upgrade appears to work while silently continuing to run the old kernel.
The arrangement that works is `/boot` staying on the card, bind-mounted into place.

**Leave the rest of the card unallocated.** Mine has a 1.4 GiB partition holding 77 MB of kernel,
and the remaining 28 GiB is deliberately empty — free space the controller can use for wear
levelling, on the one device that absolutely must boot.

## Buy a genuine card, and verify it before you trust it

My first microSD announced 117 GiB and had 15.45 GiB of real flash. It was counterfeit.

What makes this worth a section is how it fails. It does not report an I/O error. There is no `mmc`
error in the kernel log. You get **ext4 metadata corruption** — which sends you debugging a
filesystem, a kernel, a power supply, anything except the card, because the card is answering every
request cheerfully and just not storing most of them.

Write and read back more data than the card claims to hold, before you put anything on it that you
would miss.

## The enclosure will lie about itself, and it will not be the problem

My USB enclosure reports a Realtek chipset. Its product listing claimed an ASMedia one. A
vendor/product ID is the bridge's own identity and does not change with link speed, so that is not
a detection quirk — it is a different chip than advertised, most plausibly a silent revision.

I spent a while convinced that was my bottleneck. It was not. **This board's USB ports are USB 2.0,
and that is the whole story.** I proved it by moving the same enclosure to a USB 3 host:

| | on the Pi | on a USB 3 host |
|---|---|---|
| Transport | `usb-storage` (BOT) | `uas` |
| TRIM | unsupported | 512 B granularity |
| Reported as | rotational | non-rotational |
| SATA link | 1.5 Gb/s | 6.0 Gb/s |
| Sequential read | ~40 MB/s | 359 MB/s |

Every deficit disappeared without changing a cable or a setting. The enclosure was fine; the host
was the limit.

The mechanism is worth knowing because it forecloses a whole category of fixes: the enclosure
advertises its faster transport **only at SuperSpeed**. At high speed it presents bulk-only
transport alone, and bulk-only carries no `UNMAP` command — so no kernel flag, quirk or driver
option can get TRIM on this board. Replacing the enclosure buys nothing. Only a different board
would, and for my workload it is not worth chasing: the box uses about 20 GB of 220, so most of the
drive is never written and stays in the controller's free pool, which is most of what TRIM would
have bought me anyway.

**The general lesson:** when a peripheral underperforms, test it somewhere else before replacing it.
I nearly bought a second enclosure to fix a problem that lived in the board.

## The lie that actually mattered

Here is the one that would have cost me data.

The USB bridge reports that the drive's write cache is **disabled**. The drive itself reports it
**enabled**. The kernel believes the bridge, so it skips the cache flushes ext4 asks for — and what
you lose there is not the last few seconds of writes. It is the journal's *ordering* guarantee,
which is a worse class of failure, on a box whose remote recovery path is a smart plug cutting
power.

You cannot fix this from the kernel side. Writing the cache setting back through this bridge is a
silent no-op: the write returns success and the value does not change. What works is going around
the bridge and turning the cache off *on the drive*, via an ATA command the bridge passes through
instead of the one it ignores. The drive forgets that on every power cycle, so it needs a small unit
that reasserts it at boot.

Measured cost of running with the cache off: synchronous 4 K writes went from 1.7 ms to 2.46 ms, and
bulk sequential from 33.9 to 32.5 MB/s. Cheap only because the USB 2.0 round-trip dominates
everything anyway. On a faster board that trade would look different.

I also tested the alternative — forcing the kernel to flush instead of removing the cache — and
rejected it on the measurement rather than the difficulty. Either result argued against it: if the
timing had stayed at 1.7 ms it would mean the bridge was discarding the flush, which is unsafe; at
2.46 ms it is real and no faster than cache-off. And it would trade a hard guarantee for one
depending on a bridge that already discards commands silently.

## Distribution surprises

**Rootless podman on Debian needs two packages Arch bundles into its base.** Without `uidmap`,
*every* podman command fails — including `podman info` — with a message about `newuidmap` not being
found. Without `passt`, there is no rootless networking at all, because the older fallback is not
installed either. Debian's podman package depends on neither.

**Do not start all your containers at once.** Nine units starting together means eight simultaneous
image pulls over one link. Each hits its start timeout, systemd restarts it, and the restart begins
the pull again. Nothing ever converges and the logs make it look like a broken image. Pull
sequentially first, then start the units.

**The board has no real-time clock.** The clock jumps forward mid-boot once the network comes up, so
journal timestamps in the first minutes of a boot are neither wall-clock nor consistent with
`uptime`. Trust the ordering, not the times.

## If it is also your edge, one failure mode is asymmetric

This box answers DNS for the house, and it is dual-homed: wired preferred, wifi as a fallback.

The fallback is one-directional, and it took me a moment to see why. Unplug the cable and the box
still reaches out fine over wifi — but every DNS record in the house points at its *wired* address,
so nothing can reach *it*. And since it is the DNS server, that is LAN name resolution down while
the box itself is perfectly healthy.

Redundancy that only works outbound is not redundancy. If a machine is the thing others depend on,
its fallback has to be reachable at the address they were told to use.

## What makes it maintainable

None of the above is interesting if it lives in your shell history.

Every container is a generated unit file, every host is described by a data file that is validated
against a schema before anything is applied, and there are consistency checks that fail loudly when
two parts of the description disagree. A typo becomes an error before it becomes a broken machine.

That is the actual reason a board this small is enough: **the box is disposable because the
description of the box is not.** If it dies tomorrow I flash a card, run one command, and wait. Every hardware
verdict in this post is written down in my notes, measured once, so I never re-derive it.

The board is not what makes this work. Being able to rebuild it is.
