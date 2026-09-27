---
title: 'From Source to Sink to Policy: A Practical Audit Workflow with Semgrep, CodeQL, and ZAP'
date: '2026-09-24 12:00:00'
slug: source-to-sink-auditing-semgrep-codeql-zap
permalink: writing/source-to-sink-auditing-semgrep-codeql-zap/
lang: en
topic: Code auditing
summary: 'A practical multi-language audit method that connects static data flow, authorization invariants, local HTTP evidence, and reproducible retesting.'
format_label: 'Method guide'
privacy_reviewed: true
archived: false
featured_rank: 3
content_status: 'Editorial draft'
source_checked: '2026-09-24'
---

**Status:** Source-grounded method guide, checked on September 24, 2026. All examples are synthetic; the proposed rules, local fixtures, and validation workflow have not been independently run.

A useful source audit produces an explanation that another engineer can challenge: a particular input reaches a particular operation, a required control is absent or ineffective, and a focused regression can distinguish the repaired behavior. Scanner output helps construct that explanation. It does not replace the application’s authorization policy or the evidence needed to close a finding.

This workflow gives three tools different jobs. Semgrep identifies locally recognizable patterns. CodeQL helps investigate longer data-flow paths. ZAP supplies an HTTP observation layer for a disposable local deployment. The common unit of work is a reviewable hypothesis, such as “a caller-supplied document identifier reaches a read operation without the tenant restriction required by this route.”

## Start with the operation and its authority

Before scanning, choose one operation and write its invariant. For a synthetic document service, reading a private document requires an authenticated actor, permission to read documents, and membership in the document’s tenant. A valid identifier or a successful login satisfies only part of that contract. OWASP recommends checking permissions on every request and denying access when no rule grants it. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

Turn the contract into a route map: entry point, identity source, policy check, storage operation, and response. Include background jobs and RPC handlers if they invoke the same storage method. A gateway check may protect one caller while an internal handler remains reachable through a different identity context.

| Review concern | Java example | Go example | TypeScript example |
| --- | --- | --- | --- |
| External input | Servlet parameter | `r.URL.Query()` | `req.params` |
| Boundary crossing | Controller to service | Handler to repository | Router to service |
| Query operation to inspect | `JdbcTemplate` call | `QueryContext` call | Driver `query` call |
| Authority to trace | Validated principal | Verified actor in context | Validated session actor |

These are navigation cues, not interchangeable analysis models. Each framework may wrap its request objects, database driver, or authorization middleware. Inspect those wrappers before deciding that a familiar API name proves either exposure or safety.

## Use a small synthetic example to calibrate the claim

Consider this intentionally deficient Python fragment in a local fixture:

```python
def read_document(request, cursor):
    document_id = request.args.get("document_id")
    query = f"SELECT body FROM documents WHERE id = '{document_id}'"
    return cursor.execute(query).fetchone()
```

There are two review questions. Can request data alter the query’s syntax? Separately, which policy restricts the returned document to the caller? Replacing interpolation with parameters can address the first without answering the second.

A proposed repair sketch makes both responsibilities visible:

```python
def read_document(request, cursor, actor):
    # actor is established by server-side authentication middleware.
    require_permission(actor, "document:read")
    document_id = request.args.get("document_id")
    return cursor.execute(
        "SELECT body FROM documents WHERE tenant_id = ? AND id = ?",
        (actor.tenant_id, document_id),
    ).fetchone()
```

The placeholder form assumes a SQLite-style driver. `require_permission` represents application policy code that must be implemented and reviewed; its name is not evidence that it works. Missing identifiers and authentication errors also need explicit handling in a complete route. This fragment isolates the two boundaries rather than pretending to be a runnable service.

## Give Semgrep one precise responsibility

For this fixture, a narrow taint rule can track request values into the query argument. Semgrep’s taint mode distinguishes sources, sinks, and sanitizers. Its documentation also distinguishes ordinary intraprocedural tracking from Pro interprocedural capabilities, so the engine and analysis mode belong in the evidence record. [Semgrep taint analysis](https://docs.semgrep.dev/writing-rules/data-flow/taint-mode/overview)

```yaml
rules:
  - id: fixture-request-to-sql-text
    languages: [python]
    severity: WARNING
    message: Review request data in SQL text.
    mode: taint
    pattern-sources:
      - pattern: request.args.get(...)
        exact: true
    pattern-sinks:
      - patterns:
          - pattern: $CURSOR.execute($QUERY, ...)
          - focus-metavariable: $QUERY
```

Focusing on the query argument is deliberate. Values supplied through a separate binding argument should not become SQL-text findings simply because the call contains untrusted data. The rule is still specific to the fixture’s source shape and call pattern; it does not cover every Python framework or database interface.

Create positive and negative examples beside the rule, including direct interpolation, a constant query with bound values, and a helper-function variant. Record an unsupported helper variant as a known coverage gap. Semgrep supports `ruleid` and `ok` annotations for expected findings and expected non-findings, with `--test` for evaluating those expectations. A custom rule should demonstrate both before it becomes a blocking check. [Semgrep rule testing](https://docs.semgrep.dev/writing-rules/testing-rules)

## Use CodeQL where the path needs explanation

Move to CodeQL when the input crosses service objects, helpers, or library abstractions that deserve a longer trace. Its documentation distinguishes local from global data flow and distinguishes value-preserving flow from taint tracking. A string transformation can change a value while preserving its untrusted influence. [CodeQL data-flow analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)

Start with the relevant language’s existing query and inspect each edge of a reported path. At a custom wrapper, determine what reaches the underlying call. At a supposed sanitizer, ask which grammar it protects. At a policy guard, check whether it governs this operation for this actor and object. A function called `validate` may only enforce length or syntax.

For Java, Go, and TypeScript services, preserve separate extraction and query configurations. Do not assume a path crosses a network call simply because both services are in one repository. Correlate those boundaries manually using the API contract and identity propagation. Keep database-creation diagnostics as well as findings: an unextracted component is a coverage gap, not a clean result. The CodeQL CLI analysis workflow can emit SARIF, which is useful for retaining locations and results alongside the review. [CodeQL analysis documentation](https://docs.github.com/en/code-security/tutorials/customize-code-scanning/analyze-code)

## Observe the local HTTP boundary

Use a disposable local service with two synthetic tenants and deterministic fixture records. Exercise the authorized request first, then a same-route request for the other tenant’s record, and finally a request without valid identity. This is a proposed authorization test matrix; its assertions must be explicit in the test harness.

ZAP’s baseline scan spiders the target and performs passive scanning; it does not perform active attack scanning. It can produce a JSON report and use an authentication context. That makes it useful for observing the fixture’s reachable HTTP surface, but a clean baseline is not a proof of object-level authorization. [ZAP baseline documentation](https://www.zaproxy.org/docs/docker/baseline-scan/)

Record the expected response and whether protected data or state was accessed. A denial status alone is insufficient if a handler performs a write before rejecting the request. Conversely, a successful status may return an intentionally empty collection. Evaluate behavior against the route’s contract, not an isolated status code.

## Triage and retest the explanation

For each hypothesis, retain a compact evidence packet: source commit, tool and engine versions, rule or query-pack digest, extraction diagnostics, entry point, relevant path, policy expectation, sanitized local observations, and review decision. Pin versions when running the exercise; a moving registry alias is not a reproducible rule set.

Separate a confirmed defect, a disproven hypothesis, and an unresolved coverage gap. Close a false positive with the exact control and its applicable paths. Avoid blanket suppressions for a whole sink category merely because one call is safe.

After repair, repeat the same authorized and denied cases, preserve the original fixture, and verify that the known deficient variant still fails the relevant check. That control guards against a quieter rule or a broken harness masquerading as a fix. The deliverable is a bounded explanation of what changed and what was checked, with unresolved paths still visible to the next reviewer.
