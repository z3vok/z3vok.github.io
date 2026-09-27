---
title: 'Security Boundaries, 2018–2026: What Changed and What Repeated'
date: '2026-09-24 12:09:00'
slug: security-boundaries-2018-2026-retrospective
permalink: writing/security-boundaries-2018-2026-retrospective/
lang: en
topic: Security research
summary: 'A technical retrospective connecting speculative execution, identity, dependency trust and agent authorization through the boundaries each system assumes.'
format_label: Retrospective
privacy_reviewed: true
archived: false
featured_rank: 9
content_status: Editorial draft
source_checked: '2026-09-24'
---

A useful history of security should explain why a previous assumption stopped being reliable. Listing famous vulnerability names by year does little to help with the next system. The cases below offer a narrower lens: what was treated as trusted, which component enforced that belief, and what evidence exposed the mismatch?

This retrospective was written in September 2026. It is a selection of public developments between 2018 and 2026, not a complete history or a claim that the author investigated each event when it happened. This article is dated 2026; the years below identify public developments.

## 2018: Correct program behavior was not the entire observation surface

The original Spectre paper, submitted in January 2018, showed how speculative execution could produce measurable side effects from operations absent from the program's correct architectural execution. The visible instruction result and the information available through a side channel were different things. The paper identified consequences for security assumptions used by several software isolation mechanisms. [Kocher et al., Spectre Attacks](https://arxiv.org/abs/1801.01203)

The lesson I draw is methodological. Before stating that a boundary holds, define what an observer can measure. A functional test that checks returned values asks a different question from a test of timing or shared-resource effects. Neither test subsumes the other.

For a modern service, the corresponding review question is not “does this look like Spectre?” It is “what observations did the model of confidentiality leave out?” Response size, cache behavior and different error paths deserve separate consideration when they could reveal information. This is a comparison of reasoning methods, not a claim that all such observations share a hardware cause.

## 2020: A network location was not enough authority

NIST SP 800-207 formalized a zero trust architecture in which trust is not granted solely because an account or asset sits inside a network boundary or belongs to the organization. Its emphasis is on resources, users and the decisions governing access. The document was published in August 2020. [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final)

A practical consequence is to separate reachability from permission. A successful connection to an internal service demonstrates a route and some transport behavior. It does not establish whether a particular principal may read a particular record. Likewise, a blocked port is evidence about one path, not a complete identity policy.

An assessment can reflect that distinction in its artifact design. Record the identity, resource and intended operation alongside the network path. Otherwise, a diagram of segments risks hiding overbroad service credentials that cross those segments legitimately.

## 2021: Observability code was part of the attack surface

Apache's advisory for CVE-2021-44228 describes attacker-controlled log input reaching JNDI lookup behavior in affected `log4j-core` versions. It explicitly distinguishes the core component from applications using only `log4j-api`. Later related advisories also show why a historical initial fix should not be presented as a current upgrade recommendation. [Apache Logging Services security advisories](https://logging.apache.org/security.html)

The important shift is in where to look. Logging, tracing and diagnostics process data supplied elsewhere in the application. Calling a component “observability” says what it is for, not how it interprets its input or what privileges it has.

A useful dependency review therefore follows data to interpreters, including interpreters behind apparently passive features. It records the deployed component and configuration rather than treating a product name found in a repository as sufficient proof of exposure. That distinction also prevents the opposite error: overlooking a reachable dependency because it is several layers below the application manifest.

## 2024: The release artifact was a separate trust boundary

Andres Freund's original xz disclosure described differences between the upstream repository and distributed release tarballs, including material present in the 5.6.0 and 5.6.1 tarballs. His account connected abnormal runtime symptoms with investigation of the build and release process. The compromised artifact could not be understood solely by reading a convenient source snapshot. [Original xz disclosure, March 29, 2024](https://www.openwall.com/lists/oss-security/2024/03/29/4)

The lesson for evidence collection is to name the object being trusted. A source commit, a signed tag, a release archive, a built package and a deployed binary are related objects, not interchangeable ones. Recording one identifier does not automatically account for every transformation between them.

This suggests a concrete review habit: keep the artifact digest and build provenance with the source reference. Where reproduction is possible, compare the built outputs under declared conditions. Where it is not, document which part of the chain depends on external attestations. “Open source” describes source availability, not the result of that verification work.

## 2024 also broadened the ownership question

NIST CSF 2.0 added Govern to Identify, Protect, Detect, Respond and Recover. Its February 2024 release extended the framework's explicit audience and emphasized governance and supply-chain risk. Older five-function summaries therefore describe an earlier framework version. [NIST CSF 2.0 release](https://www.nist.gov/news-events/news/2024/02/nist-releases-version-20-landmark-cybersecurity-framework)

For an engineer, governance can be made concrete: who owns a risk, who can accept an exception, when does that exception expire, and what evidence would close it? A vulnerability ticket with no accountable owner can remain open despite an excellent technical explanation. The failure is then partly in the decision process, not only in the code.

## 2025: A framework convenience could carry a critical policy

Vercel's postmortem on CVE-2025-29927 described a Next.js middleware bypass and the response to it. The security significance depends on what an application entrusted to middleware and on the deployment involved. A framework-level defect should not be expanded into a claim about every site using the framework. [Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

The question to carry forward is where the final authorization decision occurs. Review middleware, handlers, background workers and storage paths as a connected system. If a decision can be skipped on an alternate route, correctness on the usual route is insufficient evidence. The important property is coverage of the effect-producing operation, not the number of checks in a diagram.

## 2026: Agent security makes authority transfers explicit

OWASP's Agentic Top 10 2026 edition was published in December 2025 and forms part of its wider Agentic Security Initiative. It provides a vocabulary for reviewing systems where model output can cause tools to act. Its existence is evidence of an active area of security work, not a guarantee that any named framework solves it. [OWASP Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)

The research question I would prioritize is specific: when a model proposes a tool action, what independent mechanism binds the action to the user's permission? Useful experiments vary the requested resource, tool arguments, retrieved text and timing of approval. They observe the actual tool effect, not just the model's explanation.

This connects to older work without reducing agent security to a renamed web vulnerability. Models introduce probabilistic behavior and untrusted language into action selection. The underlying need to identify principals, preserve provenance and enforce authority at a boundary remains recognizable. Both parts matter when designing an evaluation.

## A reading method for the next advisory

For each new paper or advisory, keep five fields: the claimed invariant, the attacker-controlled input, the interpreter or decision point, the observed effect, and the conditions that limit the result. Add a separate field for your own proposed test.

That small discipline makes historical reading useful. Spectre changes the observation model; Log4j widens the interpreter search; xz separates source from release artifacts; agent systems require closer attention to delegated authority. A good next article can investigate one such boundary carefully, with versioned evidence and a bounded conclusion. It does not need to claim that every previous year was a continuous personal research campaign.
