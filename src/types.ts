export interface SiteConfig {
	/**
	 * Unaccented spelling of the author's name, emitted as schema.org
	 * alternateName. "Arthur Jordao" is how the name gets typed far more often
	 * than "Arthur Jordão", and it appears nowhere else on the site.
	 */
	alternateName?: string;
	author: string;
	date: {
		options: Intl.DateTimeFormatOptions;
	};
	description: string;
	/** Current employer, emitted as schema.org worksFor. */
	employer?: { name: string; url: string };
	/** Emitted as schema.org jobTitle. */
	jobTitle?: string;
	/** Topics the author works in, emitted as schema.org knowsAbout. */
	knowsAbout?: string[];
	/** Site-relative path to the author's photo, emitted as schema.org image. */
	profileImage?: string;
	/** Fediverse handle, so Mastodon credits the author on link previews. */
	fediverseCreator?: string;
	/** Twitter/X handle, so cards credit the author. */
	twitterCreator?: string;
	lang: string;
	ogLocale: string;
	showLogo: boolean;
	title: string;
	url: string;
}

export interface PaginationLink {
	srLabel?: string;
	text?: string;
	url: string;
}

export interface SiteMeta {
	articleDate?: string | undefined;
	description?: string;
	/**
	 * Emits <meta name="robots" content="noindex, follow">. For pages that
	 * exist for navigation rather than for a reader arriving from a search:
	 * they stay crawlable, and the links on them still carry weight.
	 */
	noindex?: boolean | undefined;
	ogImage?: string | undefined;
	/**
	 * Used verbatim as <title> instead of "<title> • <site title>". The home
	 * page needs this: "Home • Arthur Jordão" buries the name that the page is
	 * actually meant to rank for behind a word nobody searches.
	 */
	seoTitle?: string | undefined;
	title: string;
}

/** Webmentions */
export interface WebmentionsFeed {
	children: WebmentionsChildren[];
	name: string;
	type: string;
}

export interface WebmentionsCache {
	children: WebmentionsChildren[];
	lastFetched: null | string;
}

export interface WebmentionsChildren {
	author: Author | null;
	content?: Content | null;
	"mention-of": string;
	name?: null | string;
	photo?: null | string[];
	published?: null | string;
	rels?: Rels | null;
	summary?: Summary | null;
	syndication?: null | string[];
	type: string;
	url: string;
	"wm-id": number;
	"wm-private": boolean;
	"wm-property": string;
	"wm-protocol": string;
	"wm-received": string;
	"wm-source": string;
	"wm-target": string;
}

export interface Author {
	name: string;
	photo: string;
	type: string;
	url: string;
}

export interface Content {
	"content-type": string;
	html: string;
	text: string;
	value: string;
}

export interface Rels {
	canonical: string;
}

export interface Summary {
	"content-type": string;
	value: string;
}

export type AdmonitionType = "tip" | "note" | "important" | "caution" | "warning";
