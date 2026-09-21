/**
 * Single source of truth for the CV.
 *
 * Three consumers depend on this:
 *   - src/pages/cv.astro renders it at /cv
 *   - scripts/cv-linkedin.ts turns it into content/cv/linkedin-paste.txt
 *   - src/site.config.ts derives schema.org jobTitle and worksFor from it
 *
 * There is no automated path to LinkedIn in either direction: profile writes
 * need their partner programme, and the data export is a slow ZIP of CSVs
 * rather than an API. So this file is authored here and pushed to LinkedIn by
 * hand, with the generated paste file scoping that work to what changed.
 *
 * The phone number that appears in the .docx version of this CV is
 * deliberately absent. This page is public and indexed.
 */

/** Month precision, "YYYY-MM", matching how LinkedIn stores dates. */
export type CvMonth = `${number}-${number}`;

export interface CvBasics {
	name: string;
	/** The real job title, which the LinkedIn headline currently overstates. */
	title: string;
	tagline: string;
	location: string;
	email: string;
	github: string;
	linkedin: string;
	site: string;
}

export interface CvPosition {
	company: string;
	title: string;
	start: CvMonth;
	/** null means Present. */
	end: CvMonth | null;
	location: string;
	summary: string;
	/** Grouped by discipline, the shape Curriculum.docx already used. */
	highlights: { area: string; detail: string }[];
}

export interface CvEducation {
	institution: string;
	qualification: string;
	start: string;
	end: string;
}

export interface CvSkillGroup {
	label: string;
	items: string[];
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
	skills: CvSkillGroup[];
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
		site: "https://arthurjordao.dev",
	},
	summary:
		"Software engineer solving problems with functional programming and reactive systems. " +
		"Four years writing Haskell in production at NoRedInk, and before that Clojure on " +
		"Nubank's lending infrastructure. Most of my career has been functional programming at " +
		"companies running it at scale.",
	positions: [
		{
			company: "NoRedInk",
			title: "Software Engineer",
			start: "2022-04",
			end: null,
			location: "Remote",
			summary:
				"Education software. Helped create two new products that made the software work for " +
				"3rd to 5th graders, and led two projects on the introduction and tutorial flows for " +
				"assignments, which meant remodelling parts of both frontend and backend to keep them " +
				"flexible.",
			highlights: [
				{
					area: "Backend",
					detail:
						"Writing and architecting features in Haskell and Ruby on Rails, over Postgres and MySQL.",
				},
				{
					area: "Frontend",
					detail:
						"Architecting pages needing rich text editing, animation and non-trivial state, in Elm.",
				},
				{ area: "Ops", detail: "Feature monitoring with New Relic and Datadog." },
				{
					area: "Culture",
					detail: "Organise and run the company Haskell book club.",
				},
			],
		},
		{
			company: "Nubank",
			title: "Senior Software Engineer",
			start: "2019-07",
			end: "2022-04",
			location: "São Paulo, Brazil",
			summary:
				"Engineer on the lending team, developing and leading features to scale the product. " +
				"Built core services across the lending infrastructure: account management, " +
				"renegotiation, issuance, payments, risk management and dynamic underwriting.",
			highlights: [
				{
					area: "Backend",
					detail:
						"Microservices in Clojure with Kafka, Datomic, Kubernetes, Tekton, GraphQL and AWS; " +
						"contributed to Nubank's shared Clojure libraries.",
				},
				{
					area: "Ops",
					detail:
						"Monitoring, debugging, right-sizing and alerting with Splunk, Prometheus and Grafana. " +
						"Defined the team's stability index metrics.",
				},
				{
					area: "Mobile",
					detail: "Back-end driven architecture for Flutter and React Native clients over GraphQL.",
				},
				{
					area: "Web",
					detail: "Internal backoffice tooling in ClojureScript, Pathom, Fulcro and TypeScript.",
				},
				{
					area: "Data",
					detail: "Monitoring dashboards and KPIs with Looker, Databricks and BigQuery.",
				},
				{
					area: "Leadership",
					detail:
						"Led projects using customer data for real-time risk analysis: drove the architecture " +
						"decisions, wrote the tech assessments and set expectations with stakeholders.",
				},
			],
		},
		{
			company: "Catho",
			title: "Software Engineer",
			start: "2018-05",
			end: "2019-06",
			location: "Barueri, Brazil",
			summary:
				"Billing solutions: integrated new acquirer banks to improve charge conversion, and " +
				"modernised the legacy system behind it.",
			highlights: [
				{
					area: "Backend",
					detail: "Features for a monolith in PHP and Java, with RabbitMQ, Jenkins and JavaScript.",
				},
			],
		},
		{
			company: "Accenture",
			title: "Software Engineer",
			start: "2017-11",
			end: "2018-05",
			location: "São Paulo, Brazil",
			summary:
				"Advanced technology and architecture team, building high-availability fraud detection " +
				"systems on serverless infrastructure with AI techniques.",
			highlights: [
				{
					area: "Backend",
					detail:
						"Microservices on AWS serverless: DynamoDB, Lambda, SQS, SNS, CloudWatch and API Gateway, in Java.",
				},
			],
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
	skills: [
		// Not "Languages": the spoken-language section below already owns that word.
		{ label: "Programming", items: ["Haskell", "Clojure", "Elm", "Ruby", "TypeScript"] },
		{ label: "Data", items: ["PostgreSQL", "MySQL", "Datomic", "Kafka"] },
		{ label: "Infrastructure", items: ["AWS", "Kubernetes", "GraphQL"] },
		{
			label: "Observability",
			items: ["Datadog", "New Relic", "Prometheus", "Grafana", "Splunk"],
		},
	],
	languages: [
		{ language: "Portuguese", level: "Native" },
		{ language: "English", level: "Professional working proficiency" },
	],
};
