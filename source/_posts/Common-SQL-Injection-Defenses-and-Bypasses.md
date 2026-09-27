---
title: "SQL Injection Defenses and Filtering Boundaries"
title_zh: "SQL 注入防护与过滤边界"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Common Defenses and Bypass Techniques for SQL Injection
date: 2020-07-07 14:28:00
slug: Common-SQL-Injection-Defenses-and-Bypasses
permalink: writing/Common-SQL-Injection-Defenses-and-Bypasses/
topic: Application security
summary: "Comparing escaping, type conversion, filtering and prepared statements through historical examples."
summary_zh: "整理PHP转义、类型转换、正则过滤和预编译语句等处理方式，再通过编码、大小写与字符串处理示例讨论过滤边界，记录不同防护思路的适用差异。"
format_label: Technical notes
featured_rank: 0
missing_images: 0
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0x01 PHP防御的几种姿势

### 关闭错误提示

说明：
PHP配置文件php.ini中的display_errors=Off

### 魔术引号

说明：
当php.ini里的magic_quotes_gpc=On时，提交的变量中所有的单引号，双引号，反斜线，NUL（NULL字符）会自动转为含有反斜线的转义字符
魔术引号（Magic Quote）是一个自动将进入PHP脚本的数据进行转义的过程。（对所有的GET，POST，Cookie数据进行转义）
PHP 5.4 之前PHP指令magic_quotes_gpc默认是on
在PHP5.4.0起magic_quotes_gpc将始终返回FALSE

### addslashes

addslashes函数，它会在指定的预定义字符前添加反斜杠转义，这些预定义的字符是：单引号（’）、双引号（”）、反斜线（\）与 NUL（NULL 字符）
这个函数的作用和`magic_quotes_gpc`一样。所以一般用`addslashes`前会检查是否开了`magic_quotes_gpc`

`magic_quotes_gpc`与`addslashes`的区别用法：

**1）对于magic_quotes_gpc=on的情况**
我们可以不对输入和输出数据库的字符串数据作addslashes()和stripslashes()的操作,数据也会正常显示
如果此时你对输入的数据作了addslashes()处理，那么在输出的时候就必须使用stripslashes()去掉多余的反斜杠
**2）对于magic_quotes_gpc=off 的情况**
必须使用addslashes()对输入数据进行处理，但并不需要使用stripslashes()格式化输出
因为addslashes()并未将反斜杠一起写入数据库，只是帮助mysql完成了sql语句的执行

### mysql_real_escape_string

mysql_real_escape_string()函数转义 SQL 语句中使用的字符串中的特殊字符
下列字符受影响
`\x00`
`\n`
`\r`
`\`
`'`
`"`
`\x1a`
如果成功，则该函数返回被转义的字符串。如果失败，则返回 false
因为完全性问题，建议使用拥有Prepared Statement机制的PDO和MYSQLi来代替mysql_query，使用的是mysqli_real_escape_string

### htmlspecialchars()

htmlspecialchars()函数把预定义的字符转换为 HTML实体
预定义的字符是:

```sql
& -> &
“ -> "
‘ -> '
< -> <
> -> >
```

### 用正则匹配替换来过滤指定的字符

```php
preg_match preg_match_all() preg_replace
```

### 转换数据类型

根据「检查数据类型」的原则，查询之前要将输入数据转换为相应类型，如uid都应该经过intval函数格式为int型

### 使用预编译语句

绑定变量使用预编译语句是预防SQL注入的最佳方式，因为使用预编译的SQL语句语义不会发生改变，在SQL语句中，变量用问号?表示，攻击者无法改变SQL语句的结构，从根本上杜绝了SQL注入攻击的发生

## 0x02 几种绕过姿势

### addslashes

绕过：
1.将字符串转为16进制编码数据或使用char函数（十进制）进行转化（因为数据库会自动把16进制转化）
2.用注释符去掉输入密码部分如”–/*#”

payload:
`http://localhost/injection/user.php?username=admin--`
注意– 后的空格
`http://localhost/injection/user.php?username=admin/*`
（escape不转义/* )

`http://localhost/injection/user.php?username=admin%23`
（这里的%23即为#，注释掉后面的密码部分。注意IE浏览器会将#转换为空）
`http://localhost/injection/user.php?username=0x61646d696e23`
（admin# –>0x61646d696e23）
`http://localhost/injection/user.php?username=CHAR(97,100, 109, 105, 110, 35)`
（admin# –>CHAR(97, 100, 109, 105, 110, 35)）

关于编码原理：

因为一般前端JavaScript都会escape()、encodeURL或encodeURIComponent编码再传输给服务器，主要为encodeURL，如下，所以可以利用这点

1)escape( )
对ASCII字母、数字、标点符号``”@* _ + - . /“``不进行编码。在``\u0000`到`\u00ff`之间的符号被转成`%xx`的形式，其余符号被转成`%uxxxx`的形式。（注意escape()不对”+”编码，而平时表单中的空格会变成+）

2) encodeURL
   对``” ; / ? : @ & = + $ , # ‘ “``不进行编码。编码后，它输出符号的utf-8形式，并且在每个字节前加上``%``。
3) encodeURIComponent
   用于对URL的组成部分进行个别编码，而不用于对整个URL进行编码。
   常用编码：
   `@ * _ + - ./ ; \ ? : @ & = + $ , # ' 空格`

转码工具可用：
http://evilcos.me/lab/xssor/

### 匹配过滤

preg_match
绕过：
关键词 and,or 常被用做简单 测试网站是否容易进行注入攻击
过滤注入： 1 or 1 = 1 1 and 1 = 1
绕过注入： 1 || 1 = 1 1 && 1 = 1
[混淆和绕过](http://www.cnblogs.com/croot/p/3450262.html)

### strstr

strstr ()查找字符串的首次出现，该函数区分大小写。如果想要不区分大小写，使用stristr()。(注意后面这个函数多了个i)
绕过：
strstr()函数是对大小写敏感的，所以我们可以通过大小写变种来绕过
payload：
`http://localhost/injection/user.php?id=1uNion select null,null,null`

### 空格过滤

绕过：
1)使用内联注释。
2)使用换行符代替空格。注意服务器若为Windows则换行符为%0A%0D，Linux则为%0A
payload:
`http://localhost/injection/user.php?id=1/**/and/**/1=1`
`http://localhost/injection/user.php?id=1%0A%0Dand%0A%0D1=1`

### 空字节

通常的输入过滤器都是在应用程序之外的代码实现的。比如入侵检测系统（IDS），这些系统一般是由原生编程语言开发而成，比如C++，为什么空字节能起作用呢，就是因为在原生变成语言中，根据字符串起始位置到第一个出现空字节的位置来确定字符串长度。所以说空字节就有效的终止了字符串

绕过：
只需要在过滤器阻止的字符串前面提供一个采用URL编码的空字节即可。

payload:
`%00`

### 构造故意过滤

将传入的`%27`和`%2527`都进行删除处理，也就是还没传入数据库前就已经被该死的程序吃了，但是在看到他还吃了`*`，这样我们就有办法了，我们构造`%*27`，这样程序吃掉星号`*`后，`%27`就会被传入

payload：
`http://localhost/injection/user.php?id%3D1%*27%*20and%*20%*271%*27%3D%*271`
