---
title: "ISCC 2019 MISC: Encoding, Steganography and Reconstruction"
title_zh: "ISCC 2019 MISC：编码、隐写与碎片重组"
lang: zh-CN
archived: true
privacy_reviewed: true
original_title: ISCC 2019-MISC
date: 2019-05-14 19:29:00
slug: ISCC2019-MISC
permalink: writing/ISCC2019-MISC/
topic: CTF
summary: "Five challenge notes covering encodings, image fragments, keyboard traces and Python-assisted analysis."
summary_zh: "记录五道杂项题的推理与操作，从进制转换、最低位隐写和键盘轨迹，到 GIF 中的密文线索与碎片图像重组，包含用于解码和拼图的 Python 代码。"
format_label: CTF write-up
featured_rank: 0
missing_images: 5
withheld_images: 0
recovered_images: 0
tags: CTF
---

## Misc

### 1

进制——>ASCII——>base64

```python
import base64
str = '0126 062 0126 0163 0142 0103 0102 0153 0142 062 065 0154 0111 0121 0157 0113 0111 0105 0132 0163 0131 0127 0143 066 0111 0105 0154 0124 0121 060 0116 067 0124 0152 0102 0146 0115 0107 065 0154 0130 062 0116 0150 0142 0154 071 0172 0144 0104 0102 0167 0130 063 0153 0167 0144 0130 060 0113'
tmp = str.split( )
flag = ''
for i in tmp:
    flag += chr(int(i, 8))
print(base64.b64decode(flag))
```

### 2

StegSolve——>data analyze——>字符颠倒
[![历史配图暂缺](redacted-image:missing)](https://example.invalid/withheld-figure "倒立屋")
将图片在Steg中数据分析调至最低位，会发现第一行有一串很像flag的字符，尝试提交报错，更改格式报错，再结合题目，倒立屋，尝试将字符串颠倒过来提交，即按从右往左的顺序，发现对了（这道题的flag有点东西）

### 3

提取——>联想——>比划
在附件中我们发现有{}，不难猜到肯定是flag，我们进行提取得到

```txt
{WSXIUYHNBVTRFVBTRFVBQWERTYQAZSCEWSXCDEEFVTYHNMKJTGBNMJUYGRDXCVBMNBVCDRTGHUWSXCFEQWERTYTRFVBWSXNBVCXSWERFRFVGYHNWSXCDEMNBVCDRTGHU}
```

这么长一串，但是看起来又不像加密过的，回到原题“Keyes' secret”，联想一下,key会不会是keyboard,再观察提取的字符，突然发现这些字母连起来在键盘上画出来是会是其他的字母形状，

```
WSX----------------------I
IUYHNBV---------------S
TRFVB------------------C
QAZSEC----------------K
WSXCDE---------------E
EFVT---------------------Y
YHNMKJ----------------B
TGBNMJU--------------O
GRDXCVB--------------A
MNBVCDRTGHU-----R
WSXCFE----------------D
NBVCXSWERF--------P
RFVGYHN--------------H
MNBVCDRTGHU-----R
```

以上就是键盘中的秘密

### 4

题目——>winhex——>AES+key解密
观察题目有三个比较敏感的字母AES，不难猜到这道题是AES解码，既然解码就要找到密文，故我们将GIF动图放到winhex中，发现最低端有一行特立独行的密文，[![历史配图暂缺](redacted-image:missing)](https://example.invalid/withheld-figure "winhex")
进行解码，发现需要提供key,猜想这是什么比赛，哦,ISCC，尝试设置为ISCC，解码，
[![历史配图暂缺](redacted-image:missing)](https://example.invalid/withheld-figure "AES")发现成功了，再次进行解码，得到flag

### 5

binwalk——>python3
用过很多信息隐藏提取的工具都没有用，经过尝试，发现binwalk可以将此图分离
[![历史配图暂缺](redacted-image:missing)](https://example.invalid/withheld-figure "binwalk")
得到10个碎片图
并且得到一张说明提示

```txt
纸机中居然是一堆黑色和白色的碎片，但是这些碎片之中到底会有什么样的宝藏呢？

我去问了欧鹏·曦文同学，他说他有办法恢复拼图原貌，但是前提是要我把真正有用的东西给他。
```

附脚本

```python
from PIL import Image

flag_pic = Image.new("RGBA",(143,50),(255,255,255))

for fn in range(1,11):  #循环出现文件名的后缀数字

    fp=open(r'./fixtures/puzzle'+str(fn)+'.jpg','rb')  #此处为文件路径及文件名

    all_data=bytearray(fp.read())

    data=all_data[-1250:]                           #读图片最后1250位

    pic = Image.new("RGBA",(50,50),(255,255,255))   #新建图像对象,RGBA通道,xy轴为50,颜色为white(255,255,255)

    dex=0                                           #初始化标记位为0

    for i in range(0,25):

        for j in range(0,25):                       #两层循环,写入图片上半部分颜色

            pic.putpixel((j,i),(255-data[dex],255-data[dex],255-data[dex])) #设置坐标(j,i) 颜色为(255-data[dex],255-data[dex],255-data[dex])

            dex=dex+1                                                       #标记位+1

    for i in range(25):

        for j in range(0,25):                       #两层循环,写入图片下半部分颜色

            pic.putpixel((j,i+25),(255-data[dex],255-data[dex],255-data[dex]))  #设置坐标(j,i+25) RGB值同上

            dex=dex+1                                                       #标记位+1

    for y in range(0,50):

        for x in range(0,13,1):

            if pic.getpixel((x,y)) < pic.getpixel((x+13,y)):    #若x轴0~12的像素值 小于 13~25的值,则写入 0~12的像素值

                flag_pic.putpixel((x+fn*13,y),pic.getpixel((x,y)))

            else:                                               #否则写入后 13~25的像素值

                flag_pic.putpixel((x+fn*13,y),pic.getpixel((x+13,y)))

flag_pic.show()
```

得出
[![历史配图暂缺](redacted-image:missing)](https://example.invalid/withheld-figure "欧鹏·曦文")
