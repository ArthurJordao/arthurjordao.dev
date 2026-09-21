/**
 * Single source of truth for the profiles that belong to Arthur Jordão.
 *
 * Two consumers depend on this list staying in sync:
 *   - src/components/SocialList.astro renders it with rel="me"
 *   - src/components/Schema.astro emits the http(s) entries as schema.org sameAs
 *
 * rel="me" plus sameAs is what lets a search engine tie this domain to the
 * person behind these accounts, so a profile added in one place and forgotten
 * in the other weakens exactly the signal it was added for.
 */
export interface SocialLink {
	friendlyName: string;
	isWebmention?: boolean;
	link: string;
	name: string;
}

export const socialLinks: SocialLink[] = [
	{ friendlyName: "Github", link: "https://github.com/ArthurJordao", name: "mdi:github" },
	{ friendlyName: "X", link: "https://x.com/_ArthurJordao", name: "simple-icons:x" },
	{
		friendlyName: "YouTube",
		link: "https://www.youtube.com/channel/UC9GfddKP0AFtoSoAXsr5fCw",
		name: "mdi:youtube",
	},
	{
		friendlyName: "LinkedIn",
		link: "https://www.linkedin.com/in/arthurjordao/",
		name: "mdi:linkedin",
	},
	{ friendlyName: "Instagram", link: "https://instagram.com/arthurbjordao", name: "mdi:instagram" },
	{ friendlyName: "Mastodon", link: "https://bolha.us/@arthurjordao", name: "mdi:mastodon" },
	{
		friendlyName: "Bluesky",
		link: "https://bsky.app/profile/arthurjordao.dev",
		name: "simple-icons:bluesky",
	},
	{ friendlyName: "Keybase", link: "https://keybase.io/arthurjordao", name: "mdi:key-variant" },
	{ friendlyName: "Email", link: "mailto:hi@arthurjordao.dev", name: "mdi:email" },
];

/** The profile URLs, for schema.org sameAs. mailto: is not a profile page. */
export const sameAsLinks: string[] = socialLinks
	.map(({ link }) => link)
	.filter((link) => link.startsWith("https://"));
