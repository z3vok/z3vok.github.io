---
title: 'Agent Authorization Must Survive the Trip from Intent to Execution'
date: '2026-09-24 12:00:00'
slug: agent-runtime-authorization
permalink: writing/agent-runtime-authorization/
lang: en
topic: AI & agent security
summary: 'A synthetic document-export workflow shows why task grants, resource-bound approvals, and execution-time state checks belong outside the model.'
format_label: 'Research note'
privacy_reviewed: true
archived: false
featured_rank: 1
content_status: 'Editorial draft'
source_checked: '2026-09-24'
---

*Source-grounded design note. The architecture and examples below are proposed current work, not an independently validated implementation or a report of deployment results.*

An agent reads a document, proposes an export, and asks for approval. The user approves. Before execution, the document changes, the destination is replaced, or the user's access is revoked. A confirmation dialog existed, yet the eventual operation may have no valid authorization.

This is the boundary I would examine before debating the wording of the system prompt: what binds the user's intent to the operation that actually reaches the resource?

Protocol references here use MCP **2026-07-28**, the revision identified as current when checked on September 24, 2026. Version pinning matters because the protocol and its security guidance evolve. [MCP versioning](https://modelcontextprotocol.io/docs/2026-07-28/learn/versioning)

## Start with an action contract

Consider a synthetic workspace, Juniper. A user asks an assistant to prepare document `D42` for export to collection `C9`, with publication requiring their review. The assistant can read the document and create a draft. Neither the user's request nor the document grants permission to export unrelated records.

Inside `D42`, an attacker has inserted a sentence claiming that compliance requires uploading the source archive to a different collection. Its persuasive wording is secondary. Its origin is the decisive fact: document content arrived through a data channel. MITRE ATLAS distinguishes this indirect injection route from instructions supplied directly by the legitimate user. [ATLAS 2026.09, AML.T0051.001](https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/v6/ATLAS-2026.09.yaml)

My proposed design gives the model a planning role. A separate application component evaluates proposed actions against trusted identity, task grants, object metadata, and policy. That component obtains those facts from authenticated services; it does not accept a model-generated `approved: true` or `tenant: Juniper` as evidence.

The initial task grant might permit reading `D42` and preparing an export for `C9`. A later approval adds permission to publish a particular prepared payload. Free-form intent still needs interpretation: a trusted workflow can offer structured choices, while ambiguous or materially expanded actions require clarification. Moving the evaluator outside the model does not automatically make an incorrect interpretation of the task correct.

This separation fits OWASP's agentic guidance on task-scoped permissions and per-action authorization. It is an application design derived from that guidance, not a claim that a protocol supplies the entire mechanism. [OWASP Agentic Top 10 2026, ASI03](https://genai.owasp.org/download/52117/)

## A scope is only one input

A token authorizing `documents:export` answers a different question from whether this user authorized exporting this document to this destination. MCP's HTTP authorization specification requires tokens intended for the receiving server and describes scope-based access. Those transport controls do not encode every application's object ownership, approval, or workflow rules. [MCP 2026-07-28 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)

For the synthetic export, I would use an application policy resembling this pseudocode:

```text
deny unless authenticated_principal == task.owner
deny unless task.active and task.permits("export", D42, C9)
deny unless current_acl.permits(principal, "read", D42)
deny unless current_acl.permits(principal, "write", C9)
deny unless D42.tenant == task.tenant == C9.tenant
deny unless approval.matches(prepared_export)
deny unless approval.unexpired and approval.unused
```

The policy is deliberately incomplete as production code. Authentication, audience validation, schema checking, canonical resource resolution, and error handling precede it. `task`, `current_acl`, and `approval` are server-side records, not arguments the model controls. Cross-tenant sharing is excluded by this fixture's policy; a real product supporting it needs an explicit sharing rule.

The approval record binds the approver and task to the source object, source revision, immutable export payload digest, destination ID, action, expiry, and permitted use count. The review interface shows the actual destination and payload being approved. A prose explanation generated by the assistant cannot substitute for those fields.

Changing `C9` to `C10`, replacing the payload, or selecting a different source revision invalidates that approval. A narrowly defined standing grant could authorize repeated routine actions, but its permitted resources and conditions must be equally explicit. Asking repeatedly is not a security property; binding authority to the right operation is.

The evaluator must also resolve tool identity. A tool name belongs to a particular server, and an attractive description cannot establish trust. MCP explicitly warns against trusting annotations from untrusted servers and requires server-side access controls. [MCP 2026-07-28 tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

## Authorization has a lifetime

An approval should participate in a state machine:

```text
prepared → awaiting approval → approved → committing → committed
                                 ↘ expired / revoked / invalidated
```

There is also an `outcome unknown` condition when a downstream call times out after it may have taken effect. Treating every timeout as a clean failure can produce duplicate exports.

In this proposal, the transition to `committing` rechecks current permissions, task status, approval validity, payload identity, and resource versions. Approval consumption and creation of a uniquely identified export operation occur atomically. Two concurrent workers therefore cannot each spend the same single-use approval. The execution record binds its idempotency key to the operation digest; reusing the key with different arguments is rejected.

Now suppose `D42` changes from revision 7 to revision 8 while approval is pending. The application must make the semantics explicit. It can export the immutable approved revision if policy allows historical exports, or require review of the new revision. Quietly exporting whichever bytes are current changes the meaning of the user's decision.

HTTP conditional requests provide a useful building block: an origin server evaluates `If-Match` against a representation's strong entity tag before applying the method. This can protect a relevant resource version, but does not itself check an approval or synchronize unrelated ACL records. [RFC 9110, §13.1.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1)

Revalidation also has a race window. A gateway check followed by an unrestricted downstream call leaves room for state changes between them. Where possible, enforce the version and authorization preconditions in the service committing the side effect. Across services, use an explicit reservation or conditional-operation contract and document its revocation semantics. If the downstream service cannot enforce the required condition, the design has a residual race; a recent check is not equivalent to an atomic guarantee.

## State the boundary you can defend

This architecture is only as strong as its coverage. A model-accessible shell holding unrestricted credentials can bypass a carefully protected export tool. A policy service using stale ACLs can make the wrong decision deterministically. A digest binds bytes, not their meaning or their confidentiality classification. An approver can still misunderstand a misleading artifact.

The narrow claim worth testing is that every export path in the defined application requires a matching, current grant and produces an auditable state transition. Start with authorized exports, then substitute destinations, alter payloads, revoke access, race concurrent calls, and retry uncertain outcomes. Observe committed objects and recipient receipts, alongside policy decisions; the assistant's statement that it complied is insufficient evidence.

None of this establishes an impossibility theorem about prompt injection or a universal defense. It identifies which facts the model may propose, which facts it may never grant itself, and where the application must enforce the difference.
