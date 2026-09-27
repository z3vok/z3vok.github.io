---
title: "Memory Forensics: Volatility and USB Keyboard Traces"
title_zh: "内存取证：Volatility 与 USB 键盘数据"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Memory Forensics
date: 2020-01-10 19:45:00
slug: Memory-Forensics
permalink: writing/Memory-Forensics/
topic: Networks & forensics
summary: "Historical notes on volatile evidence, process and network artifacts, and USB keyboard data."
summary_zh: "围绕易失性证据的采集顺序，整理内存镜像识别、进程与网络查看、文件提取及命令历史分析，进一步结合 USB 流量与键盘扫描码脚本串联取证步骤。"
format_label: Technical notes
featured_rank: 0
missing_images: 0
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

# 内存取证

## 内存取证工具**volatility** 的使用：

> volatility -f <文件名> --profile=<配置文件> <插件> [插件参数]

````shell
使用imageinfo插件来猜测dump文件的profile值：WinXPSP2x86

root@kali:# volatility -f mem.vmem imageinfo

grep是用来搜索特定的字符串，bgrep是用来搜索非文本数据模式和hexdump

volatility –info    用于查看volatility已经添加的profile和插件信息

Volatility -f file.raw imageinfo     判断当前镜像信息，或kdbgscan，仅适合windows内存镜像
````

>常见插件：

````shell
Volatility -f file.raw –profile=WinXPSP2x86 notepad      查看当前展示的notepad文本

Volatility -f file.raw –profile=WinXPSP2x86 pslist    列出运行的进程，如果Exit所在的一列显示了日期时间，则表明该进程已经结束了

Hivelist   列出缓存在内存中的注册表

Filescan  扫描内存中的文件

Dumpfiles      将内存中的缓存文件导出

Volatility -f file.raw –profile=WinXPSP2x86 Memdump -p 进程号 -D ./（导出目录）       将某个进程信息导出/根据pid dump出指定进程

Foremost 2888.dmp    分析dump出的内存文件

Svcscan  扫描windows的服务

Connscan 查看网络连接

Cmdscan 查看命令行上的操作
````

## 取证方法建议

> 收集数据的顺序很重要。必须首先收集易消失的数据。易失性数据是系统关闭时可能丢失的任何数据，例如连接到仍然在RAM中注册的网站。必须将先从最不稳定的证据中开始收集数据：

````
（1）缓存

（2）路由表，进程表，内存

（3）临时系统文件

（4）硬盘

（5）远程日志，监控数据

（6）物理网络配置，网络拓扑

（7）媒体文件（CD，DVD）
````

## 常见payload：

1.查看系统信息
`volatility -f mem.raw imageinfo`

在Suggested Profiles中找到操作系统的信息

2.查看运行程序列表
`volatility -f mem.raw --profile=Win7SP1x64 pslist`

部分常见进程分析：

wscntfy.exe，Windows系统关键进程，负责检查计算机的安全状态，包括防火墙、病毒防护软件、自动更新三个安全要素，如果这些服务状态不正常，系统就会在状态栏进行告警提示。这个进程也可能会被病毒软件和黑客程序伪装

ctfmon.exe，Microsoft Office产品套装的一部分，是有关输入法的一个可执行程序。它可以选择用户文字输入程序，和微软Office XP语言条。这不是纯粹的系统程序，但是如果终止它，可能会导致不可知的问题。另外，ctfmon.exe可能被感染上木马而成为病毒程序

wordpad.exe，是微软Microsoft Windows自带的免费字处理工具。

Conime.exe，输入法编辑器

Cmd.exe，windows系统的命令行程序

3.查看文件
`volatility -f mem.raw --profile=Win7SP1x64 filescan`

4.用grep命令过滤
`volatility -f mem.raw --profile=Win7SP1x64 filescan |grep txt`

5.提取文件
`volatility -f mem.raw --profile=Win7SP1x64 dumpfiles -Q 0x000000001e7c3420 -D aaa`

6.看cmd下执行的文件
`volatility -f mem.raw --profile=Win7SP1x64 cmdscan`

7.分离出cmd下执行的某个文件
`volatility -f mem.raw --profile=Win7SP1x64 memdump -p 2884 -D aaa`
-p是进程号，flag的文件在进程号为2884，分离出的文件为流量包

8.提取账户密码
`volatility -f mem.raw --profile=Win7SP0x64 hashpump`

9.查看网络连接
`volatility -f mem.raw --profile=Win7SP1x64 netscan`

10.查看已经建立的网络连接

`volatility -f mem.raw --profile=Win7SP1x64 netscan|grep ESTABLISHED`

## 常见解题思路：

> 主要找到键盘数据文件

1.根据payload6查看信息，再直接利用foremost分离，将提取的信息结合分离出usb键盘数据文件

2.结合payload1-3\6,再利用binwalk -e 提取文件，再利用```Tshark -r `命令查看键盘数据，利用`tshark -T fields -e usb.capdata >file.path.name` 输出存为文件，即为键盘数据文件

## USB通杀EXP

```python
'''
USB流量分析
    keyboard scan code转为键盘字符
参数：
    导出的usb流量信息
'''
import sys
import os
 
 
usb_codes = {
   0x04:"aA", 0x05:"bB", 0x06:"cC", 0x07:"dD", 0x08:"eE", 0x09:"fF",
   0x0A:"gG", 0x0B:"hH", 0x0C:"iI", 0x0D:"jJ", 0x0E:"kK", 0x0F:"lL",
   0x10:"mM", 0x11:"nN", 0x12:"oO", 0x13:"pP", 0x14:"qQ", 0x15:"rR",
   0x16:"sS", 0x17:"tT", 0x18:"uU", 0x19:"vV", 0x1A:"wW", 0x1B:"xX",
   0x1C:"yY", 0x1D:"zZ", 0x1E:"1!", 0x1F:"2@", 0x20:"3#", 0x21:"4$",
   0x22:"5%", 0x23:"6^", 0x24:"7&", 0x25:"8*", 0x26:"9(", 0x27:"0)",
   0x2C:"  ", 0x2D:"-_", 0x2E:"=+", 0x2F:"[{", 0x30:"]}",  0x32:"#~",
   0x33:";:", 0x34:"'\"",  0x36:",<",  0x37:".>", 0x4f:">", 0x50:"<"
   }
 
def code2chr(filepath):
    lines = []
    pos = 0
    for x in open(filepath,"r").readlines():
        code = int(x[6:8],16)   # 即第三个字节
        if code == 0:
            continue
        # newline or down arrow - move down
        if code == 0x51 or code == 0x28:
            pos += 1
            continue
        # up arrow - move up
        if code == 0x52:
            pos -= 1
            continue
 
        # select the character based on the Shift key
        while len(lines) <= pos:
            lines.append("")
        if code in range(4,81):
            if int(x[0:2],16) == 2:
                lines[pos] += usb_codes[code][1]
            else:
                lines[pos] += usb_codes[code][0]
        
    for x in lines:
        print(x)
 
 
if __name__ == "__main__":
    # check argv
    if len(sys.argv) != 2:
        print("Usage:\n\tpython keyboardScanCode.py datafile.txt\nhow to get datafile:\t tshark -r file.usb.pcapng -T fields -e usb.capdata > datafile.txt")
        exit(1)
    else:
        filepath = sys.argv[1]
        code2chr(filepath)
```
