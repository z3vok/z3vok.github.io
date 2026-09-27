---
title: 'An Authorized Security Assessment: From Scope to a Verified Fix'
date: '2026-09-24 12:08:00'
slug: authorized-assessment-evidence-to-retest
permalink: writing/authorized-assessment-evidence-to-retest/
lang: en
topic: Assessment methods
summary: 'A complete assessment workflow using a synthetic document service: scope, trust boundaries, test controls, evidence, remediation and retesting.'
format_label: Method guide
privacy_reviewed: true
archived: false
featured_rank: 8
content_status: Editorial draft
source_checked: '2026-09-24'
---

An assessment becomes useful when another person can act on its findings and later determine whether the problem is fixed. A directory of scanner output does not establish that chain. Neither does a striking screenshot with no account context, affected build or record of what changed.

This guide proposes a workflow for an authorized assessment of a fictional document service. It includes a web interface, an API, a background export worker and object storage. All records, accounts and identifiers are synthetic. The examples are a test design, not a report of an executed engagement.

NIST SP 800-115 connects planning and technical testing with findings analysis and mitigation. Published in 2008, it remains useful as a process reference, but its overview should not be mistaken for a current catalogue of every cloud or AI testing technique. The implementation details below are a proposed application of that process to a small service. [NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final)

## 1. Make the scope executable

Start with a written inventory of permitted systems, test identities, time windows and data handling. Translate it into the actual tooling configuration. A hostname alone is insufficient if the application redirects to a separately operated identity provider, exports through a third-party service or follows user-provided URLs.

For this fictional engagement, the scope record might contain:

```yaml
engagement: document-lab
application: https://documents.example.com
identities: [tenant_a_reader, tenant_a_exporter, tenant_a_owner, tenant_b_reader]
data: synthetic fixtures only
permitted_actions: [browse, read, create_test_document, export_test_document]
excluded_actions: [bulk_delete, payment, external_email]
stop_conditions: [unexpected_real_data, elevated_error_rate, scope_uncertainty]
evidence_retention_days: 14
```

These are example values, not universal defaults. An owner needs to agree on the action list and stop conditions. The plan should identify who can pause the test and who can restore a fixture. A lower-impact read test can still expose private records; impact is not determined only by the HTTP method.

ZAP contexts group URLs, usually by application, and their regular expressions must match complete URLs. Check both a permitted URL and a similar excluded URL against the configuration before using the tool. A context is a tool boundary; it does not confer permission to test. [ZAP context documentation](https://www.zaproxy.org/docs/desktop/start/features/contexts/)

## 2. Draw the authority path

For each operation, record the acting identity, resource, decision point and eventual effect. In the document service, the useful sequence is:

```text
browser identity → API policy → export job → worker identity → stored file → download
```

A browser session and a worker credential are different principals. The API may correctly reject unauthorized reads while an export job accepts a document identifier without preserving the initiating tenant. Alternatively, the export may be correct but its download URL may outlive the intended access grant. These are distinct hypotheses, not findings.

Build an operation inventory from routes, observed traffic and relevant source code. Include asynchronous work, administration, old API versions and cached responses. Mark endpoints that could not be reached or authenticated. An untested route should remain visible in the coverage record rather than disappearing from the final report.

## 3. Turn hypotheses into a test matrix

OWASP recommends denying access by default and checking permissions on every request. Its authorization guidance also calls for tests of the authorization logic. For the document service, translate that into explicit expected decisions before collecting results. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

| Actor and operation | Expected policy | Independent observation |
| --- | --- | --- |
| A reader reads an A document | Allow | Known synthetic document returned |
| A reader reads a B document | Deny | No B content in response or generated artifact |
| An A exporter with an explicit export grant submits an A export | Allow | Correct tenant and initiating actor on job |
| A reader names a B document in an export | Deny | No foreign document read or export; correlate read IDs, artifact ownership and marker checks |
| A reader repeats a previously permitted action after revocation | Deny according to the declared revocation policy | Effective policy version and actual result |
| No valid session reads a document | Deny | No private content and a recorded authentication failure |

Do not infer an authorization defect from a changed status code alone. A `200` response can be a generic envelope containing an error; a `403` response can coexist with an incorrectly queued background job. Inspect the operation's actual effect. Conversely, an absent output might indicate a failed worker rather than a successful security decision.

Retain an allowed control alongside each denial test. If the valid request also fails, the setup cannot distinguish working authorization from a broken application. For asynchronous cases, define a bounded observation window and record queue or worker failures separately from policy denials.

## 4. Collect enough evidence to explain one failure

If a hypothesis is confirmed, stop expanding its impact once the agreed proof is sufficient. A single synthetic cross-tenant marker can establish the boundary violation without enumerating unrelated records.

A compact evidence record should include:

```text
case_id, build_digest, policy_version, UTC_start, UTC_end
actor_fixture, resource_fixture, expected_decision
request_artifact, response_artifact, effect_artifact
observation_status, alternative_explanations, reviewer
```

Record the tool version and configuration alongside the artifact. Preserve a restricted original and a redacted working copy when necessary. Hashes can reveal later changes to a file, but a hash does not prove that the acquisition was complete or that the investigator interpreted it correctly. Document clock offsets, missing telemetry and collection gaps directly.

For the export case, correlate the request identifier with the job identifier and output object. Avoid relying on a screenshot of the UI alone. If correlation is unavailable, describe the weaker inference and propose instrumentation instead of claiming a complete execution trace.

## 5. Report the mechanism and the repair

A finding should explain the failed rule, the reachable code or configuration path, the observed effect and the conditions required. Use the synthetic fixture to make reproduction compact. Keep confirmed scope separate from plausible additional exposure.

For example, the proposed finding title is “Export worker does not enforce the initiating tenant.” The repair discussion should examine where authenticated tenant context originates, how the job carries it, and where the worker validates access before reading or writing an artifact. “Sanitize input” does not identify the missing authorization decision.

The OWASP Web Security Testing Guide separates audiences and recommends reporting the assessment scope, limitations and findings in a form stakeholders can use. Its reporting chapter is a reference for organizing the deliverable, not evidence that a particular system was tested. The linked chapter is the living edition checked on the date above. [WSTG reporting structure](https://wstg.owasp.org/latest/5-Reporting/01-Reporting_Structure/)

## 6. Retest the boundary, then close the engagement

After a patch, rerun the original failing case, the allowed control and adjacent cases sharing the same policy decision. Check both new jobs and previously queued work if the fix changes authorization timing. Recheck retrieval of existing export artifacts if their access rules differ from creation rules.

Record the exact fixed build and preserve the original finding as historical evidence. Use precise closure states: fixed in the tested build, mitigated by a temporary control, not reproduced, or not retested. A test that times out is not a successful fix verification.

Finally remove agreed test artifacts, revoke temporary accounts and confirm the evidence retention arrangement. The useful outcome is a small set of explained risks with verifiable repairs and a visible list of remaining coverage gaps. That makes the next assessment cumulative: it can test what changed instead of reconstructing what the previous one meant.
