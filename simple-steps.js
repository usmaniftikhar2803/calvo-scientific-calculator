/* Calvo - "Explain it like I'm a child" step viewer.
   Shows a solution ONE step at a time (Next / Back / Show all), and puts a
   plain-language sentence (English or Urdu) above the maths of every step.
   Used by the Derivative, Integral, Limit and Algebra pages. */
(function (root) {
  'use strict';
  var KEY = 'calvo_ss_lang';
  var lang = 'en';
  try { lang = localStorage.getItem(KEY) || (localStorage.getItem('calvo_lang') === 'ur' ? 'ur' : 'en'); } catch (e) {}

  var UI = {
    step: ['Step', 'قدم'], of: ['of', 'از'], next: ['Next step \u25B6', 'اگلا قدم \u25C0'], back: ['\u25C0 Back', '\u25B6 پیچھے'],
    all: ['Show all steps', 'سارے قدم دکھائیں'], again: ['Start again', 'دوبارہ شروع کریں'], ans: ['Show the answer \u25B6', 'جواب دکھائیں \u25C0'],
    skip: ['Skip to answer', 'سیدھا جواب دیکھیں'], final: ['Final answer', 'آخری جواب'], side: ['small side task', 'چھوٹا ذیلی کام'],
    math: ['In maths:', 'ریاضی میں:'], idea: ['The big idea', 'بڑا خیال'], first: ['Tap "Next step" to begin. One step at a time.', '"اگلا قدم" دبائیں اور شروع کریں۔ ایک وقت میں ایک قدم۔'],
    lang: ['اردو', 'English']
  };
  function t(k) { return UI[k][lang === 'ur' ? 1 : 0]; }

  var IDEA = {
    derivative: ['A <b>derivative</b> tells us <b>how fast something is changing</b>, like the speedometer of a car. We solve it in small, easy steps.',
      '<b>ڈیریویٹیو</b> بتاتا ہے کہ کوئی چیز <b>کتنی تیزی سے بدل رہی ہے</b>، جیسے گاڑی کا اسپیڈومیٹر۔ ہم اسے چھوٹے آسان قدموں میں حل کریں گے۔'],
    integral: ['An <b>integral</b> is the <b>opposite of a derivative</b>. It adds up tiny pieces to find the total, like finding the whole distance from the speed. We go one small step at a time.',
      '<b>انٹیگرل</b>، ڈیریویٹیو کا <b>الٹ</b> ہے۔ یہ چھوٹے چھوٹے ٹکڑے جمع کر کے کل مقدار نکالتا ہے، جیسے رفتار سے کل فاصلہ۔ ہم ایک ایک قدم چلیں گے۔'],
    limit: ['A <b>limit</b> asks: <b>what number does the answer get closer and closer to</b> as x gets near a value? Like walking towards a door without touching it yet.',
      '<b>لمٹ</b> پوچھتی ہے: جیسے جیسے x کسی عدد کے <b>قریب</b> جاتا ہے، جواب <b>کس عدد کے قریب</b> جاتا ہے؟ جیسے دروازے کی طرف چلنا مگر ابھی چھوا نہ ہو۔'],
    expand: ['<b>Expanding</b> means opening the brackets. We multiply everything inside with everything else, then add the pieces that look alike.',
      '<b>پھیلانا (Expand)</b> کا مطلب بریکٹ کھولنا ہے۔ ہر چیز کو دوسرے سب سے ضرب دیتے ہیں، پھر ملتے جلتے ٹکڑے جمع کر لیتے ہیں۔'],
    factor: ['<b>Factoring</b> is the opposite of expanding: we pack the expression back into brackets that multiply together, like 6 = 2 \u00d7 3.',
      '<b>فیکٹرنگ</b>، پھیلانے کا الٹ ہے: ہم عبارت کو دوبارہ ضرب والے بریکٹوں میں باندھتے ہیں، جیسے 6 = 2 \u00d7 3۔'],
    simplify: ['<b>Simplifying</b> a fraction means making it as small and neat as possible by crossing out what is the same on top and bottom.',
      'کسر کو <b>آسان کرنا</b> یعنی اوپر اور نیچے جو چیز ایک جیسی ہو اسے کاٹ کر کسر کو چھوٹا اور صاف بنانا۔'],
    partial: ['<b>Partial fractions</b> split one big, scary fraction into small easy fractions that add up to it.',
      '<b>جزوی کسریں</b> ایک بڑی مشکل کسر کو چھوٹی آسان کسروں میں توڑتی ہیں جو جمع ہو کر وہی بن جاتی ہیں۔']
  };

  /* [regex on plain text, English, Urdu, kind filter or null] - first match wins */
  var E = [
    /* ---------- derivative ---------- */
    [/^(\d)(st|nd|rd|th) derivative/, 'We now differentiate the last answer one more time.', 'اب پچھلے جواب کا ایک بار اور ڈیریویٹیو لیتے ہیں۔'],
    [/^The derivative of a constant is 0/, 'This is just a plain number. A plain number never changes, so how fast it changes is 0.', 'یہ صرف ایک سادہ عدد ہے۔ عدد کبھی بدلتا نہیں، اس لیے اس کی تبدیلی کی رفتار 0 ہے۔'],
    [/^d\/d\w\[\w\]\s*=\s*1/, 'The letter on its own grows at speed 1, so its derivative is 1.', 'اکیلا حرف 1 کی رفتار سے بڑھتا ہے، اس لیے اس کا ڈیریویٹیو 1 ہے۔'],
    [/^Sum rule: differentiate/, 'Pieces are joined by + or \u2212. We solve each piece alone, then join the answers.', 'ٹکڑے + یا \u2212 سے جڑے ہیں۔ ہم ہر ٹکڑا الگ حل کرتے ہیں، پھر جوابات جوڑ دیتے ہیں۔'],
    [/^Sum rule: integrate/, 'Pieces are joined by + or \u2212. We integrate each piece alone, then join the answers.', 'ٹکڑے + یا \u2212 سے جڑے ہیں۔ ہم ہر ٹکڑے کا انٹیگرل الگ لیتے ہیں، پھر جوڑ دیتے ہیں۔'],
    [/^Add the results/, 'Now we put the small answers together.', 'اب چھوٹے جوابات کو آپس میں جوڑ دیتے ہیں۔'],
    [/^Constant multiple rule: \u222b/, 'A number is standing in front. It just waits outside. We work on the rest and multiply by that number at the end.', 'آگے ایک عدد کھڑا ہے۔ وہ باہر انتظار کرتا ہے۔ ہم باقی حصہ حل کرتے ہیں اور آخر میں اس عدد سے ضرب دیتے ہیں۔'],
    [/^Constant multiple rule/, 'A number is multiplying the function. It just waits outside. We differentiate the rest and multiply by that number at the end.', 'ایک عدد فنکشن کو ضرب دے رہا ہے۔ وہ باہر انتظار کرتا ہے۔ ہم باقی کا ڈیریویٹیو لیتے ہیں اور آخر میں اس عدد سے ضرب دیتے ہیں۔'],
    [/^Quotient rule/, 'One thing is divided by another, so we use the <b>quotient rule</b>: (top\u2032 \u00d7 bottom \u2212 top \u00d7 bottom\u2032) \u00f7 bottom\u00b2. First we need top\u2032 and bottom\u2032 (how top and bottom change).', 'ایک چیز کو دوسری پر تقسیم کیا جا رہا ہے، اس لیے <b>کوشنٹ رول</b> لگاتے ہیں: (اوپر\u2032 \u00d7 نیچے \u2212 اوپر \u00d7 نیچے\u2032) \u00f7 نیچے\u00b2۔ پہلے اوپر\u2032 اور نیچے\u2032 چاہییں۔'],
    [/^Find [uvw]\u2032/, 'Find how fast this piece is changing. That is its prime (\u2032).', 'معلوم کرتے ہیں کہ یہ ٹکڑا کتنی تیزی سے بدل رہا ہے۔ یہی اس کا پرائم (\u2032) ہے۔'],
    [/^Product rule: \(u/, 'Two things are multiplied, so we take turns: change the first and keep the second, then keep the first and change the second. Add both.', 'دو چیزیں ضرب ہو رہی ہیں، اس لیے باری باری کام کرتے ہیں: پہلی کو بدلیں دوسری رکھیں، پھر پہلی رکھیں دوسری بدلیں۔ دونوں جمع کریں۔'],
    [/^Product rule for several factors/, 'Many things are multiplied. Change one at a time and keep the others the same, then add all the results.', 'کئی چیزیں ضرب ہو رہی ہیں۔ ایک ایک کو بدلیں باقی ویسی ہی رکھیں، پھر سب جوابات جمع کریں۔'],
    [/^Differentiate .*:$/, 'Change just this one factor and keep the others as they are.', 'صرف اسی ایک فیکٹر کو بدلیں اور باقی ویسے ہی رہنے دیں۔'],
    [/^Power rule: \(x/, 'A letter with a power: bring the power down in front, then make the power 1 smaller. Example: x\u00b3 becomes 3x\u00b2.', 'حرف کے ساتھ پاور ہے: پاور کو نیچے لا کر آگے لگائیں، پھر پاور کو 1 کم کر دیں۔ مثال: x\u00b3 سے 3x\u00b2 بنتا ہے۔'],
    [/^Chain rule with the power rule/, 'There is a bracket with a power. First treat the bracket like one block and use the power rule. Then multiply by how fast the inside changes (u\u2032).', 'بریکٹ پر پاور ہے۔ پہلے بریکٹ کو ایک ڈبہ سمجھ کر پاور رول لگائیں۔ پھر اندر کی تبدیلی (u\u2032) سے ضرب دیں۔'],
    [/^Exponential rule: \(e/, 'e to a power stays the same. Then multiply by how fast the power changes (u\u2032).', 'e کی پاور ویسی ہی رہتی ہے۔ پھر پاور کی تبدیلی (u\u2032) سے ضرب دیں۔'],
    [/^Exponential rule/, 'A number to the power x stays the same, and we multiply by ln of that number and by u\u2032.', 'کسی عدد کی پاور x ویسی ہی رہتی ہے، اور ہم اس عدد کے ln اور u\u2032 سے ضرب دیتے ہیں۔'],
    [/^Logarithmic differentiation/, 'Both the base and the power have x in them. This needs a special shortcut formula, shown here.', 'بیس اور پاور دونوں میں x ہے۔ اس کے لیے ایک خاص شارٹ کٹ فارمولا چاہیے، جو یہاں لکھا ہے۔'],
    [/^Standard derivative/, 'This is a formula we simply remember, like a multiplication table.', 'یہ ایسا فارمولا ہے جو ہمیں یاد رکھنا ہوتا ہے، جیسے پہاڑے۔'],
    [/^Chain rule:/, 'One function sits inside another, like sin(3x). Change the outside, keep the inside, then multiply by how fast the inside changes (u\u2032).', 'ایک فنکشن دوسرے کے اندر ہے، جیسے sin(3x)۔ باہر والے کو بدلیں، اندر والا رکھیں، پھر اندر کی تبدیلی (u\u2032) سے ضرب دیں۔'],
    [/^So d\/d\w/, 'We put the pieces we found into the rule. This is the answer for this part.', 'جو ٹکڑے ملے وہ رول میں رکھ دیے۔ یہ اس حصے کا جواب ہے۔'],
    /* ---------- integral ---------- */
    [/^Constant rule/, 'Integrating a plain number c gives c times x.', 'سادہ عدد c کا انٹیگرل c ضرب x ہوتا ہے۔'],
    [/^Expand first/, 'First open the brackets so every piece becomes easy.', 'پہلے بریکٹ کھولتے ہیں تاکہ ہر ٹکڑا آسان ہو جائے۔'],
    [/^Substitution/, 'The inside part makes it hard, so we give it a short new name, u. We solve using u, then put the old name back.', 'اندر والا حصہ مشکل بنا رہا ہے، اس لیے اسے چھوٹا نیا نام u دیتے ہیں۔ u میں حل کرتے ہیں، پھر پرانا نام واپس رکھتے ہیں۔'],
    [/^The integral becomes/, 'Now the problem looks much simpler.', 'اب سوال بہت آسان نظر آ رہا ہے۔'],
    [/^Substitute back/, 'Put the original expression back in place of u.', 'u کی جگہ اصل عبارت واپس رکھ دیتے ہیں۔'],
    [/^Integration by parts twice/, 'We use "by parts" two times. The first integral comes back, so we solve for it like a small equation.', '"بائی پارٹس" دو بار لگاتے ہیں۔ پہلا انٹیگرل واپس آ جاتا ہے، تو اسے چھوٹی مساوات کی طرح حل کرتے ہیں۔'],
    [/^Integration by parts/, 'Two things are multiplied. We use \u222bu dv = uv \u2212 \u222bv du: pick one part to differentiate (u) and one to integrate (dv).', 'دو چیزیں ضرب ہیں۔ ہم \u222bu dv = uv \u2212 \u222bv du استعمال کرتے ہیں: ایک حصہ ڈیریویٹیو کے لیے (u) اور ایک انٹیگرل کے لیے (dv) چنتے ہیں۔'],
    [/^Then du =/, 'Now find du (change u) and v (integrate dv).', 'اب du (u کا ڈیریویٹیو) اور v (dv کا انٹیگرل) نکالتے ہیں۔'],
    [/^Product-to-sum/, 'Turn the multiplication of sin and cos into an addition using an identity. Additions are easy to integrate.', 'sin اور cos کی ضرب کو ایک فارمولے سے جمع میں بدلتے ہیں۔ جمع کا انٹیگرل آسان ہوتا ہے۔'],
    [/^Odd power of/, 'One power is odd. Keep one factor aside, use sin\u00b2 + cos\u00b2 = 1 for the rest, then use u.', 'ایک پاور طاق ہے۔ ایک فیکٹر الگ رکھیں، باقی کے لیے sin\u00b2 + cos\u00b2 = 1 استعمال کریں، پھر u لگائیں۔'],
    [/^Even powers/, 'The powers are even, so we use the half-angle formulas to make the powers smaller.', 'پاورز جفت ہیں، اس لیے آدھے زاویے کے فارمولوں سے پاور کم کرتے ہیں۔'],
    [/^Use 1 \+ (tan|cot)/, 'We use an identity to rewrite it as something we know how to integrate.', 'ایک فارمولے سے اسے ایسی شکل میں لکھتے ہیں جس کا انٹیگرل ہمیں آتا ہے۔'],
    [/^Polynomial division/, 'The top is as big as (or bigger than) the bottom, so first divide, like long division. We get an easy part and a small leftover fraction.', 'اوپر والا حصہ نیچے کے برابر یا بڑا ہے، اس لیے پہلے تقسیم کرتے ہیں۔ ایک آسان حصہ اور بچی ہوئی چھوٹی کسر ملتی ہے۔'],
    [/^Partial fractions\./, 'We factor the bottom, then break the big fraction into small easy fractions.', 'نیچے والے حصے کے فیکٹر نکالتے ہیں، پھر بڑی کسر کو چھوٹی آسان کسروں میں توڑتے ہیں۔'],
    [/Multiply out and compare coefficients/, 'We write small fractions with unknown numbers (A, B, ...) and find them by matching both sides.', 'چھوٹی کسریں نامعلوم اعداد (A, B, ...) کے ساتھ لکھتے ہیں اور دونوں طرف ملا کر انہیں ڈھونڈتے ہیں۔'],
    [/^Integrate each fraction/, 'Now we integrate each small fraction one by one.', 'اب ہر چھوٹی کسر کا انٹیگرل ایک ایک کر کے لیتے ہیں۔'],
    [/^Complete the square|does not factor over the rationals/, 'The bottom can\u2019t be split, so we rewrite it as (something)\u00b2 + a number and use a known formula.', 'نیچے والا حصہ توڑا نہیں جا سکتا، اس لیے اسے (کچھ)\u00b2 + عدد لکھ کر معلوم فارمولا لگاتے ہیں۔'],
    [/: \u222b 1\/\(/, '\u222b of 1 over something gives ln of that something.', '\u222b 1 تقسیم کسی چیز کا جواب اس چیز کا ln ہوتا ہے۔'],
    [/power rule gives/, 'Power rule for integrals: add 1 to the power and divide by the new power.', 'انٹیگرل کا پاور رول: پاور میں 1 جمع کریں اور نئی پاور سے تقسیم کریں۔'],
    [/integrates to/, 'The integral of this part is shown on the right.', 'اس حصے کا انٹیگرل دائیں طرف لکھا ہے۔'],
    [/^\u222b .* = /, 'This is a formula we remember. (Check it: differentiate the answer and you get the original back!)', 'یہ فارمولا ہمیں یاد ہوتا ہے۔ (جانچیں: جواب کا ڈیریویٹیو لیں تو اصل واپس مل جائے گا!)'],
    [/^Power rule: \u222b/, 'A letter with a power: make the power 1 bigger, then divide by the new power. Example: x\u00b2 becomes x\u00b3 \u00f7 3.', 'حرف کے ساتھ پاور ہے: پاور میں 1 جمع کریں، پھر نئی پاور سے تقسیم کریں۔ مثال: x\u00b2 سے x\u00b3 \u00f7 3 بنتا ہے۔'],
    [/^Standard integral/, 'This is a formula we remember. (Check it: differentiate the answer and you get the original back!)', 'یہ فارمولا ہمیں یاد ہوتا ہے۔ (جانچیں: جواب کا ڈیریویٹیو لیں تو اصل واپس مل جائے گا!)'],
    [/^This expression has no factors with rational/, 'Nothing more can be split out. It is already as factored as it can be.', 'اس میں مزید فیکٹر نہیں نکل سکتے۔ یہ پہلے ہی جتنا ممکن تھا فیکٹر ہو چکا ہے۔'],
    [/^(constant|x\S*): .* = /, 'This line says: the numbers in front of this power of x must be the same on both sides.', 'یہ لائن کہتی ہے: x کی اس پاور کے آگے والے اعداد دونوں طرف ایک جیسے ہونے چاہییں۔'],
    [/^So \u222b/, 'Put it together: this is the new, simpler problem.', 'سب کو جوڑ کر نیا اور آسان سوال بنتا ہے۔'],
    /* ---------- limits ---------- */
    [/^Find lim/, 'We want to know which number the answer gets closer and closer to when x gets near the given value.', 'ہم جاننا چاہتے ہیں کہ جب x دیے گئے عدد کے قریب پہنچتا ہے تو جواب کس عدد کے قریب جاتا ہے۔'],
    [/^Direct substitution fails/, 'Oops! Putting the number in breaks the maths (like 0 \u00f7 0 or dividing by 0). So we need a trick.', 'اوہ! عدد رکھنے سے حساب ٹوٹ جاتا ہے (جیسے 0 \u00f7 0 یا 0 سے تقسیم)۔ اس لیے ہمیں ایک ترکیب چاہیے۔'],
    [/^Direct substitution/, 'Easiest first try: just put the number in place of x.', 'سب سے آسان پہلی کوشش: x کی جگہ سیدھا عدد رکھ دیں۔'],
    [/^The result is a finite number/, 'We got a normal number, nothing tricky happened. That number is the answer.', 'ایک عام عدد مل گیا، کوئی مشکل نہیں آئی۔ وہی عدد جواب ہے۔'],
    [/^Both top and bottom are 0/, 'Top is 0 and bottom is 0 (0 \u00f7 0). That is a puzzle, not an answer. A shared factor is hiding, so we factor and cancel it.', 'اوپر 0 اور نیچے بھی 0 ہے (0 \u00f7 0)۔ یہ پہیلی ہے، جواب نہیں۔ ایک مشترک فیکٹر چھپا ہے، اس لیے فیکٹر کر کے کاٹتے ہیں۔'],
    [/^(Numerator|Denominator) =/, 'Here are the top and bottom written as multiplications (factors).', 'یہ اوپر اور نیچے والے حصے ضرب (فیکٹر) کی شکل میں ہیں۔'],
    [/^After cancelling/, 'We crossed out the same factor from top and bottom. The trouble is gone!', 'اوپر اور نیچے سے ایک جیسا فیکٹر کاٹ دیا۔ مسئلہ ختم!'],
    [/^Now substitute/, 'Now put the number in again. This time it works.', 'اب دوبارہ عدد رکھتے ہیں۔ اس بار حساب چل جاتا ہے۔'],
    [/Use L\u2019H\u00f4pital/, 'Top and bottom both go to 0 (or both get huge). That is a puzzle, so we use a shortcut (L\u2019H\u00f4pital): find how fast top and bottom change, and use those instead.', 'اوپر اور نیچے دونوں 0 کی طرف جاتے ہیں (یا دونوں بہت بڑے ہو جاتے ہیں)۔ یہ پہیلی ہے، اس لیے شارٹ کٹ (L\u2019H\u00f4pital) لگاتے ہیں: اوپر اور نیچے کی تبدیلی نکال کر وہی استعمال کرتے ہیں۔'],
    [/^(Differentiate: )?N\u2032 =/, 'These are the new top (N\u2032) and the new bottom (D\u2032).', 'یہ نیا اوپر (N\u2032) اور نیا نیچے (D\u2032) ہے۔'],
    [/^Still 0\/0/, 'Still 0 \u00f7 0, so we do the shortcut one more time.', 'ابھی بھی 0 \u00f7 0 ہے، اس لیے شارٹ کٹ ایک بار اور لگاتے ہیں۔'],
    [/^L\u2019H\u00f4pital: differentiate/, 'We use the shortcut: find how fast top and bottom change.', 'شارٹ کٹ لگاتے ہیں: اوپر اور نیچے کی تبدیلی نکالتے ہیں۔'],
    [/^The top tends to/, 'The top goes to a normal number but the bottom goes to 0. Dividing by something tiny makes the answer huge, so it blows up. The + or \u2212 sign depends on which side we come from.', 'اوپر والا عام عدد کی طرف جاتا ہے مگر نیچے والا 0 کی طرف۔ بہت چھوٹی چیز سے تقسیم کرنے پر جواب بہت بڑا ہو جاتا ہے۔ + یا \u2212 کا نشان اس بات پر ہے کہ ہم کس طرف سے آ رہے ہیں۔'],
    [/^From the left the values/, 'We look from the left side and from the right side.', 'ہم بائیں طرف سے بھی دیکھتے ہیں اور دائیں طرف سے بھی۔'],
    [/^Check both sides/, 'We check what happens from the left and from the right.', 'ہم دیکھتے ہیں کہ بائیں اور دائیں طرف سے کیا ہوتا ہے۔'],
    [/^A limit exists only when/, 'A limit exists only if left and right agree. They do not agree here, so there is no limit.', 'لمٹ تب ہی ہوتی ہے جب بائیں اور دائیں طرف کا جواب ایک ہو۔ یہاں ایک نہیں، اس لیے لمٹ موجود نہیں۔'],
    [/^Approaching from the/, 'We come from one side only, so the answer is clear.', 'ہم صرف ایک طرف سے آ رہے ہیں، اس لیے جواب صاف ہے۔'],
    [/^Both sides agree/, 'Both sides go to the same place, so that is the limit.', 'دونوں طرف ایک ہی جگہ جا رہی ہیں، وہی لمٹ ہے۔'],
    [/^The form is 0 \u00d7 \u221e/, 'Zero times something huge is a puzzle. We turn it into a fraction and use the shortcut.', 'صفر ضرب بہت بڑی چیز ایک پہیلی ہے۔ اسے کسر بنا کر شارٹ کٹ لگاتے ہیں۔'],
    [/^Simplify and substitute/, 'Tidy it up and put the number in.', 'اسے صاف کر کے عدد رکھ دیتے ہیں۔'],
    [/^This is a fraction of polynomials/, 'x is going to infinity. In a fraction like this only the biggest power of x matters. The small parts become unimportant.', 'x لامحدود کی طرف جا رہا ہے۔ ایسی کسر میں صرف x کی سب سے بڑی پاور اہم ہوتی ہے۔ چھوٹے حصے بے معنی ہو جاتے ہیں۔'],
    [/^Top degree &lt;|^Top degree </, 'The bottom grows faster than the top, so the fraction shrinks to 0.', 'نیچے والا اوپر سے تیز بڑھتا ہے، اس لیے کسر سکڑ کر 0 ہو جاتی ہے۔'],
    [/^Equal degrees/, 'Top and bottom grow equally fast. The answer is the numbers in front of the biggest powers, as a fraction.', 'اوپر اور نیچے برابر تیزی سے بڑھتے ہیں۔ جواب سب سے بڑی پاور کے آگے والے اعداد کی کسر ہے۔'],
    [/^Top degree >/, 'The top grows faster than the bottom, so the fraction keeps getting bigger and bigger (infinity).', 'اوپر والا نیچے سے تیز بڑھتا ہے، اس لیے کسر بڑی ہوتی ہی جاتی ہے (انفنٹی)۔'],
    [/^Now look at/, 'Now look at the new fraction as x gets huge.', 'اب نئی کسر کو دیکھتے ہیں جب x بہت بڑا ہو جائے۔'],
    [/^(Calvo estimates|Exact algebra rules did not)/, 'We could not solve this exactly, so we try numbers very close and watch where they go. This is a good guess, not a proof.', 'ہم اسے بالکل درست طریقے سے حل نہیں کر سکے، اس لیے بہت قریب کے اعداد آزما کر دیکھتے ہیں کہ وہ کہاں جاتے ہیں۔ یہ اچھا اندازہ ہے، ثبوت نہیں۔'],
    [/keep swinging/, 'The answers keep jumping up and down and never settle, so there is no limit.', 'جوابات بار بار اوپر نیچے ہوتے رہتے ہیں اور ٹھہرتے نہیں، اس لیے لمٹ نہیں ہے۔'],
    /* ---------- algebra ---------- */
    [/^Start with/, 'This is what we start with.', 'ہم یہاں سے شروع کرتے ہیں۔'],
    [/^Use the binomial theorem/, 'To open a bracket with a power we use a ready-made pattern (the binomial theorem).', 'پاور والا بریکٹ کھولنے کے لیے ایک تیار پیٹرن (بائنومیل تھیورم) استعمال کرتے ہیں۔'],
    [/^Multiply every term of each bracket/, 'Multiply everything in one bracket with everything in the other bracket.', 'ایک بریکٹ کی ہر چیز کو دوسرے بریکٹ کی ہر چیز سے ضرب دیں۔'],
    [/^Collect like terms/, 'Now add together the pieces that look alike (same letter, same power).', 'اب ملتے جلتے ٹکڑے (ایک جیسا حرف، ایک جیسی پاور) جمع کریں۔'],
    [/^Take out the common factor/, 'Every piece shares something. We pull it out in front, like putting it outside a bracket.', 'ہر ٹکڑے میں ایک چیز مشترک ہے۔ اسے بریکٹ کے باہر آگے نکال لیتے ہیں۔'],
    [/^Rational root test/, 'Try a smart guess for x. If putting it in makes everything 0, we have found a factor.', 'x کے لیے ایک سمجھدار اندازہ آزمائیں۔ اگر رکھنے سے سب 0 ہو جائے تو فیکٹر مل گیا۔'],
    [/^(Divide it out|What is left)/, 'We divide that factor out. This is what is left.', 'اس فیکٹر سے تقسیم کرتے ہیں۔ یہ باقی بچا ہے۔'],
    [/^Found a quadratic factor/, 'By trying whole numbers we found a bigger factor.', 'پورے اعداد آزما کر ایک بڑا فیکٹر مل گیا۔'],
    [/has discriminant/, 'We check if this piece can be split more. It cannot, so we leave it.', 'ہم دیکھتے ہیں کہ کیا یہ ٹکڑا مزید توڑا جا سکتا ہے۔ نہیں، اس لیے اسے ایسے ہی چھوڑ دیتے ہیں۔'],
    [/^Factor by grouping/, 'Group the pieces in pairs and pull out what each pair shares. The same bracket appears twice, so we pull that out too.', 'ٹکڑوں کو جوڑیوں میں رکھیں اور ہر جوڑی کی مشترک چیز نکالیں۔ ایک ہی بریکٹ دو بار آتا ہے، اسے بھی باہر نکال لیں۔'],
    [/^Every term has total degree/, 'All pieces have the same total power. We set one letter to 1, factor, then put the letter back.', 'سب ٹکڑوں کی کل پاور ایک جیسی ہے۔ ایک حرف کو 1 رکھ کر فیکٹر کرتے ہیں، پھر حرف واپس لگا دیتے ہیں۔'],
    [/^Final answer/, 'This is the factorised answer.', 'یہ فیکٹر کی شکل میں جواب ہے۔'],
    [/^Check: multiplying/, 'Check: if we multiply the factors back we get the original. So it is right!', 'جانچ: فیکٹر واپس ضرب دیں تو اصل مل جاتا ہے۔ یعنی جواب درست ہے!'],
    [/^Expand all brackets/, 'Open all the brackets, then add the pieces that look alike.', 'سارے بریکٹ کھولیں، پھر ملتے جلتے ٹکڑے جمع کریں۔'],
    [/^Result:/, 'Here is the result of this part.', 'اس حصے کا نتیجہ یہ ہے۔'],
    [/^Write everything as one fraction/, 'To add fractions the bottoms must match. We make one single fraction with a common bottom.', 'کسریں جمع کرنے کے لیے نیچے والے حصے ایک جیسے ہونے چاہییں۔ مشترک نیچے کے ساتھ ایک ہی کسر بناتے ہیں۔'],
    [/^Factor the numerator and the denominator/, 'Write the top and the bottom as multiplications (factors).', 'اوپر اور نیچے والے حصے کو ضرب (فیکٹر) کی شکل میں لکھیں۔'],
    [/^Cancel the common factor/, 'Anything that is the same on top and bottom can be crossed out.', 'اوپر اور نیچے جو چیز ایک جیسی ہو اسے کاٹ سکتے ہیں۔'],
    [/^Note: the original expression is not defined/, 'Careful: the original is not allowed to use these values, because it would divide by 0.', 'احتیاط: اصل سوال میں یہ قدریں نہیں رکھ سکتے کیونکہ 0 سے تقسیم ہو جائے گی۔'],
    [/^There is no common factor/, 'There is nothing to cross out. The fraction is already as simple as possible.', 'کاٹنے کے لیے کچھ نہیں۔ کسر پہلے ہی سب سے آسان ہے۔'],
    [/^Multiplied out/, 'The same answer, with the brackets opened.', 'وہی جواب، بریکٹ کھول کر۔'],
    [/improper fraction/, 'The top is bigger than the bottom, so we divide first (like 7 \u00f7 2 = 3 remainder 1).', 'اوپر والا حصہ نیچے سے بڑا ہے، اس لیے پہلے تقسیم کرتے ہیں (جیسے 7 \u00f7 2 = 3 باقی 1)۔'],
    [/^Factor the denominator/, 'First we factor the bottom of the fraction.', 'پہلے کسر کے نیچے والے حصے کے فیکٹر نکالتے ہیں۔'],
    [/^Write the shape of the answer/, 'We guess the shape of the answer: small fractions with unknown numbers A, B, C.', 'جواب کی شکل کا اندازہ لگاتے ہیں: نامعلوم اعداد A, B, C والی چھوٹی کسریں۔'],
    [/^Multiply both sides by the denominator/, 'Multiply both sides by the bottom so the fractions disappear.', 'دونوں طرف نیچے والے حصے سے ضرب دیں تاکہ کسریں ختم ہو جائیں۔'],
    [/^Match the coefficients/, 'Both sides must be equal, so the numbers in front of each power of x must match. This gives small equations.', 'دونوں طرف برابر ہونا چاہیے، اس لیے x کی ہر پاور کے آگے والے اعداد ملنے چاہییں۔ اس سے چھوٹی مساواتیں بنتی ہیں۔'],
    [/^Solve these equations/, 'Solve the small equations to find A, B, C.', 'چھوٹی مساواتیں حل کر کے A, B, C معلوم کریں۔'],
    [/^Put the numbers back/, 'Put the numbers we found back into the small fractions.', 'جو اعداد ملے وہ چھوٹی کسروں میں واپس رکھ دیں۔'],
    [/^Check: adding these fractions/, 'Check: adding these small fractions gives the original. So it is right!', 'جانچ: یہ چھوٹی کسریں جمع کریں تو اصل مل جاتا ہے۔ یعنی جواب درست ہے!'],
    [/^The top and bottom share a common factor, so reduce/, 'Top and bottom share a factor, so we reduce the fraction first.', 'اوپر اور نیچے ایک فیکٹر مشترک ہے، اس لیے پہلے کسر کو چھوٹا کرتے ہیں۔'],
    [/^Nothing is left over/, 'Nothing is left over, so the quotient is the whole answer.', 'کچھ باقی نہیں بچا، اس لیے خارج قسمت ہی پورا جواب ہے۔'],
    [/^Now split/, 'Now we split the leftover fraction.', 'اب بچی ہوئی کسر کو توڑتے ہیں۔'],
    [/^Divide the top|^Divide/, 'We divide to make it simpler.', 'اسے آسان کرنے کے لیے تقسیم کرتے ہیں۔']
  ];

  var tmp = null;
  function plain(html) {
    if (!tmp) tmp = document.createElement('div');
    tmp.innerHTML = String(html);
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function explain(html) {
    var p = plain(html);
    for (var i = 0; i < E.length; i++) if (E[i][0].test(p)) return E[i][lang === 'ur' ? 2 : 1];
    return null;
  }

  function mount(el, o) {
    var steps = o.steps || [], total = steps.length, n = total ? 1 : 1 + total;
    function card(s, i) {
      var say = explain(s.html), side = s.lvl > 0 ? ' <span class="ss-side">' + t('side') + '</span>' : '';
      var urc = lang === 'ur' ? ' ss-ur' : '';
      return '<div class="ss-card' + (i === n - 1 ? ' ss-new' : '') + '" style="margin-left:' + Math.min(s.lvl, 3) * 14 + 'px">' +
        '<div class="ss-head"><span class="ss-num">' + t('step') + ' ' + (i + 1) + ' ' + t('of') + ' ' + total + '</span>' + side + '</div>' +
        (say ? '<div class="ss-say' + urc + '">' + say + '</div><div class="ss-math"><span class="ss-lab">' + t('math') + '</span> ' + s.html + '</div>'
             : '<div class="ss-math ss-only">' + s.html + '</div>') + '</div>';
    }
    function render() {
      var h = '<div class="ss-top"><div class="ss-idea' + (lang === 'ur' ? ' ss-ur' : '') + '"><b>' + t('idea') + ':</b> ' + IDEA[o.kind][lang === 'ur' ? 1 : 0] + '</div>' +
        '<button type="button" class="ss-lang" data-ss="lang">' + t('lang') + '</button></div>';
      var show = Math.min(n, total);
      for (var i = 0; i < show; i++) h += card(steps[i], i);
      var atAnswer = n > total;
      if (atAnswer) h += '<div class="ss-final"><div class="ss-final-t">\uD83C\uDF89 ' + t('final') + '</div>' + (o.answerHtml || '') + '</div>';
      h += '<div class="ss-nav">';
      if (n > 1) h += '<button type="button" class="btn ghost" data-ss="back">' + t('back') + '</button>';
      if (!atAnswer) h += '<button type="button" class="btn" data-ss="next">' + (n >= total ? t('ans') : t('next')) + '</button>';
      if (!atAnswer && total > 1 && n < total) h += '<button type="button" class="btn ghost" data-ss="all">' + t('all') + '</button>';
      if (!atAnswer && n < total) h += '<button type="button" class="btn ghost" data-ss="skip">' + t('skip') + '</button>';
      if (n > 1) h += '<button type="button" class="btn ghost" data-ss="again">' + t('again') + '</button>';
      h += '</div>';
      el.innerHTML = h;
      var nw = el.querySelector('.ss-new');
      if (nw && n > 1 && nw.scrollIntoView) { try { nw.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    }
    el.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-ss]') : null;
      if (!b) return;
      var a = b.getAttribute('data-ss');
      if (a === 'next') n = Math.min(n + 1, total + 1);
      else if (a === 'back') n = Math.max(1, n - 1);
      else if (a === 'all') n = total;
      else if (a === 'skip') n = total + 1;
      else if (a === 'again') n = 1;
      else if (a === 'lang') { lang = lang === 'ur' ? 'en' : 'ur'; try { localStorage.setItem(KEY, lang); } catch (er) {} }
      render();
    };
    render();
  }

  root.SimpleSteps = { mount: mount, explain: explain, _E: E };
})(typeof window !== 'undefined' ? window : globalThis);
