---
title: "Hash Length Extension: Padding, State and Verification"
title_zh: "哈希长度扩展：补位、状态与验证"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Hash Length Extension Attack
date: 2020-05-17 22:23:00
slug: Hash-Length-Extension-Attack
permalink: writing/Hash-Length-Extension-Attack/
topic: Application security
summary: "A walkthrough of padding, byte order and chaining state, with a PHP verification exercise."
summary_zh: "围绕消息补位、字节序与链变量解释哈希长度扩展，结合PHP校验题目说明已知摘要如何参与后续计算，并记录工具、易混淆细节与自己的理解。"
format_label: Technical notes
featured_rank: 0
missing_images: 3
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0×01 前言

哈希长度扩展攻击利用了 md5、sha1 等加密算法的缺陷，可以在不知道原始密钥的情况下来进行计算出一个对应的 hash 值。主要摘录于freebuf深入理解hash长度扩展攻击(sha1为例)、二向箔学院相关赛题wp知识点，本篇为自己在看文章时的见解，对难点或者语义含糊的地方有详细的解释。本篇重复提及的便是重难点。

## 0×02 hash原理(sha1)

![历史配图暂缺](redacted-image:missing)

**当hash函数拿到需要被hash的字符串后，先将其字节长度整除64，取得余数。如果该余数正好等于56，那么就在该字符串最后添加上8个字节的长度描述符（具体用bit表示）。如果不等于56，就先对字符串进行长度填充，填充时第一个字节为hex(80)，其他字节均用hex(00)填充，填充至余数为56后，同样增加8个字节的长度描述符（该长度描述符为需要被hash的字符串的长度，不是填充之后整个字符串的长度）。**

以上过程，称之为补位。

> 1b(字节)=8bit(比特)

补位完成后，字符串以64位一组进行分组（因为上面的余数为56,加上8个字节的长度描述符后，正好是64位，凑成一组）。字符串能被分成几组就会进行多少次“复杂的数学变化”。每次进行“复杂的数学变化”都会生成一组新的registers值供下一次“复杂的数学变化”来调用。第一次“复杂的数学变化”会调用程序中的默认值。当后面已经没有分组可以进行数学变化时，该组生成的registers值就是最后的hash值。

**在sha1的运算过程中，为确保同一个字符串的sha1值唯一，所以需要保证第一次registers的值也唯一。所以在sha1算法中，registers具有初始值。如上图中的registers值0。**

Hash值的随机性完全依赖于进行“复杂的数学变化”时输入的registers值和该次运算中字符串分组的数据。如果进行“复杂数学变化”时输入的registers值和该次运算的字符串分组相同，那么他们各自生成的新的registers值也相同。

## 0×03 举例

这里是 ISCC 中题目中的 admin.php 的算法：

```php
$auth = false;
if (isset($_COOKIE["auth"])) {
   $auth = unserialize($_COOKIE["auth"]);
   $hsh = $_COOKIE["hsh"];
   if ($hsh !== md5($SECRET . strrev($_COOKIE["auth"]))) {    //$SECRET is a 8-bit salt
     $auth = false;
   }
}
else {
  $auth = false;
  $s = serialize($auth);
  setcookie("auth", $s);
  setcookie("hsh", md5($SECRET . strrev($s)));
}
```

- 知道`md5($SECRET . strrev($_COOKIE["auth"]))`的值
- 知道`$hsh`的值
- 可以算出另外一个 md5 值和另外一个 $hsh 的值，使得 `$hsh == md5($SECRET . strrev($_COOKIE["auth"]))`

这样即可通过验证。如果要理解哈希长度扩展攻击，我们要先理解消息摘要算法的实现。拿 md5 算法举例。

#### md5算法实现

```hex
对字符串abc的md5值计算,首先将其转化为16进制
hex:
61 62 63   abc
```

![历史配图暂缺](redacted-image:missing)

#### 补位

要想完成消息摘要算法的实现，必须对消息进行补位，使得其字节长度整除64(b，取得余数，且该余数正好等于56(b),换句话说：

消息字节长度 mod 64 * 8(bit) =56 * 8(bit),即为消息字节长度在对 512 取模后的值为 448

前面提及对于补位，填充时第一个字节为hex(80)，其他字节均用hex(00)填充，填充至余数为56后，这是在16进制的情况下，在二进制下，简言之，在消息后加1，然后加无限个0，直到mod 64 * 8(bit) =56 * 8(bit)

#### 补长度

`abc`是 3 个字母，也就是 3 个字节，24 bit

前面提及，在补完位后增加8个字节的长度描述符（该长度描述符为需要被hash的字符串的长度，不是填充之后整个字符串的长度），即二进制24转化为十六进制0x18。18+7个00

![历史配图暂缺](redacted-image:missing)

>**MD5中存储的都是小端方式**
>
>0x12345678
>
>在MD5运算时候存储的顺序是
>
> 0x78563412

故后八位读取顺序为0x0000000000000018

#### 计算消息摘要

计算消息摘要必须用补位已经补长度完成之后的消息来进行运算，拿出 512 bit的消息（即64字节）。 计算消息摘要的时候，有一个初始的链变量，用来参与第一轮的运算。MD5 的初始链变量为：

```hex
A=0x67452301
B=0xefcdab89
C=0x98badcfe
D=0x10325476
```

经过一次消息摘要后，上面的链变量将会**被新的值覆盖**，而最后一轮产生的链变量经过高低位互换（如：aabbccdd -> ddccbbaa）后就是我们计算出来的 md5 值。

#### 具体计算细节

将字符串和那四个链接变量经过一系列的复杂运算，算出一组新的A,B,C,D的值，如果消息小于512，只需要计算一次，这时候将新的ABCD的值按ABCD的顺序级联，然后输出，就是MD5的值，如果消息大于512的话，则需要计算多次，先计算出前512位的ABCD值然后用再用这个ABCD去计算后面512位的ABCD值以此类推，最后计算出来的ABCD经过拼接就是这串字符串的MD5值

#### 哈希长度扩展攻击的实现

```php
<?php
include "secret.php";
@$username=(string)$_POST['username']; 
function enc($text){
    global $key;
    return md5($key.$text);
}
if(enc($username) === $_COOKIE['verify']){
    if(is_numeric(strpos($username, "admin"))){
    }
    else{
        die("you are not admin");
    }
}
else{
    setcookie("verify", enc("guest"), time()+60*60*24*7);
    setcookie("len", strlen($key), time()+60*60*24*7);
}
show_source(__FILE__);
?>
```

- 知道`md5($key+guest)`的值
- 知道`len($key)`的值
-  要使得`cookie == md5($key+$username)`且**enc($username)===enc("guest")，$username中要包含admin**

问题就出在覆盖上。我们得知了其 hash 值，以及我们有一个可控的消息。而我们得到的 hash 值正是最后一轮摘要后的经过高地位互换的链变量。可以想像一下，**在常规的摘要之后把我们的控制的信息进行下一轮摘要，只需要知道上一轮消息产生的链变量**。

即此时的``COOKIE==md5($key+guest)``正是最后一轮摘要后的经过高地位互换的链变量，在常规的摘要之后把我们的控制的信息进行下一轮摘要变成最终的`COOKIE==md5(经过覆盖的链表量+admin)`,此处要覆盖的链表量就是``md5($key+guest)``

COOKIE中，MD5($key.guest)=f8d7a112644f7e71e1e8ad068f144f61,以及$key的长度为21。我们来进行哈希长度扩展攻击。

#### 长度扩展

补位：

由于$key的长度是21,故我们可以随便设一个值只要满足长度为21即可，接着是guest的十六进制，接着是补充够56个字节

补长度：

$key.guest=21+5=26位,故长度为26 * 8=208bit,根据md5的存储方式，我们长度在hex下补为

`08 20 00 00 00 00 00 00`

代码要求 POST 的值要有 admin 这一字符串，所以添加一个 admin 在末尾作为拓展

去掉前面的假的 $key，得到最终的 $username。
`guest\x80\x00\x00\x00\x00\x98\x01\x00\x00\x00\x00\x00\x00admin`
urlencode之后为
`guest%80%00%00%00%00%9%01%00%00%00%00%00%00admin`

为了让判断成立，还需要计算出拓展之后的 cookie

```text
if(enc($username) === $_COOKIE['verify'])
```

带入enc函数返回的就是md5($key+guest+admin)的值。
然后把md5($key+guest)值作为加密admin的初始链变量

**小端式存储要倒过来**

```hex
MD5($key+guest)=f8d7a112 644f7e71 e1e8ad06 8f144f61
A=0x12a1d7f8
B=0x717e4f64
c=0x06ade8e1
d=0x614f148f
```

用hashpump跑一下

```shell
# hashpump
Input Si gnature: f8d7a112644f7e71e1e8ad068f144f61
Input Data: guest
Input Key Length: 46
Input Data to Add: admin
得到的md5值
guest\x80\x00\x00\x00\x00\x98\x01 \x00\x00\x00\x00\x00\x00admin 
```

最后抓包，将得到md5的值放到cookie中，同时post``username=guest\x80\x00\x00\x00\x00\x98\x01 \x00\x00\x00\x00\x00\x00admin `` 

url编码\x转化为%

`guest%80%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%d0%00%00%00%00%00%00%00admin`

#### 相关利用工具

**hashpump**

在各种哈希算法中哈希长度扩展攻击的利用工具。

下载地址：[**hashpump**](https://github.com/bwall/HashPump)

**hash_extender**

哈希扩展器

下载地址：[哈希扩展器](https://github.com/iagox86/hash_extender)

**md5-extension-attack**

MD5 长度扩展攻击工具

下载地址：[MD5 长度扩展攻击工具](https://github.com/JoyChou93/md5-extension-attack)

## 0x04总结

解决问题的关键还是要理解它的具体计算细节，本篇的具体计算细节

>如果消息小于512，只需要计算一次，这时候将新的ABCD的值按ABCD的顺序级联，然后输出，就是MD5的值，如果消息大于512的话，则需要计算多次，先计算出前512位的ABCD值然后用再用这个ABCD去计算后面512位的ABCD值以此类推，最后计算出来的ABCD经过拼接就是这串字符串的MD5值

**对于题目,我们得到的 hash 值正是最后一轮摘要后的经过高地位互换的链变量。在常规的摘要之后把我们的控制的信息进行下一轮摘要，只需要知道上一轮消息产生的链变量。
原本的md5($key+$username)小于512bit，直接用初始的链变量计算一次就计算出了md5值。题目要求enc($username)===enc("guest")，而且$username中要包含admin。我们可以通过填充把username扩展超过512bit，让他进行两次计算，第二次计算使用到的链变量是第一次计算得到的md5($key+guest)覆盖掉原来的链变量让他作为加密admin的链变量，最后把cookie改为这个经过覆盖的链表量+admin的md5加密值。**
