---
title: 'Persistence Investigation: Reconstructing What Survived and Why'
date: '2026-09-24 12:00:00'
slug: persistence-investigation-forensic-reconstruction
permalink: writing/persistence-investigation-forensic-reconstruction/
lang: en
topic: Networks & forensics
summary: 'Connect Windows and Linux startup configuration to execution evidence, provenance, and a defensible recovery decision.'
format_label: 'Method guide'
privacy_reviewed: true
archived: false
featured_rank: 7
content_status: 'Editorial draft'
source_checked: '2026-09-24'
---

> Source review: primary documentation checked on 24 September 2026. The timeline is fictional. Commands are proposed read-only inspection examples, not a record of an investigation performed here.

A suspicious startup entry creates several questions at once. What will activate it? Under whose authority will it run? Did it actually execute? How did it arrive? Removing the entry answers none of those questions and can destroy a useful relationship between configuration and behavior. Persistence investigation therefore needs two parallel views: the mechanism that enables recurring execution or access, and the evidence that explains its origin and use.

The aim is a reconstruction with explicit limits. An unfamiliar service may be legitimate software. A familiar signed executable may be launched with unexpected arguments. A clean startup inventory cannot exclude a change that was removed before collection or a modification confined to a running application.

## Preserve the state that answers the question

Begin with the incident’s containment needs and the data most likely to disappear. NIST’s forensic guidance prioritizes acquisition using likely evidentiary value, volatility, and collection effort. Process state and active connections may vanish on shutdown; disk logs can also be overwritten while the machine continues running. Document collection order, tools, time, access identity, and unavoidable changes. [NIST SP 800-86](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-86.pdf).

Read-only inspection is not a guarantee of zero forensic footprint. Launching an inspection utility creates processes and can produce audit records. A compromised operating system may also return misleading results. Preserve original exports and collection metadata separately from working copies, calculate integrity hashes for acquired artifacts, and state whether conclusions depend on live host output or independently retained evidence.

For each candidate, build a small record containing the activation mechanism, executable or script path, execution identity, arguments, configuration origin, ownership, current state, first observed time, and related changes. Avoid treating a filename or creation timestamp as identity. Preserve the relevant bytes and compare them with a known deployment artifact where possible.

| Mechanism under review | Configuration evidence | Behavioral corroboration |
|---|---|---|
| Windows scheduled task | Task definition, action, trigger, principal, permissions | Creation record plus a matching execution record |
| Windows service or logon startup | Service configuration or startup entry; referenced image and arguments | Process ancestry and expected boot or logon context |
| WMI event subscription | Filter, consumer, and their binding | Registration telemetry and execution associated with its trigger |
| Linux service or timer | Unit file, drop-ins, activation relationship, execution user | Manager state and journal records for the relevant boot |
| Recurring job or account access | Scheduler configuration or authorized-access metadata | Authentication or job records within the scoped interval |

This table is an investigation model, not a claim that every system produces every record.

## Windows: inventory does not establish execution

Microsoft Autoruns covers multiple autostart locations, including logon entries, services, scheduled tasks, and WMI entries. Use its inventory to retain the location and referenced image, then review other relevant user profiles. During acquisition, preserve the full view before applying display filters. Do not disable entries as part of collection. Its optional external reputation and file-submission features are separate actions; a local inventory does not require uploading a suspicious file. [Microsoft’s Autoruns documentation](https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns).

Security event **4698** records creation of a scheduled task. Its subject identifies the account requesting creation, and its task content contains the definition. Collection requires successful Audit Other Object Access Events auditing and retained Security logs. The event documents registration, not execution or malicious intent. Later Windows versions add fields that can help identify the creating process, so preserve the event version and original XML rather than only rendered text. [Microsoft’s 4698 reference](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4698).

Where Sysmon was already configured, events **12–14** describe registry creation/deletion, value changes, and renames. Events **19–21** describe WMI filter, consumer, and binding registration. These are configuration observations to correlate with process evidence, not verdicts. Coverage depends on collection and filtering; installing a sensor now cannot reconstruct an earlier unrecorded change. [Microsoft’s Sysmon documentation](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon).

## Linux: compare installed, loaded, and observed state

On a Linux host using systemd, inspect both installed unit files and loaded state. The proposed commands below require access to the system manager and permission to read the selected configuration. `report-worker.service` is a fictional candidate; substitute an already identified, in-scope unit.

```sh
systemctl --no-pager list-unit-files --type=service,timer
systemctl --no-pager list-timers --all
systemctl --no-pager show report-worker.service \
  --property=Id,FragmentPath,DropInPaths,ExecStart,User,ActiveState
systemctl --no-pager cat report-worker.service
```

`list-unit-files` describes installed unit files and enablement, while `list-timers` concerns timer units currently in memory. `cat` shows backing files and drop-ins on disk; those can differ from the manager’s loaded understanding if files changed without a reload. Preserve that discrepancy instead of issuing a reload to make the outputs agree. Enabled state and active state are also distinct. System-manager results do not exhaust user-manager scope; inspect relevant user contexts separately. [Official systemctl manual source](https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml).

Use the journal to locate observations within the available boot history. These examples require permission to read the relevant journal; they print records without modifying the unit.

```sh
journalctl --no-pager --list-boots
journalctl --no-pager --utc -u report-worker.service \
  --since '2026-09-24 08:50:00 UTC' \
  --until '2026-09-24 09:20:00 UTC'
```

Record which boots and intervals are actually available. Rotation, volatile storage, permissions, and remote-forwarding gaps can limit coverage. Journal verification checks internal consistency; authenticity verification additionally requires the documented sealing conditions and verification key. Neither implies that every relevant activity was logged. [Official journalctl manual source](https://raw.githubusercontent.com/systemd/systemd/main/man/journalctl.xml).

## Reconstruct a sequence, then challenge its explanation

Consider a synthetic case involving one Windows server and one Linux worker. All times below are normalized to UTC; the investigator retains each original timestamp and its clock-offset estimate.

| Time | Fictional observation | Supported inference |
|---|---|---|
| 09:00 | Deployment system records a job under a shared automation identity | The job is a candidate delivery source |
| 09:02 | Windows 4698 contains a previously unapproved task definition | That identity requested task registration |
| 09:03 | Linux unit content differs from the approved release bundle | Configuration drift exists |
| 09:05 | Endpoint and journal records match the referenced programs | The configured programs executed |
| 09:12 | Archived deployment bundle contains both unexpected definitions | One delivery artifact explains both changes |

The combined evidence supports deployment-origin persistence changes. It does not, by itself, distinguish a compromised pipeline from an unauthorized operator action or a packaging mistake. Preserve job provenance, approval records, and artifact history to resolve that branch. The shared account name is not attribution to a particular person.

Scope the review outward through the same delivery artifact and administrative identity, then examine affected systems for independent mechanisms. A match on the task name alone is too narrow: another host may reference the same program through a service, timer, or different label.

Recovery follows the established cause. Remove unauthorized configuration through the approved recovery process, restore trusted artifacts, and repair the permission or deployment control that allowed the change. Where host integrity cannot be established, rebuilding from a trusted source may provide a stronger basis for recovery. Validate expected activation paths and business functions afterward, and monitor for recurrence. Close with what was removed, what enabled it, which systems were examined, and which historical questions remain unanswered.
