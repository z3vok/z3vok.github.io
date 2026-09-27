---
title: "Domain Fronting: Names, Layers and Visibility"
title_zh: "域前置的基本思路与通信层次"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Basic Idea and Principle of Domain Fronting
date: 2021-04-02 10:38:00
slug: Basic-Idea-and-Principle-of-Domain-Fronting
permalink: writing/Basic-Idea-and-Principle-of-Domain-Fronting/
topic: Networks & forensics
summary: "Separating DNS names, TLS names and HTTP routing to explain what each network observer can see."
summary_zh: "从域前置的概念出发，区分DNS、TLS名称与加密后的HTTP主机头，解释前端基础设施转发与观察者可见信息之间的差异，梳理其通信原理。"
format_label: Study notes
featured_rank: 0
missing_images: 0
withheld_images: 0
recovered_images: 0
tags: Notes
---

# 0x01 前言

本文从通信层次出发，讨论域前置的基本原理。

由此，引出了一个名词——域前置/域前端。

# 0x02 什么是域前置？

我们来看百度百科是如何解释的

>**域前置**（英语：Domain fronting），又译为域名幌子，是一种隐藏连接真实端点来规避互联网审查的技术。在[应用层](https://baike.baidu.com/item/应用层/16412033)上运作时，域前置使用户能通过[HTTPS](https://baike.baidu.com/item/HTTPS/285356)连接到被屏蔽的服务，而表面上像在与另一个完全不同的站点通信。

简言之，Domain Fronting基于HTTPS通用规避技术，也被称为域前端网络攻击技术。

这是一种审查规避技术，主要用于隐蔽通信中会被禁止的远程端点，如用来隐藏Metasploit，Cobalt Strike等团队控制服务器流量，以此来一定程度绕过检查器或防火墙检测的技术，如Amazon ,Google，Akamai 等大型厂商会提供一些域前端技术服务。

# 0x03 域前置的技术原理是什么？

需要明白域前置技术的使用场景和特点：
域前置发生在应用层，主要使用了HTTPS协议进行通信。
易于部署和使用，不需要任何特殊的网络媒介。

需要明白检测器可见的明文层（通信外层）是：
DNS请求和TLS SNI

需要明白检测器不可见的加密层（通信内层）是：
HTTP层，HTTP Host Header的域名会在HTTPS加密之下

> Host头对于检查器是不可见的，但是对于接收HTTPS请求的前端服务器是可见的

那么由此就延伸出第一个问题：如何绕过检测？
使用域前置技术，让检测器误认为是一个其他的合法地址，即在不同的通信层使用不同的域名，我们在检测器可见的明文层（明文的DNS请求和TLS SNI服务器名称指示）使用一个无害的域名(allowed.domain)进行初始化连接；我们在检测器不可见的加密层（HTTP层）在Host头中使用另一个恶意域名(evil.domain)，其中evil.domain是我们真实但隐蔽的域名，这个域名由于在HTTPS加密之下，所以对检测器而言是不可见的。

最终的执行流程是这样的：明文的DNS请求和TLS服务器名称指示（SNI）中使用无害的域名(allowed.domain)来初始化连接，而实际要连接的被禁止的域名仅在创建加密的HTTPS连接后发出，在Host头中携带了另一个C2恶意域名(evil.domain)。

那么由此就延伸出第二个问题：为什么这样做就可以绕过检测？
对于检测器而言，它很难在通信流量中判断一个域名是否使用了域前置技术，留给它的选项只能是放行和完全禁止，而事实上在通信中大部分是不会使用域前置技术，如果完全禁止，那么很有可能造成误伤，误伤则可能会带来严重的附带损害。

所以，域前置技术的核心基础设施是cdn。
