---
title: 'The ARTEX Campaign: Evidence, Attribution, and Runtime Authority'
date: '2026-10-10 00:00:00'
slug: artex-campaign-evidence-and-runtime-authority
permalink: writing/artex-campaign-evidence-and-runtime-authority/
lang: en
topic: AI & agent security
summary: 'An evidence-led analysis of the Korean finance disclosure: what agent artifacts can establish, what defenders should measure, and where runtime authority belongs.'
format_label: Incident analysis
privacy_reviewed: true
archived: false
featured_rank: 0.5
source_checked: '2026-10-10'
---

An agent can describe a successful operation without having completed it. A system can also suffer a real compromise while leaving almost no evidence of how much reasoning an attacker delegated to a model. These are different questions, and an incident analysis needs to keep both in view.

The useful question for defenders is concrete: **which principal was allowed to perform which operation, against which resource, and what changed as a result?** Agent transcripts can help explain the decisions preceding an operation. They do not replace evidence from the service that accepted it.

This article examines the public ARTEX disclosure, then develops detection and authorization proposals from that distinction. The proposals are engineering hypotheses, not a reproduction of the campaign.

## What the public disclosure establishes

On October 7, 2026, CrowdStrike reported a campaign against South Korean financial organizations, active from late September into early October, involving data exfiltration. Its account draws on exposed attacker-controlled directories containing Claude Code session histories, ARTEX configuration, and memory files. ARTEX is described as an open-source agentic penetration-testing framework. The report reconstructs a two-server arrangement, identifies DeepSeek as the principal backend, and names GLM and Grok in additional sessions. It also identifies proxy infrastructure and requests concerning stolen-data sales. [CrowdStrike disclosure](https://www.crowdstrike.com/en-us/blog/unknown-threat-actor-uses-artex-to-target-south-korean-finance/)

CrowdStrike leaves the actor unnamed, assessing Chinese-language use and financial motivation with moderate confidence. The affected-organization count remains unconfirmed. The public account does not provide a reproducible exploit chain, a complete victim-side timeline, or a measured human-versus-agent comparison. An outside reader therefore cannot independently reconstruct every claimed outcome from the published material. [Incident details and assessment](https://www.crowdstrike.com/en-us/blog/unknown-threat-actor-uses-artex-to-target-south-korean-finance/)

There is relevant regional context, with a separate evidentiary scope. A Korean Financial Services Commission clarification posted on October 6 said that investigators had not confirmed leakage of account information directly usable for financial transactions, or transfer of leaked information to China. That is a bounded statement about what had been confirmed, not a claim that no personal information had leaked. [FSC clarification, Korean](https://fsc.go.kr/no010102/87877?curPage=1&srchBeginDt=&srchCtgry=&srchEndDt=&srchKey=&srchText=)

A separate October 6 consumer warning addressed phishing and smishing after financial-sector personal-data breaches. It said customer-fund losses through related voice phishing had not been confirmed at that point. Neither notice establishes a forensic connection to the ARTEX infrastructure, so neither should be presented as independent confirmation of this particular campaign. The distinction between personal-data exposure, transaction credentials, and actual financial loss matters. [FSC consumer warning, Korean](https://fsc.go.kr/no010101/87882)

## Read agent artifacts through an evidence ladder

An investigator should distinguish an instruction, a proposed action, an attempted action, and a verified effect. This is a general method for interpreting agent-enabled operations; the rows below are not a claim that every evidence type was published in this case.

| Evidence | What it can support | What it cannot establish alone |
| --- | --- | --- |
| Instruction or memory file | The task or context stored in that artifact | That a process loaded it, followed it, or reached a target |
| Conversation transcript | Recorded requests, responses, and proposed tool use | That an external operation occurred exactly as described |
| Executor event | A particular tool invocation or process attempt | That the target accepted the action or returned authentic data |
| Protected-service event | The identity, object, decision, and outcome recorded by that service | The full downstream disposition of returned information |
| Independently corroborated effect | A committed state change or receipt of a specific synthetic artifact | Every preceding step, or the degree of human intervention |

A successful process exit is especially easy to overread. A script may exit normally after an application returns an error. An HTTP success status may carry a login page. A model may summarize a response incorrectly. Each transition requires evidence appropriate to the claim.

![A conceptual evidence ladder connecting recorded intent, executor attempts, service decisions, and independently checked effects. The diagram separates proposed actions from verified outcomes.](/assets/artex/evidence-ladder.svg)

*An analytical model, not a recovered network trace. Stronger outcome claims require corroboration across the relevant boundary.*

For any recovered artifact, preserve the collection time, acquisition method, content digest, original bytes, and clock assumptions. Keep the source's timestamp separate from the investigator's timestamp. Attacker-controlled content may be incomplete, inaccurate, or edited; that general provenance risk is not an allegation that a particular collection was fabricated.

Attribution requires another separation. Language, software origin, infrastructure location, and operator identity are distinct attributes. A language preference cannot establish citizenship, organizational membership, or state sponsorship. A name appearing in a prompt is a lead to verify, not an identity to publish as fact.

## Separate the model, the harness, and authority

A useful technical decomposition has five parts: the operator sets a task; an orchestration harness manages context and iteration; a model proposes actions; tools attempt those actions; a protected service decides what to accept. A gateway can sit between the harness and model service. These components can have different owners, credentials, logs, and trust assumptions.

The naming of an artifact should not collapse those layers. A client-branded directory does not independently identify the provider behind every inference request. Anthropic documents gateway routing for Claude Code, while explicitly stating that routing to non-Claude models through a gateway is unsupported. That documentation explains a client/provider distinction; it does not verify an incident's routing configuration. [Claude Code gateway documentation](https://code.claude.com/docs/en/llm-gateway)

Memory is another distinct boundary. Anthropic describes `CLAUDE.md` as context supplied to the model and distinguishes it from enforced settings. A written instruction can influence behavior without becoming an access-control rule. [Claude Code memory documentation](https://code.claude.com/docs/en/memory)

The relevant design question is what the executor can actually do. If it holds a credential with broad access, a carefully worded task description does not reduce that credential's authority. If the model has an alternative shell or connector with the same access, restricting one named tool leaves another execution path. Permissions, credential placement, and operating-system isolation therefore need review together. Anthropic's security documentation likewise distinguishes permission prompts from sandbox enforcement. [Claude Code security documentation](https://code.claude.com/docs/en/security)

This decomposition also prevents an analytical mistake: treating a tool's presence as evidence that its provider was compromised, or that a particular safeguard was bypassed. Such claims need their own observations.

## Two threat models need different controls

**An external attacker operating an agent** reaches a victim through the victim's exposed interfaces. The victim generally controls its own authentication, authorization, application behavior, and telemetry. Configuring the victim's internal assistant does not constrain the attacker's remote execution environment. The defensible boundary remains the service accepting requests and releasing data.

**An enterprise agent induced to misuse its own access** is a different problem. Here, untrusted documents, messages, or tool responses may influence an agent that already has legitimate credentials. The enterprise can constrain its tool executor, task grants, and destinations. OWASP's Excessive Agency guidance identifies excessive functionality, permissions, and autonomy as causes of damaging actions, and recommends reducing those capabilities and enforcing authorization downstream. [OWASP LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

The second threat model is useful for designing defenses, but it must not be silently substituted for the first. Prompt injection, MCP misuse, and approval replay each describe specific mechanisms. They should enter an incident reconstruction only when evidence supports them. Their inclusion in a defensive test plan is a separate analytical choice.

MITRE's T1588.007 records acquisition of AI capabilities that may assist malicious activity. It does not, by itself, establish how initial access occurred or which operations were autonomous. A technique label organizes evidence; it cannot supply a missing exploit chain. [MITRE ATT&CK T1588.007](https://attack.mitre.org/techniques/T1588/007/)

## Detect behavior at the protected service

The first detection goal should be to identify unacceptable access or transfer behavior, even when the initiating client is unknown. Trying to classify requests as “AI-generated” adds a claim that usually requires evidence unavailable at the application boundary.

A practical starting point is a normalized event joining identity, resource, policy, and outcome:

```text
timestamp, request_id, authenticated_principal, tenant_id,
resolved_object_id, action, policy_version, authorization_decision,
service_outcome, returned_byte_count, destination_class
```

These are proposed fields, not a schema recovered from the affected institutions. Identity and tenant must come from validated server-side context. Resource identifiers must refer to the objects the service actually resolved. Record policy decisions separately from service outcomes: an allowed request may fail, and a nominally denied request may still reveal information through a defective alternate path.

An investigation can then ask concrete questions. Did a principal access resources outside its current entitlement? Did its distinct-object count depart from an appropriate role and workflow baseline? Did a new export path coincide with that departure? Did the service commit an export after revocation?

The following is correlation pseudocode, not a deployed detection rule:

```text
group accepted read events by verified principal and tenant
compare resource fan-out with that role's normal workflow
join requests to authoritative entitlement decisions by request_id
join suspicious windows to export-job and destination records

escalate an observed authorization violation
investigate unusual fan-out combined with a new export destination
```

The two outcomes have different confidence. Confirmed unauthorized access is a policy violation. Unusual access followed by an export is a lead: batch reporting, migrations, and incident response can produce the same shape. Evaluate those controls before setting thresholds, and retain an explanation of why the event was escalated.

There are important blind spots. A compromised account may read only resources it is entitled to read; an entitlement comparison will miss that abuse. Slow activity may stay within volume baselines. A response-size counter measures transport, not the sensitivity of its contents. Address these with narrowly justified step-up checks, data classification, destination policy, and investigation context rather than describing one correlation as complete coverage.

Network indicators should seed time-bounded retrospective searches. Before turning a hit into a block, establish its observation window, infrastructure role, and overlap with your own application events. A shared exit address alone cannot identify a person or prove a successful intrusion. Preserve the original indicator source and review expiry; avoid treating a copied list as permanent ground truth.

## Put the authorization decision where the action commits

For enterprise-operated agents, I would make an executor accept a proposal only when trusted application state grants the operation. The model may propose arguments; it may not author its own permissions. This follows the separation of policy decision and enforcement described in NIST's zero-trust architecture, applied here to an agent workflow. [NIST SP 800-207, §3](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-207.pdf)

Consider a synthetic task: export document `D42`, revision `7`, to approved destination `C9`. A server-side grant could bind:

```text
principal + task + tenant + tool identity + action
source object + source revision + prepared payload digest
destination + expiry + permitted use count + policy version
```

The fields are an application design proposal, not a universal token format. A review interface must show the actual destination and artifact. A model-generated explanation cannot substitute for those values. A bounded standing grant may cover routine operations without repeatedly interrupting the user.

Fine-grained authorization has existing protocol building blocks. RFC 9396 defines structured authorization details and requires the authorization server to make granted details available to the resource server for enforcement. It does not supply an application's complete task semantics, approval lifecycle, or concurrency control. [RFC 9396, §9](https://www.rfc-editor.org/rfc/rfc9396.html#section-9)

At execution, recheck the current entitlement, grant, destination, and artifact identity. Where possible, the service committing the side effect should enforce the relevant preconditions. A gateway check followed by an unrestricted downstream call leaves a race window. If that window cannot be eliminated, document the residual exposure instead of calling the check atomic.

Retries also need explicit semantics. Bind an idempotency key to the exact operation digest and maintain a durable operation record. A timeout after a downstream commit is an unknown outcome, not proof of failure. A retried operation should reconcile that record, rather than spend the approval again or silently change the destination. These guarantees require support across the downstream boundary; the gateway alone cannot manufacture it.

Finally, check coverage. An unrestricted shell, a second connector, or a long-lived credential may bypass the entire path. The claim worth defending is that every side-effecting path within the defined system requires a valid grant—not that the assistant usually chooses the protected path.

## Preserve evidence without collecting every conversation

Execution-time enforcement and centralized transcript collection are separate design choices. A local service can enforce a current policy and emit a compact decision receipt without sending an entire prompt, customer document, or tool response to a central store.

A useful receipt would include an operation ID, policy version, scoped principal reference, resource reference, decision, reason code, and eventual commit status. Sensitive identifiers can remain in an access-controlled local mapping. A keyed digest may support correlation without putting a raw identifier in every event, although such records remain linkable and should not be described as anonymous.

This is data minimization, not a promise of zero privacy cost. Raw evidence may still be needed for an investigation, with separate retention and access rules. A digest proves that bytes match a recorded commitment; it does not establish who produced them, whether their contents are true, or whether collecting them was appropriate.

Distributed enforcement introduces availability and freshness questions. Decide which high-risk actions fail closed if policy cannot be refreshed, how cached grants expire, and how revocation reaches the committing service. Measure the resulting latency and operational failures. There is no demonstrated “impossible triangle” here without a precise system model and proof; there are engineering trade-offs that can be stated and tested.

## Turn the argument into a falsifiable evaluation

The most useful next experiment is a controlled service with synthetic records, an ordinary agent client, and independently observed outcomes. It should test whether authority survives changes between task creation and execution. It need not recreate an intrusion or contact campaign infrastructure.

| Proposed fixture | Required observation |
| --- | --- |
| Authorized export with an unchanged grant | The intended recipient receives the expected synthetic artifact |
| Destination changed after approval | No artifact reaches the substituted destination |
| Source or prepared bytes changed | The operation follows explicit version semantics or requires fresh approval |
| Permission revoked while work is queued | Commit-time policy rejects the action under the declared revocation contract |
| Two workers spend one approval concurrently | At most the permitted number of effects occurs |
| Timeout after a successful commit, then retry | Reconciliation returns the original operation; no duplicate effect occurs |
| Untrusted retrieved text asks to widen access | Effective authority stays within the server-side grant |
| An alternate connector attempts the same operation | The same enforcement contract applies, or a coverage gap is recorded |

The authorized control is essential. Blocking every request can make a security metric look perfect while rendering the system unusable. Observe both policy decisions and actual service or recipient state; an agent's success message is not the result.

Report unauthorized committed effects, authorized completion rate, duplicate-effect rate, revocation delay, and added median and tail latency. State the denominator for each rate, including runs with missing telemetry or ambiguous outcomes. Keep model, harness, tool, policy, and service versions fixed for comparisons, then vary them deliberately.

To test a claim about AI acceleration, add a separate comparison with equivalent scope, information, tooling access, and success criteria. Count operator time, interventions, failed attempts, and total cost, alongside elapsed time. Without those controls, a busy transcript measures recorded activity rather than a causal speedup.

No results are claimed for this proposed evaluation. It defines the evidence that would make a later claim worth trusting.

## What should change in a defender's priorities

Start with the interfaces that expose sensitive objects and exports. Verify that the running service checks object ownership and task scope, and that its logs can connect a request to a decision and an effect. Use current intelligence to guide retrospective searches while preserving uncertainty about identity and infrastructure reuse.

For an internal agent deployment, inventory the executors and credentials that can cause side effects. Choose one sensitive workflow, bind its authority to specific resources and destinations, and test its failure and retry behavior. Expand the claim only when other execution paths satisfy the same contract. [Related: agent authorization from intent to execution](/writing/agent-runtime-authorization/)

The durable lesson is an evidence requirement: every claimed action should have an identifiable executor, every accepted operation should have a defensible grant, and every claimed outcome should have a corroborating effect. Those requirements remain useful as models, orchestration frameworks, and attacker tooling change.
