---
title: 'Active Directory Assessment Through Attack-Path Evidence'
date: '2026-09-24 12:00:00'
slug: active-directory-assessment-attack-path-evidence
permalink: writing/active-directory-assessment-attack-path-evidence/
lang: en
topic: Internal security
summary: 'A read-only approach to assessing identity control paths, Kerberos evidence, delegation, and certificate enrollment without overstating what configuration proves.'
format_label: 'Method guide'
privacy_reviewed: true
archived: false
featured_rank: 5
content_status: 'Editorial draft'
source_checked: '2026-09-24'
---

> Source review: primary documentation checked on 24 September 2026. The scenario is synthetic; commands are proposed inventory examples and were not executed for this article.

An Active Directory assessment becomes useful when it explains who can change a sensitive outcome, through which permission, and what evidence supports that conclusion. A list of privileged accounts is only one input. An apparently ordinary support group may control an application identity, while an alarming delegation setting may belong to a retired system with no remaining dependency. Both require investigation, but they warrant different claims and different remediation.

The method below treats an attack path as a sequence of control relationships to verify. It supports an authorized configuration assessment without obtaining credential material or demonstrating access as another user.

## Make each relationship falsifiable

Start with a protected outcome: administration of a domain controller, modification of a certificate template, or access to a reporting database. Work backward through the identities and objects that can influence it. For every relationship, retain the source object identifier, target identifier, relevant permission or setting, collection time, directory server, and scope of collection. Record whether the relationship comes from configuration, effective-access analysis, or observed activity.

These are different evidence classes. Group membership suggests rights that may be inherited elsewhere. An access-control entry describes a permission whose applicability still depends on the object, inheritance, and other entries. A log shows a particular event within the period retained. Combining them is an analytical step, not a property automatically supplied by a graph.

| Proposed relationship | Evidence to retain | What remains unproven |
|---|---|---|
| Support group can modify a service identity | Object ACL, applicable inheritance, nested membership, ownership | Whether the permission has been used |
| Front-end identity may delegate to a back end | Delegation configuration on the relevant accounts | Whether the application currently requires that relationship |
| Users may enroll through a sensitive template | Template configuration, enrollment permissions, issuing-CA publication | Whether resulting certificates satisfy the deployed authentication controls |
| An identity requested a service ticket | Original domain-controller event and result fields | Whether the service accepted access or performed an action |

Scope matters as much as the graph. A snapshot from one domain is not a forest-wide result. A missing edge can mean an unreadable ACL, stale replication, excluded organizational unit, or genuinely absent permission. Record those alternatives before assigning confidence.

## Keep Kerberos objects and events separate

The AS-REP is a response message, not another name for a ticket-granting ticket. In the initial Authentication Service exchange, the KDC returns a response containing a TGT and session-key information for the client. The later Ticket-Granting Service exchange uses the TGT to request a ticket for a specific service. The application exchange then presents that service ticket to the server. Treating these as one event erases the boundary between acquiring authentication material and using an application. [Microsoft’s Kerberos protocol synopsis](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-kile/b4af186e-b2ff-43f9-b18e-eedb366abf13).

This distinction also prevents a common reporting error: describing an AS-REP-related exposure as though it were evidence that a TGT had been decrypted or an application accessed. In a configuration assessment, the useful question is whether accounts require preauthentication and whether observed authentication agrees with that configuration.

On domain controllers, Security event **4768** concerns TGT issuance and some issuance failures. Its preauthentication type `0` means preauthentication was not used. Some failure conditions instead produce 4771, so a search for 4768 alone cannot describe every failed initial authentication. Collection also depends on the relevant audit policy and retained logs. [Microsoft’s 4768 reference](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4768).

Security event **4769** records a service-ticket request received by the KDC, with result information. A successful result is not evidence that the destination application authorized a business operation. Correlate it with service-side records. Both event schemas were expanded for Windows Server 2016 and later with the January 2025 security updates; use named XML fields and record OS build and event version rather than assuming one positional parser fits every controller. [Microsoft’s 4769 reference](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4769).

## Collect narrowly, then inspect the missing context

The following example requires Windows PowerShell with the ActiveDirectory module, network access to an authorized directory server, and permission to read the specified object. Replace the synthetic account and server names with approved scope values.

```powershell
Get-ADUser -Identity 'svc-reporting' -Server 'dc01.example.test' `
  -Properties DoesNotRequirePreAuth,AccountNotDelegated,TrustedForDelegation,`
              ServicePrincipalNames,MemberOf,PasswordLastSet |
  Select-Object DistinguishedName,Enabled,DoesNotRequirePreAuth,`
                AccountNotDelegated,TrustedForDelegation,`
                ServicePrincipalNames,MemberOf,PasswordLastSet
```

`Get-ADUser` retrieves only a default property set unless additional properties are requested. Explicit selection makes the collection reproducible and limits unrelated personal data. This command does not expand every nested group, calculate effective permissions, inventory computer accounts, or prove the strength of a password. `PasswordLastSet` is a timestamp, not a password-quality measurement. [Microsoft’s Get-ADUser documentation](https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-aduser?view=windowsserver2025-ps).

Delegation review then asks two questions: which service may act for a user, and who can alter that permission? Traditional constrained delegation limits the destination services available to the front end. Resource-based constrained delegation places the decision on the resource account. A narrow destination list still needs ownership review if a broadly managed account can change it. [Microsoft’s delegation overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview).

Certificate review requires a similarly complete relationship. Inspect enrollment rights, permitted certificate uses, subject-name controls, approval or signature requirements, template ownership, and publication by an issuing CA. Microsoft identifies dangerous combinations involving requester-controlled subjects, authentication-capable templates, broad enrollment, and absent issuance safeguards. One suspicious template flag alone is insufficient for a claim of domain compromise; the assessment must also establish the applicable CA, trust, mapping, and authentication conditions. [Microsoft’s certificate security assessments](https://learn.microsoft.com/en-us/defender-for-identity/security-posture-assessments/certificates).

## A synthetic finding with bounded impact

Consider a lab with a reporting application and a group called `Report-Support`. A directory export shows that the group can change the application service account. A separate export shows resource-based delegation from that application identity to the reporting back end. The application owner confirms that this relationship is still required.

The defensible finding is that support-group control extends into an identity trusted by the back end. It is not yet evidence of unauthorized database access. The reviewer checks applicable ACLs, group nesting, account status, and the back-end allow list, then asks the resource owner to confirm the intended administrative boundary. Ticket logs provide usage context, while application logs establish which operations were accepted.

Suppose the same review finds a legacy certificate template with requester-supplied subjects, but no issuing CA publishes it. Record the configuration debt and the evidence of nonpublication. Do not merge it into the active delegation finding or report a demonstrated enrollment path. If publication coverage is incomplete, retain an unresolved condition instead.

The proposed fix for the active finding is to remove unnecessary account-modification rights and assign service-identity administration to a narrowly controlled role. Closure requires a fresh permission review plus an application-owner test showing that legitimate reporting still works. Retain the before-and-after evidence, collection scope, and outstanding visibility gaps. That produces a finding someone can implement, challenge, and verify without mistaking a plausible path for a completed intrusion.
