/**
 * Identifiers for the giscus widget, read by src/components/blog/Giscus.astro.
 *
 * None of these are secrets: giscus is configured entirely from the client, and
 * every site using it ships these same values in its HTML. What actually gates
 * writing to the repo is the giscus GitHub App plus the origin allowlist in
 * giscus.json at the root of this repository.
 *
 * The category is an announcement-type one, so a discussion can only be opened
 * by a maintainer or by giscus itself — a comment thread cannot be started by
 * someone going around the widget.
 *
 * The themes are giscus's own, rather than a stylesheet served from this site.
 * A custom theme is fetched by the widget's iframe from giscus.app, which makes
 * it a cross-site request to this origin, and that request is refused in every
 * form a developer can offer it locally: plain http is mixed content, a tailnet
 * address is a private network, and a tunnel blocks cross-site reads. Hosting
 * the stylesheet means the widget can only ever be seen for real in production.
 * `transparent_dark` leaves the canvas transparent, so the page's own
 * background shows through rather than GitHub's.
 */
export const giscus = {
	category: "Announcements",
	categoryId: "DIC_kwDOH6vImc4DGMVr",
	repo: "ArthurJordao/arthurjordao.dev",
	repoId: "R_kgDOH6vImQ",
	themes: {
		dark: "transparent_dark",
		light: "light",
	},
} as const;
