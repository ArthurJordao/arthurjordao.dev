/**
 * Single source of truth for the CV.
 *
 * Three consumers depend on this:
 *   - src/pages/cv.astro renders it at /cv
 *   - scripts/cv-linkedin.ts turns it into content/cv/linkedin-paste.txt
 *   - src/site.config.ts derives its schema.org jobTitle from it
 *
 * LinkedIn has no API for this, so the profile is updated by hand from the
 * generated paste file, which scopes that work to whatever changed.
 *
 * The phone number that appears in the .docx version of this CV is
 * deliberately absent. This page is public and indexed.
 */

/** Month precision, "YYYY-MM", matching how LinkedIn stores dates. */
export type CvMonth = `${number}-${number}`;

const YEAR_WORDS = [
	"Zero",
	"One",
	"Two",
	"Three",
	"Four",
	"Five",
	"Six",
	"Seven",
	"Eight",
	"Nine",
	"Ten",
];

/**
 * `CvMonth` is a template literal type, so it admits "2022-4" and worse. An
 * unpadded or malformed month reaches Date as NaN and renders as the literal
 * "Invalid Date", or as "NaN years", with the build still green — so parsing
 * goes through here and throws instead.
 */
export function parseMonth(month: string): Date {
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
		throw new Error(`src/data/cv.ts: "${month}" is not a YYYY-MM month.`);
	}
	return new Date(`${month}-01T00:00:00Z`);
}

/** Whole years since a month, spelled out, floored. */
function yearsSince(month: CvMonth): string {
	const start = parseMonth(month);
	const now = new Date();
	let years = now.getUTCFullYear() - start.getUTCFullYear();
	if (now.getUTCMonth() < start.getUTCMonth()) years -= 1;
	return YEAR_WORDS[years] ?? String(years);
}

export interface CvBasics {
	name: string;
	/** The role title. LinkedIn's headline is a separate field and may differ. */
	title: string;
	tagline: string;
	location: string;
	email: string;
	github: string;
	linkedin: string;
}

export interface CvPosition {
	company: string;
	title: string;
	start: CvMonth;
	/** null means Present. */
	end: CvMonth | null;
	location: string;
	summary: string;
	/** What the role delivered, one entry each. */
	highlights: string[];
	/**
	 * The technology this role was built on. Load-bearing in two places: the
	 * skills that LinkedIn attaches to a position, and the page's skills line,
	 * which is the union of these across every role. Order matters — the line
	 * reads in role order, so this array's order is what a reader sees.
	 */
	tech: string[];
}

export interface CvEducation {
	institution: string;
	qualification: string;
	start: string;
	end: string;
}

export interface CvLanguage {
	language: string;
	level: string;
}

export interface Cv {
	basics: CvBasics;
	summary: string;
	positions: CvPosition[];
	education: CvEducation[];
	languages: CvLanguage[];
}

export const cv: Cv = {
	basics: {
		name: "Arthur Jordão",
		title: "Software Engineer",
		tagline: "Functional programming and distributed systems",
		location: "Florianópolis, Santa Catarina, Brazil",
		email: "hi@arthurjordao.dev",
		github: "https://github.com/ArthurJordao",
		linkedin: "https://www.linkedin.com/in/arthurjordao/",
	},
	summary:
		"Self-taught software engineer. " +
		`${yearsSince("2022-04")} years writing Haskell in production at NoRedInk, and before that ` +
		"Clojure on Nubank's lending infrastructure. Most of my career has been functional " +
		"programming at companies running it at scale.",
	positions: [
		{
			company: "NoRedInk",
			title: "Software Engineer II",
			start: "2022-04",
			end: null,
			location: "Remote",
			summary: "Education software for classroom writing.",
			highlights: [
				"Built the authoring layer for the in-house event platform that now carries all of the company's product analytics into Snowflake and Mitzu. Proposed a GitHub-backed editor over the planned CMS: definitions are versioned YAML, an edit opens a pull request, and CI generates typed event clients for Ruby, Elm and Haskell — so review, audit and compile-time safety came free, with no new infrastructure.",
				"Led three language-model upgrades behind automated grading against vendor retirement deadlines, and built the ground-truth evaluation script the pipeline was missing, so later upgrades are repeatable.",
				"Led the refactor of the assignment tutorial system, remodelling frontend and backend so a new assignment type gets its tutorial and its intro tour without either being rebuilt.",
				"Built translation and accessibility support for English language learners: a reusable language selection component, speech synthesis, screen-reader pronunciation of embedded foreign text, and right-to-left alignment.",
				"Integrated a new activity type across every surface it touched, from teacher and student dashboards through to grade sync with Canvas and other LMSs.",
				"Re-architected the portfolio page: backend pagination, queries narrowed to what the page actually needs, and aggregation moved off the frontend, which had been computing all of it on every load.",
				"Building container tooling to run AI coding agents in parallel in isolation — Apple containers, with artefacts cached in ECR so an environment comes up in five minutes instead of thirty, tooling in place and database already seeded.",
			],
			tech: ["Haskell", "Elm", "Ruby on Rails", "PostgreSQL", "MySQL", "Snowflake", "Datadog"],
		},
		{
			company: "Nubank",
			title: "Senior Software Engineer",
			start: "2019-07",
			end: "2022-04",
			location: "São Paulo, Brazil",
			summary: "Lending team, on the services that issue and service credit.",
			highlights: [
				"Built and ran core lending services as Clojure microservices: account management, renegotiation, issuance and dynamic underwriting.",
				"Extracted payments out of the personal loan domain into a standalone service. Another team's platform had been charging installments for us, debiting the customer's account on our behalf; as it generalised from lending to credit cards, lending took over its own settlement — boleto and Pix cleared directly with the services that move money, over Kafka and idempotent end to end.",
				"Streamed credit policies into Elasticsearch through Kafka, so the team could monitor credit exposure live.",
				"Led the online underwriting path in Clojure. Features could depend on other features, so the engine resolved them as a DAG — topologically sorted, each evaluated once its inputs were in hand — until the decision had everything it needed. An applicant it scored as risky could send income proof, which queued a human review before the final answer.",
				"Defined the team's stability index metrics, and the monitoring and alerting behind them.",
			],
			tech: [
				"Clojure",
				"ClojureScript",
				"Kafka",
				"Elasticsearch",
				"Datomic",
				"Kubernetes",
				"GraphQL",
				"TypeScript",
				"AWS",
				"Prometheus",
			],
		},
		{
			company: "Catho",
			title: "Software Engineer",
			start: "2018-05",
			end: "2019-06",
			location: "Barueri, Brazil",
			summary: "Billing systems for a job board.",
			highlights: [
				"Integrated new acquirer banks into the billing system, raising charge conversion.",
				"Modernised the legacy billing code behind it, inside a PHP and Java monolith.",
			],
			tech: ["PHP", "Java", "RabbitMQ", "Jenkins", "JavaScript"],
		},
		{
			company: "Accenture",
			title: "Software Engineer",
			start: "2017-11",
			end: "2018-05",
			location: "São Paulo, Brazil",
			summary: "Fraud detection, on the advanced technology and architecture team.",
			highlights: [
				"Built fraud detection services on AWS serverless, designed for high availability.",
				"Integrated third-party ML APIs into the detection flow: liveness checks, credit risk scoring and document verification.",
			],
			tech: ["Java", "AWS Lambda", "DynamoDB", "SQS", "SNS", "API Gateway"],
		},
	],
	education: [
		{
			institution: "UNINOVE",
			qualification: "Technologist, Systems Analysis and Development",
			start: "2017",
			end: "2019",
		},
	],
	languages: [
		{ language: "Portuguese", level: "Native" },
		{ language: "English", level: "Professional working proficiency" },
	],
};

/**
 * Every technology across every role, oldest jobs included, in role order.
 * To change what appears, or in what order, edit the roles' `tech`.
 *
 * The Set means a duplicate across two roles is invisible here but still
 * ships to LinkedIn, which renders each role's `tech` unmerged.
 */
export const skills: string[] = [...new Set(cv.positions.flatMap((position) => position.tech))];
