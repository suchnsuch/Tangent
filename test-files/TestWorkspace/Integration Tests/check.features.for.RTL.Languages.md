this document contains features of formatting tested on both RTL and LTR languages, _originally created for Tangent to catch visual bugs._

here's the **report** of problems as of _Tangent v0.10.0_ from most important to least important (as my point of view):

1. `List` indicators are not aligned according to the language direction
2. `TODO lists` have the same problem but a "checked todo item" alignes different 
3.  same problem with `quote` indicator
4. nested tags are weird
5. Inline Latex Equations aligned in reverse

---

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### heading 4
###### heading 6

# عنوان 1
## عنوان 2
### عنوان 3
#### عنوان 4
##### عنوان 5
###### عنوان 6
---

# Inline Formats
this is an example paragraph in which there are **bold**s and _italics_, also ~~overline~~ and ==highlight==, `nothing seems` to be 🟣wrong 🟣 here.  

این یک پاراگراف $مثالی$ است است که شامل متن های **پررنگ**، و _کج_ همچنین ~~رونویس~~ و ==هایلایت== است. `به نظر` چیزی 🟣مشکل 🟣 ندارد.


There can be even MATH! $a^2 + b^2 = c^2$ , well done
حتی در بین متن ریاضی هم میتواند باشد! $a^2 + b^2 = c^2$ خیل خب!

---

# Language Mixing
the word "انسانیت" in Persian means "humanity" or the "quality of being human".

کلمه "humanity" در زبان انگلیسی به معنای "انسانیت" یا "انسان بودن" است
---

# Tags
this article is about the concept of #truth , #concepts/truth  the most important things in our minds.

این مثاله در مورد موضوع #حقیقت ، #مبحث/حقیقت است.
---

# Comments
Chemistry is actually physics // at the level of molecules and atoms
شیمی در واقع همان فیزیک است // اما در سطح موکول ها و اتم ها
---

# Wiki Links
## Normal
RSA encryption algorithm is one of the applications of [[prime factorization]]
الگوریتم رمز نگاری RSA کاربر [[تجزیه به اعداد اول]] است

## Custom Link Text
dad's joke: if [[United States of America|USA]] is so great, why would anyone create [[Universal Synchronous Bus|USB]] ??
جک بی مزه: اگر [[ایالات متحده آمریکا|اما]] انقد خوبه، پس چرا [[بانک ملی ایران|بما]] رو ساختن؟؟

---

# Code
## block
```js
// benchmark log
console.time("log") // start the timer
console.log("I love JS") // code
console.timeEnd("log") // end the timer
```

```js
// بنچمارک لاگ
console.time("log") // شروع زمان 
console.log("I love JS") // کد
console.timeEnd("log") // پایان زمان
```
---

# Lists
- item 1
	- sub item 1
		- sub sub item 1
	- sub item 2
- item 2
- item 3

- مورد 1
	- زیر مورد 1
		- زیر زیر مورد 1
	- زیر مورد 2
- مورد 2
- مورد 3

---

# Todo lists
- [ ] TODO lists
	- [ ] even nested?
- [x] filled 
- [-] cancel?


- [ ] لیست کار
	- [ ] حتی تو در تو؟
- [x] پر شده
- [-] کنسل شده 

---

# Quotes
> Life is like riding a bicycle, if you stop, you fall!

> زندگی شبیه راندن یک دوچرخه است، اگر بایستی، میفتی!