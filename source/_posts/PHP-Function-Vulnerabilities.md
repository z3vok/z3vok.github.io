---
title: "PHP Function Security: Comparison, Execution and Serialization"
title_zh: "PHP 函数安全：比较、执行与序列化"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: PHP Function Vulnerabilities
date: 2019-12-18 20:20:00
slug: PHP-Function-Vulnerabilities
permalink: writing/PHP-Function-Vulnerabilities/
topic: Code auditing
summary: "Following weak comparisons and input handling into execution and serialization behavior in older PHP environments."
summary_zh: "从正则替换、数值判断与弱类型比较切入，结合 assert 示例讨论可控输入如何进入执行上下文，再整理输出函数、魔术方法及序列化的触发关系。"
format_label: Lab notes
featured_rank: 0
missing_images: 0
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## preg_replace()函数

---

<a name="ZlIMU"></a>

### 存在命令执行漏洞
>
> **功能介绍：**
> **preg_replace($pattern, $replacement, $subject);****preg_replace — ****执行一个正则表达式的搜索和替换**
> **搜索****`subject`****中匹配****`pattern`****的部分， 以****`replacement`****进行替换。

/e 修正符使 preg_replace() 将 replacement 参数当作 PHP 代码（在适当的逆向引用替换完之后）。
<a name="5e7C7"></a>

### preg_replace漏洞触发有两个前提：

01：第一个参数需要e标识符，有了它可以执行第二个参数的命令<br />02：第一个参数需要在第三个参数中的中有匹配，不然echo会返回第三个参数而不执行命令，举个例子：<br />//echo preg_replace(‘/test/e’, ‘phpinfo()’, ‘just test’);这样是可以执行命令的<br />//echo preg_replace(‘/test/e’, ‘phpinfo()’, ‘just tesxt’); 或者echo preg_replace(‘/tesxt/e’, ‘phpinfo()’, ‘just test’); 这两种没有匹配上，所以返回值是第三个参数，不会执行命令

---

<a name="A8b58"></a>

## is_numeric()函数

---

> **功能介绍：**
> **is_numeric()  判断变量是否为数字或数字字符串，不仅检查10进制，16进制是可以。**

这个函数本身没有什么问题，但是和mysql结合起来就容易出问题，那是因为is_numeric判断的时候，当碰到16进制数的时候，也会判断成数字，如：

```php
echo is_numeric('0x233333');
```

而在mysql中，插入0x开头的16进制数的时候，会自动转成字符插入：

```php
$s = is_numeric($_GET['s'])?$_GET['s']:0;
$sql="insert into test(type)values($s);";
mysql_query($sql);
```

代码的本意是想过滤掉字符输入，而当用户恶意地以16进制格式输入时，就容易绕过检查，插入恶意代码，进而可能会导致SQL注入的发生。<br />因此，要避免这样的漏洞发生，可以考虑采用正则表达式的方法来取代is_numberic函数。

---

<a name="12O0n"></a>

## php中有两种比较符号

---

== 会先将字符串换成相同类型，再作比较，属于弱类型比较<br />=== 会同时比较字符串的值和类型

=== 在进行比较的时候，会先判断两种字符串的类型是否相等，再比较<br />== 在进行比较的时候，会先将字符串类型转化成相同，再比较

---

<a name="guWeI"></a>

## assert()函数

<a name="dbadf"></a>

### 存在代码注射漏洞
>
> **功能介绍：**
> **判断一个表达式是否成立。返回true or false。**
> **
> **PHP 5**
> **assert ( [mixed](https://www.php.net/manual/zh/language.pseudo-types.php#language.types.mixed) `$assertion` [, string `$description` ] ) : bool**
> **PHP 7**
> **assert ( [mixed](https://www.php.net/manual/zh/language.pseudo-types.php#language.types.mixed) `$assertion` [, Throwable `$exception` ] ) : bool**
>**
> **assert() 会检查指定的 `assertion` 并在结果为 `FALSE` 时采取适当的行动。**
> **如果 `assertion` 是字符串，它将会被 assert() 当做 PHP 代码来执行。**
> ****当参数为字符串时，会被当作php代码执行。**
> **例如 assert("phpinfo()")  <==>   <?phpinfo()?>**

**这个函数容易引起代码注射：**<br />eg:

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

<a name="ACije"></a>

### 相关函数用法区分

**file_get_contents() 函数**把整个文件读入一个字符串中。<br />**语法：**<br />file_get_contents(_path_,_include_path_,_context_,_start_,_max_length_)

| 参数 | 描述 |
| :--- | :--- |
| path | 必需。规定要读取的文件。 |
| include_path | 可选。如果也想在 include_path 中搜寻文件的话，可以将该参数设为 "1"。 |
| context | 可选。规定文件句柄的环境。<br />context 是一套可以修改流的行为的选项。若使用 null，则忽略。 |
| start | 可选。规定在文件中开始读取的位置。该参数是 PHP 5.1 新加的。 |
| max_length | 可选。规定读取的字节数。该参数是 PHP 5.1 新加的。 |

**file() 函数**把整个文件读入一个数组中。
<a name="peCrR"></a>

### 语法

file(path,include_path,context)

| 参数 | 描述 |
| :--- | :--- |
| path | 必需。规定要读取的文件。 |
| include_path | 可选。如果也想在 include_path 中搜寻文件的话，可以将该参数设为 "1"。 |
| context | 可选。规定文件句柄的环境。<br />context 是一套可以修改流的行为的选项。若使用 null，则忽略。 |

**assert与eval的区别**<br />_assert把整个字符串参数当php代码执行，eval把合法的php代码执行。_

**print()**<br />_函数print()打印一个值（它的参数），如果字符串成功显示则返回true，否则返回false。_

**printf()**<br />_printf()源于C语言中的printf()。该函数输出格式化的字符串。_<br />_语法： printf(format,arg1,arg2,arg++)_<br />_format 规定字符串以及如何格式化其中的变量；_<br />_arg1, arg2, ++ 等参数将插入到主字符串中的百分号 (%) 符号处。该函数是逐步执行的。在第一个 % 符号中，插入 arg1，在第二个 % 符号处，插入 arg2，依此类推。_

[**print_r**](https://www.baidu.com/s?wd=print_r&tn=SE_PcZhidaonwhc_ngpagmjz&rsv_dl=gh_pc_zhidao)**()**<br />[_print_r_](https://www.baidu.com/s?wd=print_r&tn=SE_PcZhidaonwhc_ngpagmjz&rsv_dl=gh_pc_zhidao)_()可以把字符串和数字简单地打印出来，而数组则以括起来的键和值得列表形式显示，并以Array开头。如， $a = array('name' => 'Fred', 'age' => '15', 'wife' => 'Wilma');_

**echo**<br />_可以一次输出多个值，多个值之间用逗号分隔。echo是语言结构(language construct)，而并不是真正的函数，因此不能作为表达式的一部分使用。_<br />_
<a name="OfJyn"></a>

## _SQL语句中的函数_

<a name="GRqYD"></a>

### CONV()
>
> 简单的来说这个函数就是用来进行进制的转换的
>
> CONV(N,from_base,to_base)
>
> N是要转换的数据，from_base是原进制，to_base是目标进制。
>
> 如果N是有符号数字，则to_base要以负数的形式提供，否则会将N当作无符号数

<a name="3T1bj"></a>

### substr（）
>
> 简单来说 这个函数是用来搜索字符串的
>
>  substr(string string,num start,num length);
>
>  string为字符串；
>
>  start为起始位置；
>
>  length为长度。
>
>  mysql中的start是从1开始的，而hibernate中的start是从0开始的。

<a name="ZEIxq"></a>

##  php魔术方法

<a name="vQHMa"></a>

### 魔术方法定义

[__construct()](https://www.php.net/manual/zh/language.oop5.decon.php#object.construct)， [__destruct()](https://www.php.net/manual/zh/language.oop5.decon.php#object.destruct)， [__call()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.call)， [__callStatic()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.callstatic)， [__get()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.get)， [__set()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.set)， [__isset()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.isset)， [__unset()](https://www.php.net/manual/zh/language.oop5.overloading.php#object.unset)， [__sleep()](https://www.php.net/manual/zh/language.oop5.magic.php#object.sleep)， [__wakeup()](https://www.php.net/manual/zh/language.oop5.magic.php#object.wakeup)， [__toString()](https://www.php.net/manual/zh/language.oop5.magic.php#object.tostring)， [__invoke()](https://www.php.net/manual/zh/language.oop5.magic.php#object.invoke)， [__set_state()](https://www.php.net/manual/zh/language.oop5.magic.php#object.set-state)， [__clone()](https://www.php.net/manual/zh/language.oop5.cloning.php#object.clone) 和 [__debugInfo()](https://www.php.net/manual/zh/language.oop5.magic.php#object.debuginfo) 等方法在 PHP 中被称为魔术方法（Magic methods）。<br />PS:在命名自己的类方法时不能使用这些方法名，除非是想使用其魔术功能。
<a name="VQ3bA"></a>

### 魔术方法表示

PHP 将所有以 __（两个下划线）开头的类方法保留为魔术方法。所以在定义类方法时，除了上述魔术方法，建议不要以__ 为前缀。
<a name="tph4C"></a>

### 序列化和反序列化

<a name="12yZK"></a>

##### 序列化：[serialize()](https://www.php.net/manual/zh/function.serialize.php)来返回一个包含字节流的字符串来表示
>
> [serialize()](https://www.php.net/manual/zh/function.serialize.php) 函数会检查类中是否存在一个魔术方法 [__sleep()](https://www.php.net/manual/zh/language.oop5.magic.php#object.sleep)
> 如果存在，该方法会先被调用，然后才执行序列化操作。此功能可以用于清理对象，并返回一个包含对象中所有应被序列化的变量名称的数组。
> [__sleep()](https://www.php.net/manual/zh/language.oop5.magic.php#object.sleep) 方法常用于提交未提交的数据，或类似的清理操作。

<a name="1L1t9"></a>

##### 反序列化函数：[unserialize()](https://www.php.net/manual/zh/function.unserialize.php)函数能够重新把字符串变回php原来的值
>
> [unserialize()](https://www.php.net/manual/zh/function.unserialize.php) 会检查是否存在一个 [__wakeup()](https://www.php.net/manual/zh/language.oop5.magic.php#object.wakeup) 方法。如果存在，则会先调用 ___wakeup_ 方法，预先准备对象需要的资源。
> [__wakeup()](https://www.php.net/manual/zh/language.oop5.magic.php#object.wakeup) 经常用在反序列化操作中，例如重新建立数据库连接，或执行其它初始化操作。

<br />
<a name="wvpLn"></a>
##### 序列化各个量表示的含义

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
