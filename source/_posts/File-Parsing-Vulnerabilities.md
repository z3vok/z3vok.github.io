---
title: "File Parsing and Server Configuration Boundaries"
title_zh: "文件解析漏洞与服务器配置边界"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: File Parsing Vulnerabilities
date: 2020-07-02 18:54:00
slug: File-Parsing-Vulnerabilities
permalink: writing/File-Parsing-Vulnerabilities/
topic: Application security
summary: "Comparing historical Apache, PHP, FastCGI and IIS behavior at the boundary between uploaded data and execution."
summary_zh: "比较Apache、PHP配置文件、FastCGI及旧版IIS中的文件解析行为，结合配置与扩展名示例说明上传后执行的条件，并整理对应修复与部署边界。"
format_label: Lab notes
featured_rank: 0
missing_images: 14
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---
## 简介

**文件解析漏洞,是指Web容器（Apache、nginx、iis等）在解析文件时出现了漏洞,以其他格式执行出脚本格式的效果。从而,黑客可以利用该漏洞实现非法文件的解析。**
![历史配图暂缺](redacted-image:missing)

## Apache解析漏洞

### 多后缀

**原理**

在Apache1.x，2.x中Apache 解析文件的规则是从右到左开始判断解析,如果后缀名为不可识别文件解析,就再往左判断。

**因此我可以上传一个test.php.qwer文件绕过验证且服务器依然会将其解析为php。
Apache能够认识的文件在mime.types文件里**
![历史配图暂缺](redacted-image:missing)

### 修复方案

**后缀验证尽量使用白名单的方式，这样即使使用不存在的后缀名，也无法绕过。**

### 配置问题导致漏洞

- 如果在 Apache 的 conf 里有这样一行配置 `AddHandler php5-script .php` 这时只要文件名里包含.php 即使文件名是 test2.php.jpg 也会以 php 来执行。
- 如果在 Apache 的 conf 里有这样一行配置 `AddType application/x-httpd-php .jpg`即使扩展名是 jpg，一样能以 php 方式执行。

### 修复方案

**1. apache配置文件，禁止.php.这样的文件执行，配置文件里面加入**

```markup
<Files ~ “.(php.|php3.)”>
        Order Allow,Deny
        Deny from all
</Files>
```

2.**用伪静态能解决这个问题，重写类似`.php.\*`这类文件，打开apache的httpd.conf找到LoadModule rewrite_module modules/mod_rewrite.so
把#号去掉，重启apache,在网站根目录下建立.htaccess文件,代码如下:**

```markup
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .(php.|php3.) /index.php
RewriteRule .(pHp.|pHp3.) /index.php
RewriteRule .(phP.|phP3.) /index.php
RewriteRule .(Php.|Php3.) /index.php
RewriteRule .(PHp.|PHp3.) /index.php
RewriteRule .(PhP.|PhP3.) /index.php
RewriteRule .(pHP.|pHP3.) /index.php
RewriteRule .(PHP.|PHP3.) /index.php
</IfModule>
```

### 畸形后缀

Apache配置文件中会有`.+.ph(p[345]?|t|tml)`此类的正则表达式，被当php程序执行的文件名要符合正则表达式，否则就算Apache把某文件当php程序，php自己不认它，也是无用。

![历史配图暂缺](redacted-image:missing)

也就是说`php3，php4，php5，pht，phtml`也是可以被解析的。

### .htaccess

**一般来说，配置文件的作用范围都是全局的，但Apache提供了一种很方便的、可作用于当前目录及其子目录的配置文件——.htaccess（分布式配置文件）**
要想使.htaccess文件生效，需要两个条件:
**一是在Apache的配置文件中写上：**

```markup
AllowOverride All
```

**二是Apache要加载mod_Rewrite模块。加载该模块，需要在Apache的配置文件中写上：**

```markup
LoadModule rewrite_module /usr/lib/apache2/modules/mod_rewrite.so
```

若是在Ubuntu中，可能还需要执行命令：

```
sudo a2enmod rewrite
```

配置完后需要重启Apache。

**.htaccess文件可以配置很多事情，如是否开启站点的图片缓存、自定义错误页面、自定义默认文档、设置WWW域名重定向、设置网页重定向、设置图片防盗链和访问权限控制。但我们这里只关心.htaccess文件的一个作用——MIME类型修改。如在.htaccess文件中写入：**

```markup
AddType application/x-httpd-php xxx
```

**就成功地使该.htaccess文件所在目录及其子目录中的后缀为.xxx的文件被Apache当做php文件。**
**另一种写法是：**

```markup
<FilesMatch "shell.jpg">
  SetHandler application/x-httpd-php
</FilesMatch>
```

该语句会让Apache把shell.jpg文件解析为php文件。

故 我们可以先上传 .htaccess ，然后再上传含有shell的文件

## .user.ini

### 对比.htaccess

`.user.ini`，它比`.htaccess`用的更广，不管是nginx/apache/IIS，只要是以fastcgi运行的php都可以用这个方法。我的nginx服务器全部是fpm/fastcgi，我的IIS php5.3以上的全部用的fastcgi/cgi，我win下的apache上也用的fcgi，可谓很广，不像.htaccess有局限性。

### 什么是.user.ini

php.ini是php默认的配置文件，其中包括了很多php的配置，这些配置中，又分为几种：`PHP_INI_SYSTEM`、`PHP_INI_PERDIR`、`PHP_INI_ALL`、`PHP_INI_USER`。 在此可以查看：<http://php.net/manual/zh/ini.list.php> 这几种模式有什么区别？看看官方的解释：

![历史配图暂缺](redacted-image:missing)

其中就提到了，模式为PHP_INI_USER的配置项，可以在ini_set()函数中设置、注册表中设置，再就是.user.ini中设置。 这里就提到了.user.ini，那么这是个什么配置文件？那么官方文档在[这里](http://php.net/manual/zh/configuration.file.per-user.php)又解释了：

除了主 php.ini 之外，PHP 还会在每个目录下扫描 INI 文件，从被执行的 PHP 文件所在目录开始一直上升到 web 根目录（`$_SERVER['DOCUMENT_ROOT']` 所指定的）。如果被执行的 PHP 文件在 web 根目录之外，则只扫描该目录。

在 `.user.ini` 风格的 INI 文件中只有具有 PHP_INI_PERDIR 和 PHP_INI_USER 模式的 INI 设置可被识别。

这里就很清楚了，`.user.ini`实际上就是一个可以由用户“自定义”的php.ini，我们能够自定义的设置是模式为“PHP_INI_PERDIR 、 PHP_INI_USER”的设置。（上面表格中没有提到的PHP_INI_PERDIR也可以在.user.ini中设置）

实际上，除了`PHP_INI_SYSTEM`以外的模式（包括PHP_INI_ALL）都是可以通过.user.ini来设置的。

而且，和`php.ini`不同的是，`.user.ini`是一个能被动态加载的ini文件。也就是说我修改了`.user.ini`后，不需要重启服务器中间件，只需要等待`user_ini.cache_ttl`所设置的时间（默认为300秒），即可被重新加载。

然后我们看到php.ini中的配置项，可惜我沮丧地发现，只要稍微敏感的配置项，都是`PHP_INI_SYSTEM`模式的（甚至是php.ini only的），包括`disable_functions`、`extension_dir`、`enable_dl`等。 不过，我们可以很容易地借助`.user.ini`文件来构造一个“后门”。

Php配置项中有两个比较有意思的项（下图第一、四个）：

![历史配图暂缺](redacted-image:missing)

`auto_append_file`、`auto_prepend_file`，点开看看什么意思：

![历史配图暂缺](redacted-image:missing)

指定一个文件，自动包含在要执行的文件前，类似于在文件前调用了require()函数。而auto_append_file类似，只是在文件后面包含。 使用方法很简单，直接写在.user.ini中：

```
auto_prepend_file=01.gif
```

01.gif是要包含的文件。

所以，我们可以借助.user.ini轻松让所有php文件都“自动”包含某个文件，而这个文件可以是一个正常php文件，也可以是一个包含一句话的webshell。

测试一下，我分别在IIS6.0+Fastcgi+PHP5.3和nginx+fpm+php5.3上测试。 目录下有.user.ini，和包含webshell的01.gif，和正常php文件echo.php：

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

访问echo.php即可看到后门：

![历史配图暂缺](redacted-image:missing)

Nginx下同样：

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

### 应用场景

 比如，某网站限制不允许上传.php文件，你便可以上传一个.user.ini，再上传一个图片马，包含起来进行getshell。不过前提是含有.user.ini的文件夹下需要有正常的php文件，否则也不能包含了。 再比如，你只是想隐藏个后门，这个方式是最方便的。

## Nginx解析漏洞

### PHP CGI解析漏洞

[Fastcgi协议分析 && PHP-FPM未授权访问漏洞 && Exp编写](https://www.leavesongs.com/PENETRATION/fastcgi-and-php-fpm.html)
![历史配图暂缺](redacted-image:missing)
**当访问files.example.com/phpinfo.jpg/1.php这个URL时，$fastcgi_script_name会被设置为“phpinfo.jpg/1.php”，然后构造成SCRIPT_FILENAME传递给PHP CGI。**

**Nginx默认是以CGI的方式支持PHP解析的，普遍的做法是在Nginx配置文件中通过正则匹配设置SCRIPT_FILENAME。当访问files.example.com/phpinfo.jpg/1.php这个URL时，$fastcgi_script_name会被设置为“phpinfo.jpg/1.php”，然后构造成SCRIPT_FILENAME传递给PHP CGI，但是PHP为什么会接受这样的参数，并将phpinfo.jpg作为PHP文件解析呢?这就要说到fix_pathinfo这个选项了。 如果开启了这个选项，那么就会触发在PHP中的如下逻辑：
PHP会认为SCRIPT_FILENAME是phpinfo.jpg，而1.php是PATH_INFO，所以就会将phpinfo.jpg作为PHP文件来解析了**

简言之，如果fix_pathinfo开启，并且Nginx配置文件中通过正则匹配设置SCRIPT_FILENAME，那么上传phpinfo.jpg/1.php，phpinfo.jpg就会被当作PHP文件解析

```markup
files.example.com/UploadFiles/image/1.jpg/1.php  
files.example.com/UploadFiles/image/1.jpg/%20\0.php
```

**另外一种手法：上传一个名字为test.jpg，以下内容的文件。**

```php
<?PHP fputs(fopen('shell.php','w'),'<?php eval($_POST[cmd])?>');?>
```

**然后访问test.jpg/.php,在这个目录下就会生成一句话木马shell.php。**

**这个解析漏洞其实是PHP CGI的漏洞，在PHP的配置文件中有一个关键的选项cgi.fix_pathinfo默认是开启的，当URL中有不存在的文件，PHP就会向前递归解析。**
![历史配图暂缺](redacted-image:missing)
**这个往前递归的功能原本是想解决/info.php/test这种URL，能够正确解析到info.php。**

**在Nginx配置fastcgi使用php时，会存在文件类型解析问题。其实可以说它与Nginx本身关系不大，Nginx只是作为一个代理把请求转发给fastcgi Server，PHP在后端处理这一切。因此在其他fastcgi环境下，PHP也存在此问题，只是使用Nginx作为Web Server时，一般使用fastcgi的方式调用脚本解释器，这种使用方式最为常见。**

### 防御方法

- 1）使用Apache、IIS等成熟久经考验的服务器软件，在动态语言的支持上，Nginx还是太年经了。你应该也偶尔会见到有些网站挂掉了显示个nginx错误出来，却极少见网站挂掉显示不是nginx的(未备案，过期欠费 等等除外)。

- 2）上传目录、静态资源（CSS/JS/图片等）目录，都设置好屏蔽PHP执行权限。例如使用Apache服务器的
  在相应目录下放一个 .htaccess 文件，里面写上

- ```js
  <FilesMatch "(?i:\.php)$">
      Deny from all
  </FilesMatch>3）
  ```

- 3）可以不提供原图访问，所有图片输出时都经过程序处理，也可以在上传存储时就处理一遍根本不保存原图；

- 4）图片使用不同的服务器，这样可以与业务代码数据完全隔离，即使图片服务器被黑了，也不会泄漏多少信息；

- 5)cgi.fix_pathinfo=0慎用，除非你十分确定该服务器上的所有项目都不会因此而无法运行。

### 空字节代码执行漏洞

旧版本（0.5.*，**0.6.*，0.7，0.8<=0.7.65<=0.8.37）。通过利用此漏洞，攻击者可以导致服务器使用PHP的FastCGI作为PHP的服务器上执行任何公开访问的文件。

**恶意用户发出请求`http://example.com/file.ext％00.php`就会将file.ext作为PHP文件解析。**

**如果一个攻击者可以控制文件的内容（即：使用头像上传形式）其结果是执行任意代码。Ngnix在遇到%00空字节时与后端FastCGI处理不一致，导致可以在图片中嵌入PHP代码然后通过访问xxx.jpg%00.php来执行其中的代码。**

### 修复

**1.禁止在上传文件目录下执行php。**
**在nginx虚拟机配置或者fcgi.conf配置加如下代码**

```php
if ($request_filename ~* (.*)\.php) {
    set $php_url $1;
}
if (!-e $php_url.php) {
    return 403;
}
```

**2.升级到最新版本的nginx**

## IIS5.x-6.x解析漏洞

**使用iis5.x-6.x版本的服务器，大多为windows server 2003，网站比较古老，开发语言一般为asp；该解析漏洞也只能解析asp文件，而不能解析aspx文件。**

### 目录解析(6.0)

**形式：files.example.com/xx.asp/xx.jpg**
**原理: 服务器默认会把.asp，.asa目录下的文件都解析成asp文件。**

### 文件解析（6.0）

形式：files.example.com/xx.asp;.jpg
原理：服务器默认不解析;号后面的内容，因此xx.asp;.jpg便被解析成asp文件了。

### 解析文件类型

有的网站在上传检测中会用"黑名单"方法 ,但是IIS6.0 默认的可执行文件除了asp还包含这三种 :

```
/test.asa
/test.cer
/test.cdx
```

**iis为什么会把asa，cdx，cer解析成asp文件：原因是这四种扩展名都是用的同一个asp.dll文件来执行。**
![历史配图暂缺](redacted-image:missing)

### 修复

**1.目前尚无微软官方的补丁，可以通过自己编写正则，阻止上传`xx.asp;.jpg`类型的文件名。
2.做好权限设置，限制用户创建文件夹。**

## IIS7.5解析漏洞

IIS7.5的漏洞与nginx的类似，都是由于php配置文件中，开启了cgi.fix_pathinfo，而这并不是nginx或者iis7.5本身的漏洞。
**跟nginx解析漏洞一样，要在php.ini cgi.fix_pathinfo=1 开启的情况才会产生。**

可以配合操作系统文件命名规则，上传不符合windows文件命名规则的文件名

>test.asp.
>test.asp(空格)
>test.php:1.jpg
>test.php:: $DATA # php在window的时候如果文件名+"::$DATA"会把::$DATA之后的数据当成文件流处理,不会检测后缀名.且保持"::$DATA"之前的文件名

**会被windows系统自动去掉不符合规则符号后面的内，然后再配合这个解析漏洞来执行文件。**

## %00截断

条件：php 版本<5.3.4

- filename=test.php%00.txt
- 1.上传时路径可控，使用00截断
- 2.文件下载时，00截断绕过白名单检查
- 3.文件包含时，00截断后面限制(主要是本地包含时)
- 4.其它与文件操作有关的地方都可能使用00截断。

## 其他

**在windows环境下，xx.jpg[空格] 或xx.jpg. 这两类文件都是不允许存在的，**

**若这样命名，windows会默认除去空格或点,黑客可以通过抓包，在文件名后加一个空格或者点绕过黑名单.若上传成功，空格和点都会被windows自动消除,这样也可以getshell。**

**这种方法可以配合文件解析漏洞从而产生更大的杀伤力。**
