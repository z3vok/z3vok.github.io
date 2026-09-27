---
title: "Wireshark: From Packet Capture to Protocol Analysis"
title_zh: "Wireshark：从抓包基础到协议分析"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: From Basics to Analysis with Wireshark
date: 2020-05-05 19:47:00
slug: From-Basics-to-Analysis-with-Wireshark
permalink: writing/From-Basics-to-Analysis-with-Wireshark/
topic: Networks & forensics
summary: "Capture placement, filters, conversation statistics and a closer reading of ARP, IP and TCP."
summary_zh: "从抓包位置和网络设备讲起，逐步介绍捕获过滤、显示过滤、会话统计、图形与专家信息，再结合ARP、IP和TCP结构解释如何阅读通信过程。"
format_label: Technical notes
featured_rank: 5
missing_images: 10
withheld_images: 27
recovered_images: 14
tags: Notes
---
## 数据分析基础

#### 数据包分析概念

又名数据包嗅探或协议分析：

捕获和解析网络上在线传输数据的过程

目的：

为了更高的了解网络上正在发生的事情

#### 数据分析的目标

了解网络特征

查看通信主体

确认占用带宽者

识别网络高峰时段

识别攻击和恶意活动

查找不安全和滥用网络的应用

#### 数据分析软件

Tcpdump(命令行)

OmniPeek(GUI)

Wireshark(GUI)

#### 数据分析协议

| 层次 | 协议 |
| - | - |
| 应用层 | HTTP、SMTP、FTP、Telnet |
| 表示层 | ACSII、MPEG、JPEG、MIDI |
| 会话层 | NetBIOS、SAP、SDP、NWLink |
| 传输层 | TCP、UDP、SPX |
| 网络层 | IP、IPX |
| 链路层 | Ethernet、Token Ring、FDDI、AppleTalk |

#### 数据封装

协议栈中的每层协议都负责在传输数据上增加一个协议头部或者尾部，其中包含了使协议栈之间能够进行通信的额外信息。

数据封装过程将创建一个协议数据单元PDU，其中包括正在发送的网络数据，以及所有增加的头部和尾部协议信息。

数据包指的是一个完整的PDU

#### 网络硬件

集线器：工作在半双工模式，即可能同时发送和接收数据，会将数据包广播到所有集线器端口，适合用于抓包

交换机：工作在全双工模式，数据包发往目的计算机连接的端口

路由器：负责在两个或多个网络间转发数据包。

#### 流量分类

（1）广播流量
广播包被发送到一个网段上所有端口，

二层广播地址是FF:FF:FF:FF:FF:FF，

三层广播地址是主机地址为255 的 IP 地址；

路由器可以分割广播域。
（2）多播流量
多播是将单一来源数据包同时传输给多个目标的通信方式，避免了数据包的大量复制，减少了网络带宽使用率。

实施方法是通过将数据包接收者加入多播组的方式。

多播地址是224.0.0.0 ~239.255.255.255。
（3）单播流量
一台计算机直接传输到另一台计算机。

## 监听网络线路

#### 关键

数据包嗅探器放置的位置

#### 混杂模式

需要一个支持混杂模式驱动的网卡，能够查看到所有流经网络线路数据包的驱动模式

#### 集线器嗅探方式

流经集线器的所有网络数据包都会被发送到每一个集线器连接的端口

![文章配图](/assets/recovered/image-20200508130300217.png)

#### 交换机嗅探方式

端口镜像、集线器输出、使用网络分流器、ARP欺骗攻击

###### 端口镜像

设置连接的交换机的端口镜像功能，将交换机其他一个或多个端口的经过的数据包复制一份到嗅探器连接的端口上。

需要留意你所镜像端口的流量负载。

![文章配图](/assets/recovered/image-20200508131139921.png)

###### 集线器输出

在目标设备和交换机间插接一个集线器，嗅探器也接在集线器上。在交换机不支持端口镜像时可使用此方法。

![文章配图](/assets/recovered/image-20200508131251593.png)

###### 网络分流器

类型：有聚合的和非聚合

相同点：安置在两个设备间来嗅探所有流经的网络通信，

不同点：聚合的是三个端口，非聚合的是四个端口

![文章配图](/assets/recovered/image-20200508131649207.png)

###### ARP欺骗

通过发送包含虚假MAC 地址的ARP(地址解析)消息，劫持其他计算机流量的过程。

它是在交换机式网络中进行的高级技术。

###### 使用Cain & Abel 软件进行ARP 欺骗

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

此时利用Wireshark抓包分析即可

#### 路由器嗅探方式

在处理涉及多个网段与路由器的问题时，需要将嗅探器移动到不同的位置上，才获得一个完整的网络拓朴。

## Wireshark基础用法

#### 查找：Ctrl+F

![文章配图](/assets/recovered/image-20200508132521210.png)

![文章配图](/assets/recovered/image-20200508132626625.png)

| 搜索类型 | 例子 |
| - | - |
| Display filter 表达式筛选 | Not ip<br />Ip.addr==192.0.2.1 <br />Ar |
| Hex Value 十六进制值筛选 | 00:ff<br />Ff:ff <br />00?b1:f |
| String 字符串筛选 | Workstation1<br />UserB <br />Domain |

#### 标记：Ctrl+M 或右键菜单

![配图已隐去](redacted-image:withheld)

#### 时间显示格式

![配图已隐去](redacted-image:withheld)

#### 相对时间：Ctrl+T

![配图已隐去](redacted-image:withheld)

#### 捕获选项：Ctrl+K

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

#### 名字解析

###### 类型

- MAC 地址解析(Resolve MAC addresses):MAC 转换成IP
- 网络层名字解析(Resolve network-layer names):IP 转换成DNS 名称(网址)
- 传输层名字解析(Resolve transport-layer names):将端口转换成协议
- 使用外部网络名称解析器（Use external network name resolver)

###### 弊端

- 解析可能失败；
- 打开捕获文件都要重新解析一遍；
- 解析DNS 名字会产生额外流量；
- 解析过程占用系统资源。

#### 协议解析

右键点击数据包，选择Decode As，创建强制解码器，比如可以强制将80 端口解析成FTP 协议，点击Clear 可清除强制解码器。

![配图已隐去](redacted-image:withheld)

#### 过滤器

###### 过滤器BPF 语法

![文章配图](/assets/recovered/image-20200508133637658.png)

逻辑运算符：与&&或||非!

![文章配图](/assets/recovered/image-20200508133716462.png)

![文章配图](/assets/recovered/image-20200508133743486.png)

| 表达式 | 说明 |
| - | - |
| Src 192.0.2.10 && port 80 | 捕获源地址是192.0.2.10 和源端口或目标端口是80 的流量 |
| Host 198.51.100.20 | 捕获某个 IP 的计算机的流 |
| Host testserver2 | 捕获某个主机名的计算机的流量 |
| Ether host 00-1a-a0-52-e2-a0 | 捕获某个 MAC 地址的计算机的流量 |
| Src host 198.51.100.20 | 捕获来自某台计算机的流量 |
| Dst host 198.51.100.20 | 捕获前往某台计算机的流量 |
| Port 8080 | 捕获指定端口的流量 |
| !port 8080 | 捕获除指定端口以外的所有流量 |
| Dst port 80 | 捕获前往监听 HTTP 80 端口的流量 |
| icmp | 捕获指定协议的流量 |
| !ip6 | 捕获排除 IPv6 的流量 |
| Icmp[0]==3 | 捕获偏移量为0 值为3（目标不可达）的 ICMP 数据包流量 |
| Icmp[0]==8 or icmp[0]==0 | 捕获代表 echo 请求（类型8）或 echo 回复（类型0）的 ICMP 数据包流量 |
| Icmp[0:2]==0x0301 | 捕获以类型3 代码1 表示的目标不可达、主机不可达的 ICMP 数据包流量 |
| Tcp[13]&1==1 | 捕获设置了 FIN 位的 TCP 数据包 |
| Tcp[13]&2==2 | 捕获设置了 SYN 位的 TCP 数据包 |
| Tcp[13]&4==4 | 捕获设置了 RST 位的 TCP 数据包 |
| Tcp[13]&8==8 | 捕获设置了 PSH 位的 TCP 数据包 |
| Tcp[13]&16==16 | 捕获设置了 ACK 位的 TCP 数据包 |
| Tcp[13]&32==32 | 捕获设置了 URG 位的 TCP 数据包 |
| Tcp[13]==18 | 捕获 TCP SYN-ACK 数据包 |
| Ether host 00:00:00:00:00:00 | 捕获流入或流出你 MAC 地址的流量 |
| !ether host 00:00:00:00:00:00 | 捕获流入或流出你 MAC 地址以外的流量 |
| Broadcast | 捕获广播流量 |
| Udp | 捕获 UDP 流量 |

###### 显示过滤器

可以通过设置自带的过滤表达式来过滤显示数据

![配图已隐去](redacted-image:withheld)

###### 比较操作符

![文章配图](/assets/recovered/image-20200508134416613.png)

| 操作符 | 说明 |
| - | - |
| == | 等于 |
| != | 不等于 |
| > | 大于 |
| < | 小于 |
| <= | 小于或等于 |
| >= | 大于或等于 |

###### 逻辑操作符

![文章配图](/assets/recovered/image-20200508134558038.png)

| 操作符 | 说明 |
| - | - |
| And | 两个条件需同时满足 |
| Or | 其中一个条件被满足 |
| Xor | 有且仅有一个条件被满足 |
| Not | 没有条件被满足 |

###### 过滤器举例

![文章配图](/assets/recovered/image-20200508134805125.png)

| 过滤器 | 说明 |
| - | - |
| !tcp.port==3389 | 排除 RDP 流量 |
| Tcp.flags.syn==1 | 具有 SYN 标志位的 TCP 数据包 |
| Tcp.flags.rst==1 | 具有 RST 标志位的 TCP 数据包 |
| !arp | 排除 ARP 流量 |
| http | 所有 HTTP 流量 |
| Tcp.port==23\|\| tcp.port==21 | 文本管理流量（telnet 或 ftp） |
| Smtp\|\| pop \|\| imap | 文本 email 流量 |
| Ip.addr==203.0.113.1 | 指定 IP 流量 |
| Frame.len<=128 | 长度小于等于128 字节的数据包 |

## 流量分析和图形化功能

#### 网络端点

统计每个端点的地址、发送或收到的数据包的数量和字节数

![配图已隐去](redacted-image:withheld)

#### 网络会话

统计地址A 和地址B 端点间会话的发送或收到的数据包的数量和字节数。

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

#### 协议分层

可查看各种协议的分布统计情况。

![配图已隐去](redacted-image:withheld)

#### 数据包长度分析

以太网帧最大长度为1518 字节，图中较大数据包（1280~2559）常用于传输数据，较小的（40~79）则是协议控制序列，一个TCP 控制数据包大约在54 字节。

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

#### 跟踪TCP流

红色表示从源地址前往目标地址的流量，蓝色相反。最初是对WEB 根目录的GET 请求，然后是来自服务器的一个用HTTP/1.1 200 OK 表示请求成功的响应。

![配图已隐去](redacted-image:withheld)

#### 图形展示

###### 查看IO图

通过选择X 轴（数据包间隔时间）、Y 轴（数据包数量上限）来调整显示的IO 图形，图中显示每团体传输0~200 个数据包之间，且波动很大，表示是一个慢速下载过程。通过过滤器可以将不同流量以不同颜色显示IO 图形对比

![配图已隐去](redacted-image:withheld)

###### 双向时间图

基于两个端口间TCP 连接对话，确认数据包已被成功接收所需的时间，可与对话统计配合使用

![配图已隐去](redacted-image:withheld)

图中每一个点都代表了一个数据包的双向时间，单击任何一点可以在Packet List 面板中看到相应数据包；

图中显示大部分数据多在0.05s 以下，少量在0.10~0.25s 间，对于慢速下载（看网页、微博等）来说是可以接受的

![配图已隐去](redacted-image:withheld)

###### 数据流图

对于连接可视化，以及将一段时间中的数据流显示出来，配合对话统计使用，可查看两端点间的数据流。

![配图已隐去](redacted-image:withheld)

#### 专家信息

###### 数据包标记

警告信息：不正常通信中的异常数据包

- 丢失：上一段数据包丢失时
- 延收：已确认丢失的数据包，又收到了其ACK 包时
- 保活：当一个连接的保活数据包出现时
- 零窗：接收方达到窗口大小，发出一个零窗口通知时
- 乱序：当数据包被乱序接收时
- 重传：一次重传会在收到一个重复ACK 的20 毫秒内进行

注意消息：正常通信中的异常数据包

- 重传：收到重复的ACK 或重传计时器超时时
- 重复ACK：当主机没有收到下一个期望序列号的数据包时，会生成最近收到数据的重复ACK
- 零窗探查：零窗口通知包发出后，用来监视TCP 接收窗口的状态
- 保活ACK：用来响应保活数据包
- 零窗ACK：用来响应零窗口探查数据包
- 窗口已满：通知传输主机其接收者的TCP 接收窗口已满

对话消息：关于通信的基本信息

- 窗口更新：接收者发出，通知发送者TCP 接收窗口大小已被改变

###### 数据包分析

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

## 通用底层网络协议

#### 地址解析协议ARP（Address Resolution Protocol）

###### ARP头

![文章配图](/assets/recovered/image-20200508142533600.png)

###### 数据包分析

长度：8 位/字节，MAC 地址48 位，即6 字节，IP 地址32 位，即4 字节。

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

![配图已隐去](redacted-image:withheld)

###### 无偿的ARP

当IP 地址改变后，网络主机中缓存的IP 和MAC 映射就失效了，为了防止通信错误， 无偿ARP 请求被发送到网络中，强制所有收到它的设备更新ARP 映射缓存。

![配图已隐去](redacted-image:withheld)

#### IP协议

###### IP头

服务类型：优先级标志位和服务类型标志位，用来进行QoS 标识符：识别一个数据包或被分片数据包的次序，唯一 标记：标记数据包是否是一组分片数据包的一部分 分片偏移：该数据包是个分片，数据包按分片偏移值顺序重组 存活时间TTL：超过TTL 时间，数据包将被丢弃

![文章配图](/assets/recovered/image-20200508230648007.png)


###### IP分片

IP 用于解决跨越不同类型网络时可靠传输的一个特性：将一个数据流分为更小的片段。

基于第2 层数据链路协议所使用的最大传输单元MTU（Maximum Transmission Unit）的大小， 默认是1500 字节（不包含14 字节的以太网头本身），当数据包大小大于MTU 时会被分片。

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

#### 传输控制协议TCP

作用:

为数据提供可靠的端到端传输，处理数据的顺序和错误恢复，保证 数据能够到达其应到达的地方

###### TCP头

![历史配图暂缺](redacted-image:missing)

序号：表示一个TCP 片段。 

确认号：希望从另一个设备得到的下一个数据包的序号。 

紧急指针：如果设置了URG 位，紧急指针将告诉CPU 从数据包 的哪里开始读取数据。

###### TCP 端口

- 1~1023：标准端口组，特定服务会用到标准端口。 
- 1024~65535：临时端口组，操作系统会随机地选择一个源端口让某个通信单独 使用。

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

###### TCP标志

![历史配图暂缺](redacted-image:missing)

###### TCP三次握手

![历史配图暂缺](redacted-image:missing)

设置TCP 数据包序列号显示方式;

![历史配图暂缺](redacted-image:missing)
