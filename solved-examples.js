/* Step-by-step solved examples for formulas (English + Urdu), shown inside the
   formula light-bulb box under the Urdu note. Keyed by the SAME normalised
   formula name as urdu-notes.js, so one example can serve several formula names.
   To add one more example, add a row to ROWS:
   [ "key1 key2", "English question", "اردو سوال", "given", "find", "formula", "substitution (string or [lines])", "answer" ]  */
(function () {
  var ROWS = [
    /* ---------------- PHYSICS ---------------- */
    ["newtons2ndlaw", "A force of 20 N acts on a 5 kg block. Find its acceleration.", "5 کلوگرام کے بلاک پر 20 نیوٹن کی قوت لگتی ہے۔ اس کا اسراع معلوم کریں۔", "F = 20 N, m = 5 kg", "a", "F = ma, so a = F / m", "a = 20 / 5", "a = 4 m/s²"],
    ["firstequationofmotion equationsofmotion", "A car starts from rest and accelerates at 2 m/s² for 5 s. Find its final speed.", "ایک کار ساکن حالت سے چل کر 5 سیکنڈ تک 2 m/s² کے اسراع سے چلتی ہے۔ اس کی آخری رفتار معلوم کریں۔", "u = 0, a = 2 m/s², t = 5 s", "v", "v = u + at", "v = 0 + (2)(5)", "v = 10 m/s"],
    ["secondequationofmotion displacement", "A bike starts from rest with a = 3 m/s². How far does it go in 4 s?", "ایک موٹر سائیکل ساکن حالت سے 3 m/s² کے اسراع سے چلتی ہے۔ 4 سیکنڈ میں وہ کتنا فاصلہ طے کرے گی؟", "u = 0, a = 3 m/s², t = 4 s", "s", "s = ut + ½at²", ["s = (0)(4) + ½(3)(4)²", "s = ½ × 3 × 16"], "s = 24 m"],
    ["thirdequationofmotion v2formula", "A car moving at 20 m/s brakes to a stop in 50 m. Find the acceleration.", "20 m/s کی رفتار سے چلتی کار بریک لگا کر 50 میٹر میں رک جاتی ہے۔ اسراع معلوم کریں۔", "u = 20 m/s, v = 0, s = 50 m", "a", "v² = u² + 2as, so a = (v² − u²) / 2s", ["a = (0 − 400) / (2 × 50)", "a = −400 / 100"], "a = −4 m/s² (retardation of 4 m/s²)"],
    ["momentum", "Find the momentum of a 1200 kg car moving at 15 m/s.", "1200 کلوگرام کی کار 15 m/s سے چل رہی ہے۔ اس کا مومنٹم معلوم کریں۔", "m = 1200 kg, v = 15 m/s", "p", "p = mv", "p = 1200 × 15", "p = 18000 kg·m/s"],
    ["impulse", "A force of 50 N acts on a ball for 0.2 s. Find the impulse.", "ایک گیند پر 50 نیوٹن کی قوت 0.2 سیکنڈ تک لگتی ہے۔ تحرک (impulse) معلوم کریں۔", "F = 50 N, t = 0.2 s", "Impulse", "Impulse = F × t", "Impulse = 50 × 0.2", "Impulse = 10 N·s"],
    ["friction coefficientoffriction", "A 10 kg box rests on a floor with μ = 0.3. Find the friction force (g = 10 m/s²).", "10 کلوگرام کا ڈبہ فرش پر رکھا ہے جہاں μ = 0.3 ہے۔ رگڑ کی قوت معلوم کریں (g = 10 m/s²)۔", "m = 10 kg, μ = 0.3, g = 10 m/s²", "f", "f = μN, and on a flat floor N = mg", ["N = 10 × 10 = 100 N", "f = 0.3 × 100"], "f = 30 N"],
    ["workdone", "A 40 N force pulls a box 5 m at 60° to the ground. Find the work done.", "40 نیوٹن کی قوت ایک ڈبے کو زمین سے 60° کے زاویے پر 5 میٹر کھینچتی ہے۔ کیا گیا کام معلوم کریں۔", "F = 40 N, d = 5 m, θ = 60°", "W", "W = Fd cosθ", ["W = 40 × 5 × cos 60°", "W = 200 × 0.5"], "W = 100 J"],
    ["kineticenergy", "Find the kinetic energy of a 2 kg ball moving at 6 m/s.", "2 کلوگرام کی گیند 6 m/s سے چل رہی ہے۔ اس کی حرکی توانائی معلوم کریں۔", "m = 2 kg, v = 6 m/s", "KE", "KE = ½mv²", ["KE = ½ × 2 × 6²", "KE = 1 × 36"], "KE = 36 J"],
    ["potentialenergy", "A 3 kg book is on a shelf 5 m high. Find its potential energy (g = 10 m/s²).", "3 کلوگرام کی کتاب 5 میٹر اونچی شیلف پر رکھی ہے۔ اس کی مخفی توانائی معلوم کریں (g = 10 m/s²)۔", "m = 3 kg, h = 5 m, g = 10 m/s²", "PE", "PE = mgh", "PE = 3 × 10 × 5", "PE = 150 J"],
    ["workminusenergytheorem", "100 J of net work is done on a 2 kg object at rest. Find its final speed.", "ساکن حالت میں رکھے 2 کلوگرام کے جسم پر 100 جول کا کام کیا جاتا ہے۔ اس کی آخری رفتار معلوم کریں۔", "W = 100 J, m = 2 kg, v₁ = 0", "v₂", "W = ΔKE = ½mv₂² − ½mv₁²", ["100 = ½ × 2 × v₂²", "v₂² = 100"], "v₂ = 10 m/s"],
    ["power", "A motor does 600 J of work in 20 s. Find its power.", "ایک موٹر 20 سیکنڈ میں 600 جول کا کام کرتی ہے۔ اس کی طاقت معلوم کریں۔", "W = 600 J, t = 20 s", "P", "P = W / t", "P = 600 / 20", "P = 30 W"],
    ["springpe", "A spring (k = 200 N/m) is stretched by 0.1 m. Find the energy stored.", "ایک اسپرنگ (k = 200 N/m) کو 0.1 میٹر کھینچا جاتا ہے۔ اس میں ذخیرہ توانائی معلوم کریں۔", "k = 200 N/m, x = 0.1 m", "PE", "PE = ½kx²", ["PE = ½ × 200 × (0.1)²", "PE = 100 × 0.01"], "PE = 1 J"],
    ["efficiencymachines efficiencyofamachine", "A machine takes in 100 J and gives out 80 J of useful work. Find its efficiency.", "ایک مشین 100 جول توانائی لیتی ہے اور 80 جول مفید کام دیتی ہے۔ اس کی کارکردگی معلوم کریں۔", "Input = 100 J, Output = 80 J", "Efficiency", "Efficiency = (Output / Input) × 100", "Efficiency = (80 / 100) × 100", "Efficiency = 80%"],
    ["weight weightvsmassrelation", "Find the weight of a 60 kg person (g = 9.8 m/s²).", "60 کلوگرام کے شخص کا وزن معلوم کریں (g = 9.8 m/s²)۔", "m = 60 kg, g = 9.8 m/s²", "W", "W = mg", "W = 60 × 9.8", "W = 588 N"],
    ["density", "A block has mass 500 g and volume 250 cm³. Find its density.", "ایک بلاک کی کمیت 500 گرام اور حجم 250 cm³ ہے۔ اس کی کثافت معلوم کریں۔", "m = 500 g, V = 250 cm³", "ρ", "ρ = m / V", "ρ = 500 / 250", "ρ = 2 g/cm³"],
    ["pressure", "A 200 N force acts on an area of 0.5 m². Find the pressure.", "0.5 m² رقبے پر 200 نیوٹن کی قوت لگتی ہے۔ دباؤ معلوم کریں۔", "F = 200 N, A = 0.5 m²", "P", "P = F / A", "P = 200 / 0.5", "P = 400 Pa"],
    ["pressureinfluid pressureinafluidcolumn", "Find the pressure due to water at a depth of 5 m (ρ = 1000 kg/m³, g = 10 m/s²).", "پانی میں 5 میٹر گہرائی پر دباؤ معلوم کریں (ρ = 1000 kg/m³, g = 10 m/s²)۔", "ρ = 1000 kg/m³, g = 10 m/s², h = 5 m", "P", "P = ρgh", "P = 1000 × 10 × 5", "P = 50000 Pa"],
    ["pascalsprinciple", "A 50 N force acts on a 2 cm² piston. What force appears on a 40 cm² piston?", "2 cm² کے پسٹن پر 50 نیوٹن قوت لگتی ہے۔ 40 cm² کے پسٹن پر کتنی قوت ملے گی؟", "F₁ = 50 N, A₁ = 2 cm², A₂ = 40 cm²", "F₂", "F₁ / A₁ = F₂ / A₂", ["F₂ = F₁ × A₂ / A₁", "F₂ = 50 × 40 / 2"], "F₂ = 1000 N"],
    ["speed", "A bus covers 120 km in 2 hours. Find its average speed.", "ایک بس 2 گھنٹے میں 120 کلومیٹر چلتی ہے۔ اس کی اوسط رفتار معلوم کریں۔", "d = 120 km, t = 2 h", "v", "v = d / t", "v = 120 / 2", "v = 60 km/h"],
    ["acceleration", "A cyclist speeds up from 10 m/s to 30 m/s in 5 s. Find the acceleration.", "ایک سائیکل سوار 5 سیکنڈ میں اپنی رفتار 10 m/s سے 30 m/s کر لیتا ہے۔ اسراع معلوم کریں۔", "u = 10 m/s, v = 30 m/s, t = 5 s", "a", "a = (v − u) / t", "a = (30 − 10) / 5", "a = 4 m/s²"],
    ["freefallvelocity", "A stone is dropped from a 20 m high building. Find its speed just before it hits the ground (g = 10 m/s²).", "ایک پتھر 20 میٹر اونچی عمارت سے گرایا جاتا ہے۔ زمین سے ٹکرانے سے پہلے اس کی رفتار معلوم کریں (g = 10 m/s²)۔", "h = 20 m, g = 10 m/s²", "v", "v = √(2gh)", ["v = √(2 × 10 × 20)", "v = √400"], "v = 20 m/s"],
    ["centripetalforce", "A 2 kg ball moves in a circle of radius 2.5 m at 5 m/s. Find the centripetal force.", "2 کلوگرام کی گیند 2.5 میٹر رداس کے دائرے میں 5 m/s سے گھومتی ہے۔ مرکز مائل قوت معلوم کریں۔", "m = 2 kg, v = 5 m/s, r = 2.5 m", "F", "F = mv² / r", ["F = 2 × 5² / 2.5", "F = 50 / 2.5"], "F = 20 N"],
    ["angularvelocity", "A wheel turns 120 times per minute. Find its angular velocity.", "ایک پہیہ ایک منٹ میں 120 چکر لگاتا ہے۔ اس کی زاویائی رفتار معلوم کریں۔", "f = 120 rev/min = 2 rev/s", "ω", "ω = 2πf", "ω = 2π × 2", "ω = 4π ≈ 12.57 rad/s"],
    ["conservationofmomentum", "A 2 kg cart at 3 m/s hits a 1 kg cart at rest and they stick together. Find their common speed.", "3 m/s سے چلتی 2 کلوگرام کی ٹرالی ساکن 1 کلوگرام کی ٹرالی سے ٹکرا کر اس سے جڑ جاتی ہے۔ مشترکہ رفتار معلوم کریں۔", "m₁ = 2 kg, u₁ = 3 m/s, m₂ = 1 kg, u₂ = 0", "v", "m₁u₁ + m₂u₂ = (m₁ + m₂)v", ["(2)(3) + (1)(0) = (2 + 1)v", "6 = 3v"], "v = 2 m/s"],
    ["newtonslaw newtonslawofgravitationbasic", "Two 10 kg masses are 1 m apart. Find the gravitational force (G = 6.67 × 10⁻¹¹).", "دو 10 کلوگرام کی کمیتیں ایک دوسرے سے 1 میٹر دور ہیں۔ ان کے درمیان کششِ ثقل معلوم کریں (G = 6.67 × 10⁻¹¹)۔", "m₁ = m₂ = 10 kg, r = 1 m", "F", "F = G m₁m₂ / r²", "F = (6.67 × 10⁻¹¹)(10)(10) / 1²", "F = 6.67 × 10⁻⁹ N"],
    ["escapevelocity", "Find the escape velocity of Earth (g = 9.8 m/s², R = 6.4 × 10⁶ m).", "زمین کی فرار کی رفتار معلوم کریں (g = 9.8 m/s², R = 6.4 × 10⁶ m)۔", "g = 9.8 m/s², R = 6.4 × 10⁶ m", "vₑ", "vₑ = √(2gR)", ["vₑ = √(2 × 9.8 × 6.4 × 10⁶)", "vₑ = √(1.2544 × 10⁸)"], "vₑ = 11200 m/s ≈ 11.2 km/s"],
    ["coulombslaw", "Two 1 µC charges are 0.3 m apart. Find the force between them (k = 9 × 10⁹).", "دو 1 µC کے چارج ایک دوسرے سے 0.3 میٹر دور ہیں۔ ان کے درمیان قوت معلوم کریں (k = 9 × 10⁹)۔", "q₁ = q₂ = 1 × 10⁻⁶ C, r = 0.3 m", "F", "F = k q₁q₂ / r²", ["F = (9 × 10⁹)(10⁻⁶)(10⁻⁶) / (0.3)²", "F = 9 × 10⁻³ / 0.09"], "F = 0.1 N"],
    ["electricfield", "A 2 × 10⁻⁶ C charge feels a force of 0.6 N. Find the electric field.", "2 × 10⁻⁶ C کے چارج پر 0.6 نیوٹن کی قوت لگتی ہے۔ برقی میدان معلوم کریں۔", "F = 0.6 N, q = 2 × 10⁻⁶ C", "E", "E = F / q", "E = 0.6 / (2 × 10⁻⁶)", "E = 3 × 10⁵ N/C"],
    ["capacitance", "A capacitor stores 6 µC at 3 V. Find its capacitance.", "ایک کپیسیٹر 3 وولٹ پر 6 µC چارج جمع کرتا ہے۔ اس کی کپیسٹنس معلوم کریں۔", "Q = 6 µC, V = 3 V", "C", "C = Q / V", "C = 6 / 3", "C = 2 µF"],
    ["energystoredincapacitor energystoredinacapacitor", "Find the energy stored in a 10 µF capacitor charged to 100 V.", "100 وولٹ تک چارج کیے گئے 10 µF کے کپیسیٹر میں ذخیرہ توانائی معلوم کریں۔", "C = 10 × 10⁻⁶ F, V = 100 V", "U", "U = ½CV²", ["U = ½ × 10 × 10⁻⁶ × 100²", "U = ½ × 10⁻⁵ × 10⁴"], "U = 0.05 J"],
    ["capacitorsinseries", "Two capacitors of 6 µF and 3 µF are in series. Find the equivalent capacitance.", "6 µF اور 3 µF کے دو کپیسیٹر سیریز میں ہیں۔ مجموعی کپیسٹنس معلوم کریں۔", "C₁ = 6 µF, C₂ = 3 µF", "C", "1/C = 1/C₁ + 1/C₂", ["1/C = 1/6 + 1/3 = 3/6 = 1/2"], "C = 2 µF"],
    ["capacitorsinparallel", "Capacitors of 4 µF and 6 µF are in parallel. Find the equivalent capacitance.", "4 µF اور 6 µF کے کپیسیٹر متوازی ہیں۔ مجموعی کپیسٹنس معلوم کریں۔", "C₁ = 4 µF, C₂ = 6 µF", "C", "C = C₁ + C₂", "C = 4 + 6", "C = 10 µF"],
    ["ohmslaw", "A 12 V battery is connected across a 4 Ω resistor. Find the current.", "4 اوہم کے مزاحم پر 12 وولٹ کی بیٹری لگائی جاتی ہے۔ کرنٹ معلوم کریں۔", "V = 12 V, R = 4 Ω", "I", "V = IR, so I = V / R", "I = 12 / 4", "I = 3 A"],
    ["electricalpower", "An appliance runs on 220 V and draws 5 A. Find its power.", "ایک آلہ 220 وولٹ پر چلتا ہے اور 5 ایمپیئر کرنٹ لیتا ہے۔ اس کی طاقت معلوم کریں۔", "V = 220 V, I = 5 A", "P", "P = VI", "P = 220 × 5", "P = 1100 W"],
    ["powerdissipatedresistor powerdissipatedinresistor", "A 2 A current flows through a 10 Ω resistor. Find the power dissipated.", "10 اوہم کے مزاحم میں سے 2 ایمپیئر کرنٹ گزرتا ہے۔ ضائع ہونے والی طاقت معلوم کریں۔", "I = 2 A, R = 10 Ω", "P", "P = I²R", "P = 2² × 10", "P = 40 W"],
    ["electricalenergy", "A 2 kW heater runs for 3 hours. How many units (kWh) does it use?", "2 کلوواٹ کا ہیٹر 3 گھنٹے چلتا ہے۔ وہ کتنے یونٹ (kWh) استعمال کرے گا؟", "P = 2 kW, t = 3 h", "E", "E = P × t", "E = 2 × 3", "E = 6 kWh (6 units)"],
    ["resistivity", "Find the resistance of a copper wire: ρ = 1.7 × 10⁻⁸ Ω·m, L = 100 m, A = 1 × 10⁻⁶ m².", "تانبے کے تار کی مزاحمت معلوم کریں: ρ = 1.7 × 10⁻⁸ Ω·m, L = 100 m, A = 1 × 10⁻⁶ m²۔", "ρ = 1.7 × 10⁻⁸ Ω·m, L = 100 m, A = 10⁻⁶ m²", "R", "R = ρL / A", "R = (1.7 × 10⁻⁸)(100) / 10⁻⁶", "R = 1.7 Ω"],
    ["resistorsinseries seriesresistance", "Resistors of 2 Ω, 3 Ω and 5 Ω are in series. Find the total resistance.", "2، 3 اور 5 اوہم کے مزاحم سیریز میں ہیں۔ کل مزاحمت معلوم کریں۔", "R₁ = 2 Ω, R₂ = 3 Ω, R₃ = 5 Ω", "R", "R = R₁ + R₂ + R₃", "R = 2 + 3 + 5", "R = 10 Ω"],
    ["resistorsinparallel parallelresistance", "Resistors of 6 Ω and 3 Ω are in parallel. Find the total resistance.", "6 اور 3 اوہم کے مزاحم متوازی ہیں۔ کل مزاحمت معلوم کریں۔", "R₁ = 6 Ω, R₂ = 3 Ω", "R", "1/R = 1/R₁ + 1/R₂", ["1/R = 1/6 + 1/3 = 3/6 = 1/2"], "R = 2 Ω"],
    ["terminalvoltage terminalvoltageofacell", "A cell has emf 12 V and internal resistance 0.5 Ω. Find the terminal voltage when it supplies 2 A.", "ایک سیل کا emf 12 وولٹ اور اندرونی مزاحمت 0.5 اوہم ہے۔ 2 ایمپیئر دینے پر ٹرمینل وولٹیج معلوم کریں۔", "E = 12 V, r = 0.5 Ω, I = 2 A", "V", "V = E − Ir", ["V = 12 − (2)(0.5)", "V = 12 − 1"], "V = 11 V"],
    ["transformervoltageratio", "A transformer has 1000 primary turns and 100 secondary turns. If the input is 220 V, find the output.", "ایک ٹرانسفارمر کے پرائمری میں 1000 اور سیکنڈری میں 100 چکر ہیں۔ اگر ان پٹ 220 وولٹ ہو تو آؤٹ پٹ معلوم کریں۔", "Np = 1000, Ns = 100, Vp = 220 V", "Vs", "Vs / Vp = Ns / Np", ["Vs = 220 × 100 / 1000"], "Vs = 22 V"],
    ["rmsvalueac", "The peak voltage of an AC supply is 311 V. Find the RMS voltage.", "ایک AC سپلائی کی چوٹی کی وولٹیج 311 وولٹ ہے۔ RMS وولٹیج معلوم کریں۔", "V₀ = 311 V", "V_rms", "V_rms = V₀ / √2", "V_rms = 311 / 1.414", "V_rms ≈ 220 V"],
    ["heattransfer specificheatcapacity", "How much heat is needed to raise 2 kg of water by 10 °C (c = 4200 J/kg·K)?", "2 کلوگرام پانی کا درجۂ حرارت 10 °C بڑھانے کے لیے کتنی حرارت چاہیے (c = 4200 J/kg·K)؟", "m = 2 kg, c = 4200 J/kg·K, ΔT = 10 K", "Q", "Q = mcΔT", "Q = 2 × 4200 × 10", "Q = 84000 J"],
    ["latentheat", "How much heat melts 0.5 kg of ice at 0 °C (L = 3.34 × 10⁵ J/kg)?", "0 °C پر 0.5 کلوگرام برف پگھلانے کے لیے کتنی حرارت چاہیے (L = 3.34 × 10⁵ J/kg)؟", "m = 0.5 kg, L = 3.34 × 10⁵ J/kg", "Q", "Q = mL", "Q = 0.5 × 3.34 × 10⁵", "Q = 1.67 × 10⁵ J"],
    ["linearexpansion linearthermalexpansion", "A 10 m steel rod (α = 12 × 10⁻⁶ /°C) is heated by 50 °C. Find the increase in length.", "10 میٹر کی فولادی سلاخ (α = 12 × 10⁻⁶ /°C) کو 50 °C گرم کیا جاتا ہے۔ لمبائی میں اضافہ معلوم کریں۔", "L = 10 m, α = 12 × 10⁻⁶ /°C, ΔT = 50 °C", "ΔL", "ΔL = αLΔT", "ΔL = (12 × 10⁻⁶)(10)(50)", "ΔL = 6 × 10⁻³ m = 6 mm"],
    ["celsiustofahrenheit", "Convert normal body temperature 37 °C to Fahrenheit.", "جسم کا عام درجۂ حرارت 37 °C فارن ہائیٹ میں بدلیں۔", "C = 37 °C", "F", "F = (9/5)C + 32", ["F = (9/5)(37) + 32", "F = 66.6 + 32"], "F = 98.6 °F"],
    ["celsiustokelvin", "Convert 27 °C to Kelvin.", "27 °C کو کیلون میں بدلیں۔", "C = 27 °C", "T", "T = C + 273", "T = 27 + 273", "T = 300 K"],

    ["electricfieldduetopointcharge", "Find the electric field 3 m from a 2 µC point charge (k = 9 × 10⁹).", "2 µC کے نقطہ چارج سے 3 میٹر کے فاصلے پر برقی میدان معلوم کریں (k = 9 × 10⁹)۔", "q = 2 × 10⁻⁶ C, r = 3 m", "E", "E = kq / r²", ["E = (9 × 10⁹)(2 × 10⁻⁶) / 3²", "E = 18000 / 9"], "E = 2000 N/C"],
    ["electricpotential electricpotentialduetopointcharge", "Find the electric potential 3 m from a 2 µC point charge (k = 9 × 10⁹).", "2 µC کے نقطہ چارج سے 3 میٹر کے فاصلے پر برقی پوٹینشل معلوم کریں (k = 9 × 10⁹)۔", "q = 2 × 10⁻⁶ C, r = 3 m", "V", "V = kq / r", ["V = (9 × 10⁹)(2 × 10⁻⁶) / 3", "V = 18000 / 3"], "V = 6000 V"],
    ["workdonemovingcharge", "How much work is done moving a 2 C charge across a potential difference of 12 V?", "12 وولٹ کے پوٹینشل فرق کے آر پار 2 کولمب کا چارج لے جانے میں کتنا کام ہوگا؟", "q = 2 C, ΔV = 12 V", "W", "W = q × ΔV", "W = 2 × 12", "W = 24 J"],
    ["powerdeliveredbyaforce", "A 50 N force moves an object at 4 m/s in the same direction. Find the power delivered.", "50 نیوٹن کی قوت ایک جسم کو اسی رخ میں 4 m/s کی رفتار سے حرکت دیتی ہے۔ دی جانے والی طاقت معلوم کریں۔", "F = 50 N, v = 4 m/s, θ = 0°", "P", "P = Fv cosθ", "P = 50 × 4 × cos 0°", "P = 200 W"],

    /* ---------------- MATHEMATICS ---------------- */
    ["quadraticformula", "Solve x² − 5x + 6 = 0.", "حل کریں: x² − 5x + 6 = 0", "a = 1, b = −5, c = 6", "x", "x = [−b ± √(b² − 4ac)] / 2a", ["x = [5 ± √(25 − 24)] / 2", "x = (5 ± 1) / 2"], "x = 3 or x = 2"],
    ["discriminant", "Find the discriminant of x² + 4x + 4 = 0 and describe the roots.", "x² + 4x + 4 = 0 کا ڈسکرمنٹ معلوم کریں اور جذور کی نوعیت بتائیں۔", "a = 1, b = 4, c = 4", "D", "D = b² − 4ac", "D = 16 − 16", "D = 0, so the roots are real and equal"],
    ["sumofroots productofroots", "For 2x² − 6x + 4 = 0, find the sum and product of the roots.", "2x² − 6x + 4 = 0 کے جذور کا مجموعہ اور حاصلِ ضرب معلوم کریں۔", "a = 2, b = −6, c = 4", "Sum, Product", "Sum = −b/a, Product = c/a", ["Sum = −(−6)/2", "Product = 4/2"], "Sum = 3, Product = 2"],
    ["aplusb2", "Expand (x + 3)².", "پھیلائیں: (x + 3)²", "a = x, b = 3", "(x + 3)²", "(a + b)² = a² + 2ab + b²", "(x + 3)² = x² + 2(x)(3) + 3²", "x² + 6x + 9"],
    ["aminusb2", "Expand (x − 4)².", "پھیلائیں: (x − 4)²", "a = x, b = 4", "(x − 4)²", "(a − b)² = a² − 2ab + b²", "(x − 4)² = x² − 2(x)(4) + 4²", "x² − 8x + 16"],
    ["a2minusb2", "Evaluate 51² − 49² without a calculator.", "بغیر کیلکولیٹر کے 51² − 49² معلوم کریں۔", "a = 51, b = 49", "51² − 49²", "a² − b² = (a + b)(a − b)", "(51 + 49)(51 − 49) = 100 × 2", "200"],
    ["aplusb3", "Expand (x + 2)³.", "پھیلائیں: (x + 2)³", "a = x, b = 2", "(x + 2)³", "(a + b)³ = a³ + 3a²b + 3ab² + b³", "x³ + 3(x²)(2) + 3(x)(4) + 8", "x³ + 6x² + 12x + 8"],
    ["a3plusb3", "Factorise x³ + 8.", "جزو نکالیں: x³ + 8", "a = x, b = 2 (since 8 = 2³)", "Factors", "a³ + b³ = (a + b)(a² − ab + b²)", "x³ + 2³ = (x + 2)(x² − 2x + 4)", "(x + 2)(x² − 2x + 4)"],
    ["a3minusb3", "Evaluate 3³ − 2³ using the identity.", "کلیہ استعمال کر کے 3³ − 2³ معلوم کریں۔", "a = 3, b = 2", "3³ − 2³", "a³ − b³ = (a − b)(a² + ab + b²)", "(3 − 2)(9 + 6 + 4) = 1 × 19", "19"],
    ["remaindertheorem", "Find the remainder when f(x) = x³ − 2x + 5 is divided by (x − 2).", "جب f(x) = x³ − 2x + 5 کو (x − 2) سے تقسیم کیا جائے تو باقی معلوم کریں۔", "f(x) = x³ − 2x + 5, divisor x − 2", "Remainder", "Remainder = f(a) for divisor (x − a)", ["f(2) = 2³ − 2(2) + 5", "f(2) = 8 − 4 + 5"], "Remainder = 9"],
    ["factortheorem", "Is (x − 1) a factor of x² − 3x + 2?", "کیا (x − 1)، x² − 3x + 2 کا جزو ہے؟", "f(x) = x² − 3x + 2, divisor x − 1", "Is f(1) = 0?", "(x − a) is a factor if f(a) = 0", "f(1) = 1 − 3 + 2", "f(1) = 0, so yes, (x − 1) is a factor"],
    ["pythagoreanidentity", "If sin θ = 3/5, find cos θ (θ acute).", "اگر sin θ = 3/5 ہو تو cos θ معلوم کریں (θ تیز زاویہ ہے)۔", "sin θ = 3/5", "cos θ", "sin²θ + cos²θ = 1", ["cos²θ = 1 − (3/5)² = 1 − 9/25", "cos²θ = 16/25"], "cos θ = 4/5"],
    ["lawofsines", "In a triangle, A = 30°, B = 45° and a = 10. Find b.", "ایک مثلث میں A = 30°, B = 45° اور a = 10 ہے۔ b معلوم کریں۔", "A = 30°, B = 45°, a = 10", "b", "a / sin A = b / sin B", ["b = a sin B / sin A", "b = 10 × 0.7071 / 0.5"], "b ≈ 14.14"],
    ["lawofcosines", "In a triangle a = 7, b = 8 and C = 60°. Find c.", "ایک مثلث میں a = 7, b = 8 اور C = 60° ہے۔ c معلوم کریں۔", "a = 7, b = 8, C = 60°", "c", "c² = a² + b² − 2ab cos C", ["c² = 49 + 64 − 2(7)(8)(0.5)", "c² = 113 − 56 = 57"], "c = √57 ≈ 7.55"],
    ["doubleanglesin2", "If sin θ = 3/5 and cos θ = 4/5, find sin 2θ.", "اگر sin θ = 3/5 اور cos θ = 4/5 ہو تو sin 2θ معلوم کریں۔", "sin θ = 3/5, cos θ = 4/5", "sin 2θ", "sin 2θ = 2 sin θ cos θ", "sin 2θ = 2 × (3/5) × (4/5)", "sin 2θ = 24/25"],
    ["doubleanglecos2", "If sin θ = 3/5 and cos θ = 4/5, find cos 2θ.", "اگر sin θ = 3/5 اور cos θ = 4/5 ہو تو cos 2θ معلوم کریں۔", "sin θ = 3/5, cos θ = 4/5", "cos 2θ", "cos 2θ = cos²θ − sin²θ", "cos 2θ = 16/25 − 9/25", "cos 2θ = 7/25"],
    ["radiantodegree", "Convert π/3 radians to degrees.", "π/3 ریڈین کو ڈگری میں بدلیں۔", "θ = π/3 rad", "θ in degrees", "Degrees = radians × 180 / π", "(π/3) × 180 / π", "60°"],
    ["arclength", "Find the arc length when r = 6 cm and θ = π/3 rad.", "جب r = 6 سینٹی میٹر اور θ = π/3 ریڈین ہو تو قوس کی لمبائی معلوم کریں۔", "r = 6 cm, θ = π/3 rad", "s", "s = rθ", "s = 6 × π/3", "s = 2π ≈ 6.28 cm"],
    ["areaofcircularsector", "Find the area of a sector with r = 6 cm and θ = π/3 rad.", "r = 6 سینٹی میٹر اور θ = π/3 ریڈین والے سیکٹر کا رقبہ معلوم کریں۔", "r = 6 cm, θ = π/3 rad", "A", "A = ½r²θ", "A = ½ × 36 × π/3", "A = 6π ≈ 18.85 cm²"],
    ["pythagorastheorem", "The two shorter sides of a right triangle are 6 cm and 8 cm. Find the hypotenuse.", "ایک قائمۃ الزاویہ مثلث کے دو چھوٹے اضلاع 6 اور 8 سینٹی میٹر ہیں۔ وتر معلوم کریں۔", "a = 6, b = 8", "c", "c² = a² + b²", ["c² = 36 + 64 = 100", "c = √100"], "c = 10 cm"],
    ["heronsformula areaoftriangleherons", "Find the area of a triangle with sides 3, 4 and 5 cm.", "3، 4 اور 5 سینٹی میٹر اضلاع والے مثلث کا رقبہ معلوم کریں۔", "a = 3, b = 4, c = 5", "Area", "s = (a + b + c)/2; Area = √[s(s − a)(s − b)(s − c)]", ["s = (3 + 4 + 5)/2 = 6", "Area = √[6 × 3 × 2 × 1] = √36"], "Area = 6 cm²"],
    ["areaofcircle", "Find the area of a circle of radius 7 cm (π = 22/7).", "7 سینٹی میٹر رداس کے دائرے کا رقبہ معلوم کریں (π = 22/7)۔", "r = 7 cm", "A", "A = πr²", "A = (22/7) × 7²", "A = 154 cm²"],
    ["circumference circumferenceofcircle", "Find the circumference of a circle of radius 7 cm (π = 22/7).", "7 سینٹی میٹر رداس کے دائرے کا محیط معلوم کریں (π = 22/7)۔", "r = 7 cm", "C", "C = 2πr", "C = 2 × (22/7) × 7", "C = 44 cm"],
    ["volumeofsphere", "Find the volume of a sphere of radius 3 cm.", "3 سینٹی میٹر رداس کے کرے کا حجم معلوم کریں۔", "r = 3 cm", "V", "V = (4/3)πr³", "V = (4/3) × π × 27", "V = 36π ≈ 113.1 cm³"],
    ["volumeofhemisphere", "Find the volume of a hemisphere of radius 3 cm.", "3 سینٹی میٹر رداس کے نصف کرے کا حجم معلوم کریں۔", "r = 3 cm", "V", "V = (2/3)πr³", "V = (2/3) × π × 27", "V = 18π ≈ 56.55 cm³"],
    ["volumeofcylinder", "Find the volume of a cylinder with r = 7 cm and h = 10 cm (π = 22/7).", "r = 7 اور h = 10 سینٹی میٹر والے بیلن کا حجم معلوم کریں (π = 22/7)۔", "r = 7 cm, h = 10 cm", "V", "V = πr²h", "V = (22/7) × 49 × 10", "V = 1540 cm³"],
    ["volumeofcone", "Find the volume of a cone with r = 3 cm and h = 4 cm.", "r = 3 اور h = 4 سینٹی میٹر والے مخروط کا حجم معلوم کریں۔", "r = 3 cm, h = 4 cm", "V", "V = ⅓πr²h", "V = ⅓ × π × 9 × 4", "V = 12π ≈ 37.7 cm³"],
    ["surfaceareaofsphere", "Find the surface area of a sphere of radius 7 cm (π = 22/7).", "7 سینٹی میٹر رداس کے کرے کا سطحی رقبہ معلوم کریں (π = 22/7)۔", "r = 7 cm", "A", "A = 4πr²", "A = 4 × (22/7) × 49", "A = 616 cm²"],
    ["volumeofcube", "Find the volume of a cube with side 4 cm.", "4 سینٹی میٹر ضلع والے مکعب کا حجم معلوم کریں۔", "a = 4 cm", "V", "V = a³", "V = 4³", "V = 64 cm³"],
    ["surfaceareaofcube", "Find the total surface area of a cube with side 4 cm.", "4 سینٹی میٹر ضلع والے مکعب کا کل سطحی رقبہ معلوم کریں۔", "a = 4 cm", "A", "A = 6a²", "A = 6 × 16", "A = 96 cm²"],
    ["volumeofcuboid", "Find the volume of a cuboid 5 cm × 4 cm × 3 cm.", "5 × 4 × 3 سینٹی میٹر والے مستطیلی ڈبے کا حجم معلوم کریں۔", "l = 5, b = 4, h = 3", "V", "V = l × b × h", "V = 5 × 4 × 3", "V = 60 cm³"],
    ["surfaceareaofcuboid", "Find the total surface area of a cuboid 5 cm × 4 cm × 3 cm.", "5 × 4 × 3 سینٹی میٹر والے مستطیلی ڈبے کا کل سطحی رقبہ معلوم کریں۔", "l = 5, b = 4, h = 3", "A", "A = 2(lb + bh + lh)", "A = 2(20 + 12 + 15)", "A = 94 cm²"],
    ["curvedsurfaceareaofcylinder", "Find the curved surface area of a cylinder with r = 7 cm and h = 10 cm (π = 22/7).", "r = 7 اور h = 10 سینٹی میٹر والے بیلن کا خمدار سطحی رقبہ معلوم کریں (π = 22/7)۔", "r = 7 cm, h = 10 cm", "CSA", "CSA = 2πrh", "CSA = 2 × (22/7) × 7 × 10", "CSA = 440 cm²"],
    ["totalsurfaceareaofcylinder", "Find the total surface area of a cylinder with r = 7 cm and h = 10 cm (π = 22/7).", "r = 7 اور h = 10 سینٹی میٹر والے بیلن کا کل سطحی رقبہ معلوم کریں (π = 22/7)۔", "r = 7 cm, h = 10 cm", "TSA", "TSA = 2πr(r + h)", ["TSA = 2 × (22/7) × 7 × (7 + 10)", "TSA = 44 × 17"], "TSA = 748 cm²"],
    ["curvedsurfaceareaofcone", "Find the curved surface area of a cone with r = 3 cm and slant height l = 5 cm.", "r = 3 اور ترچھی اونچائی l = 5 سینٹی میٹر والے مخروط کا خمدار سطحی رقبہ معلوم کریں۔", "r = 3 cm, l = 5 cm", "CSA", "CSA = πrl", "CSA = π × 3 × 5", "CSA = 15π ≈ 47.1 cm²"],
    ["areaoftrapezium", "Find the area of a trapezium with parallel sides 8 cm and 12 cm and height 5 cm.", "متوازی اضلاع 8 اور 12 سینٹی میٹر اور اونچائی 5 سینٹی میٹر والے ذوزنقہ کا رقبہ معلوم کریں۔", "a = 8, b = 12, h = 5", "A", "A = ½(a + b)h", "A = ½ × (8 + 12) × 5", "A = 50 cm²"],
    ["areaofparallelogram", "Find the area of a parallelogram with base 10 cm and height 6 cm.", "قاعدہ 10 اور اونچائی 6 سینٹی میٹر والے متوازی الاضلاع کا رقبہ معلوم کریں۔", "base = 10 cm, h = 6 cm", "A", "A = base × height", "A = 10 × 6", "A = 60 cm²"],
    ["areaofrhombus", "Find the area of a rhombus with diagonals 8 cm and 6 cm.", "8 اور 6 سینٹی میٹر قطروں والے معین کا رقبہ معلوم کریں۔", "d₁ = 8 cm, d₂ = 6 cm", "A", "A = ½ d₁ d₂", "A = ½ × 8 × 6", "A = 24 cm²"],
    ["areaoftrianglebaseminusheight", "Find the area of a triangle with base 10 cm and height 6 cm.", "قاعدہ 10 اور اونچائی 6 سینٹی میٹر والے مثلث کا رقبہ معلوم کریں۔", "base = 10 cm, h = 6 cm", "A", "A = ½ × base × height", "A = ½ × 10 × 6", "A = 30 cm²"],
    ["simpleinterest", "Find the simple interest on Rs. 10,000 at 5% per year for 3 years.", "10,000 روپے پر 5% سالانہ کے حساب سے 3 سال کا سادہ منافع معلوم کریں۔", "P = 10000, R = 5%, T = 3 years", "I", "I = (P × R × T) / 100", "I = (10000 × 5 × 3) / 100", "I = Rs. 1500"],
    ["compoundinterest", "Find the amount on Rs. 10,000 at 10% per year compounded yearly for 2 years.", "10,000 روپے پر 10% سالانہ مرکب منافع کے ساتھ 2 سال بعد کل رقم معلوم کریں۔", "P = 10000, r = 10%, n = 2 years", "A", "A = P (1 + r/100)ⁿ", ["A = 10000 × (1.1)²", "A = 10000 × 1.21"], "A = Rs. 12100"],
    ["percentagechange", "A price rises from Rs. 80 to Rs. 100. Find the percentage increase.", "قیمت 80 روپے سے بڑھ کر 100 روپے ہو جاتی ہے۔ فیصد اضافہ معلوم کریں۔", "Old = 80, New = 100", "% change", "% change = (New − Old) / Old × 100", "(100 − 80) / 80 × 100", "25% increase"],
    ["hcfandlcmrelation", "The HCF of 12 and 18 is 6. Find their LCM.", "12 اور 18 کا عاد اعظم 6 ہے۔ ان کا ذواضعاف اقل معلوم کریں۔", "a = 12, b = 18, HCF = 6", "LCM", "HCF × LCM = a × b", ["6 × LCM = 12 × 18 = 216", "LCM = 216 / 6"], "LCM = 36"],
    ["sumoffirstnnaturalnumbers", "Find the sum of the first 100 natural numbers.", "پہلے 100 قدرتی اعداد کا مجموعہ معلوم کریں۔", "n = 100", "Sum", "Sum = n(n + 1) / 2", "Sum = 100 × 101 / 2", "Sum = 5050"],
    ["lawsofexponentsminusproduct", "Simplify 2³ × 2⁴.", "سادہ کریں: 2³ × 2⁴", "a = 2, m = 3, n = 4", "2³ × 2⁴", "aᵐ × aⁿ = aᵐ⁺ⁿ", "2³ × 2⁴ = 2⁽³⁺⁴⁾ = 2⁷", "128"],
    ["lawsofexponentsminusquotient", "Simplify 3⁵ ÷ 3².", "سادہ کریں: 3⁵ ÷ 3²", "a = 3, m = 5, n = 2", "3⁵ ÷ 3²", "aᵐ ÷ aⁿ = aᵐ⁻ⁿ", "3⁵ ÷ 3² = 3⁽⁵⁻²⁾ = 3³", "27"],
    ["lawsofexponentsminuspowerofpower", "Simplify (2³)².", "سادہ کریں: (2³)²", "a = 2, m = 3, n = 2", "(2³)²", "(aᵐ)ⁿ = aᵐⁿ", "(2³)² = 2⁽³ˣ²⁾ = 2⁶", "64"],
    ["conditionforparallellines", "Are the lines 2x − y + 3 = 0 and 4x − 2y + 7 = 0 parallel?", "کیا خطوط 2x − y + 3 = 0 اور 4x − 2y + 7 = 0 متوازی ہیں؟", "Line 1: y = 2x + 3, Line 2: y = 2x + 3.5", "Compare slopes", "Parallel lines have m₁ = m₂", "m₁ = 2, m₂ = 4/2 = 2", "m₁ = m₂, so the lines are parallel"],
    ["conditionforperpendicularlines", "A line has slope 2. Find the slope of a line perpendicular to it.", "ایک خط کی ڈھلان 2 ہے۔ اس پر عمود خط کی ڈھلان معلوم کریں۔", "m₁ = 2", "m₂", "Perpendicular lines have m₁ × m₂ = −1", "2 × m₂ = −1", "m₂ = −1/2"],
    ["sectionformulainternaldivision", "Find the point dividing A(1, 2) and B(7, 8) internally in the ratio 1 : 2.", "A(1, 2) اور B(7, 8) کو 1 : 2 کی نسبت سے اندرونی طور پر تقسیم کرنے والا نقطہ معلوم کریں۔", "A(1, 2), B(7, 8), m : n = 1 : 2", "Point P", "P = ((m·x₂ + n·x₁)/(m + n), (m·y₂ + n·y₁)/(m + n))", ["x = (1×7 + 2×1)/3 = 9/3 = 3", "y = (1×8 + 2×2)/3 = 12/3 = 4"], "P = (3, 4)"],
    ["linearequationslopeminusintercept", "Write the line with slope 2 and y-intercept 3, then find y when x = 4.", "ڈھلان 2 اور y-انٹرسیپٹ 3 والا خط لکھیں، پھر x = 4 پر y معلوم کریں۔", "m = 2, c = 3, x = 4", "y", "y = mx + c", ["y = 2x + 3", "y = 2(4) + 3"], "y = 11"],

    /* ---------------- CHEMISTRY ---------------- */
    ["idealgas", "Find the volume of 2 mol of an ideal gas at 300 K and 1 atm (R = 0.0821 L·atm/mol·K).", "300 K اور 1 atm پر 2 مول مثالی گیس کا حجم معلوم کریں (R = 0.0821 L·atm/mol·K)۔", "n = 2 mol, T = 300 K, P = 1 atm", "V", "PV = nRT, so V = nRT / P", "V = (2 × 0.0821 × 300) / 1", "V ≈ 49.26 L"],
    ["boyleslaw", "A gas at 2 atm occupies 6 L. What is its volume at 4 atm (same temperature)?", "ایک گیس 2 atm پر 6 لٹر جگہ گھیرتی ہے۔ اسی درجۂ حرارت پر 4 atm پر اس کا حجم کیا ہوگا؟", "P₁ = 2 atm, V₁ = 6 L, P₂ = 4 atm", "V₂", "P₁V₁ = P₂V₂", ["V₂ = P₁V₁ / P₂", "V₂ = (2 × 6) / 4"], "V₂ = 3 L"],
    ["charleslaw charlesslaw", "2 L of gas at 300 K is heated to 400 K at constant pressure. Find the new volume.", "300 K پر 2 لٹر گیس کو مستقل دباؤ پر 400 K تک گرم کیا جاتا ہے۔ نیا حجم معلوم کریں۔", "V₁ = 2 L, T₁ = 300 K, T₂ = 400 K", "V₂", "V₁ / T₁ = V₂ / T₂", ["V₂ = V₁ × T₂ / T₁", "V₂ = 2 × 400 / 300"], "V₂ ≈ 2.67 L"],
    ["gayminuslussacslaw", "A sealed gas at 1 atm and 300 K is heated to 600 K. Find the new pressure.", "بند برتن میں 1 atm اور 300 K پر گیس کو 600 K تک گرم کیا جاتا ہے۔ نیا دباؤ معلوم کریں۔", "P₁ = 1 atm, T₁ = 300 K, T₂ = 600 K", "P₂", "P₁ / T₁ = P₂ / T₂", ["P₂ = P₁ × T₂ / T₁", "P₂ = 1 × 600 / 300"], "P₂ = 2 atm"],
    ["avogadroslaw", "5 L of gas contains 0.5 mol. What volume do 1.5 mol occupy (same T and P)?", "5 لٹر گیس میں 0.5 مول ہیں۔ اسی درجۂ حرارت اور دباؤ پر 1.5 مول کتنا حجم گھیریں گے؟", "V₁ = 5 L, n₁ = 0.5 mol, n₂ = 1.5 mol", "V₂", "V₁ / n₁ = V₂ / n₂", ["V₂ = V₁ × n₂ / n₁", "V₂ = 5 × 1.5 / 0.5"], "V₂ = 15 L"],
    ["combinedgaslaw", "10 L of gas at 1 atm and 300 K is taken to 2 atm and 600 K. Find the new volume.", "300 K اور 1 atm پر 10 لٹر گیس کو 2 atm اور 600 K پر لایا جاتا ہے۔ نیا حجم معلوم کریں۔", "P₁ = 1, V₁ = 10, T₁ = 300, P₂ = 2, T₂ = 600", "V₂", "P₁V₁ / T₁ = P₂V₂ / T₂", ["V₂ = (P₁V₁T₂) / (T₁P₂)", "V₂ = (1 × 10 × 600) / (300 × 2)"], "V₂ = 10 L"],
    ["grahamslawofdiffusion", "Compare the diffusion rates of hydrogen (M = 2) and oxygen (M = 32).", "ہائیڈروجن (M = 2) اور آکسیجن (M = 32) کے پھیلاؤ کی شرحوں کا موازنہ کریں۔", "M(H₂) = 2, M(O₂) = 32", "Rate(H₂) / Rate(O₂)", "Rate₁ / Rate₂ = √(M₂ / M₁)", "= √(32 / 2) = √16", "Hydrogen diffuses 4 times faster"],
    ["daltonslaw", "Two gases in a vessel have partial pressures 0.5 atm and 0.3 atm. Find the total pressure.", "ایک برتن میں دو گیسوں کے جزوی دباؤ 0.5 atm اور 0.3 atm ہیں۔ کل دباؤ معلوم کریں۔", "P₁ = 0.5 atm, P₂ = 0.3 atm", "P_total", "P_total = P₁ + P₂", "P_total = 0.5 + 0.3", "P_total = 0.8 atm"],
    ["moles numberofmolesfrommass", "How many moles are in 36 g of water (M = 18 g/mol)?", "36 گرام پانی (M = 18 g/mol) میں کتنے مول ہوتے ہیں؟", "mass = 36 g, M = 18 g/mol", "n", "n = mass / molar mass", "n = 36 / 18", "n = 2 mol"],
    ["molarvolumestp molarvolumeatstp", "Find the volume of 2 mol of any gas at STP.", "STP پر کسی بھی گیس کے 2 مول کا حجم معلوم کریں۔", "n = 2 mol, molar volume at STP = 22.4 L/mol", "V", "V = n × 22.4", "V = 2 × 22.4", "V = 44.8 L"],
    ["percentageyield", "A reaction should give 10 g of product but gives 8 g. Find the percentage yield.", "ایک تعامل سے 10 گرام حاصل ہونا چاہیے مگر 8 گرام ملتا ہے۔ فیصد پیداوار معلوم کریں۔", "Actual = 8 g, Theoretical = 10 g", "% yield", "% yield = (Actual / Theoretical) × 100", "% yield = (8 / 10) × 100", "% yield = 80%"],
    ["avogadrosnumber numberofparticles", "How many molecules are in 2 mol of a substance?", "کسی مادے کے 2 مول میں کتنے سالمے ہوتے ہیں؟", "n = 2 mol, Nₐ = 6.022 × 10²³", "N", "N = n × Nₐ", "N = 2 × 6.022 × 10²³", "N = 1.2044 × 10²⁴ molecules"],
    ["percentagecomposition", "Find the percentage of hydrogen by mass in water, H₂O (M = 18).", "پانی H₂O (M = 18) میں ہائیڈروجن کی کمیت کے لحاظ سے فیصد معلوم کریں۔", "Mass of H in H₂O = 2, M(H₂O) = 18", "% of H", "% = (mass of element / molar mass) × 100", "% H = (2 / 18) × 100", "% H ≈ 11.1%"],
    ["molarity", "0.5 mol of NaCl is dissolved to make 2 L of solution. Find the molarity.", "0.5 مول NaCl سے 2 لٹر محلول بنایا جاتا ہے۔ مولاریٹی معلوم کریں۔", "n = 0.5 mol, V = 2 L", "M", "M = moles of solute / volume (L)", "M = 0.5 / 2", "M = 0.25 mol/L"],
    ["molality", "1 mol of solute is dissolved in 0.5 kg of solvent. Find the molality.", "1 مول محلول کو 0.5 کلوگرام محلل میں حل کیا جاتا ہے۔ مولالیٹی معلوم کریں۔", "n = 1 mol, solvent = 0.5 kg", "m", "m = moles of solute / mass of solvent (kg)", "m = 1 / 0.5", "m = 2 mol/kg"],
    ["dilutionformula", "How much 0.5 M solution can you make from 50 mL of 2 M solution?", "50 ملی لیٹر 2 M محلول سے 0.5 M کا کتنا محلول بنایا جا سکتا ہے؟", "M₁ = 2 M, V₁ = 50 mL, M₂ = 0.5 M", "V₂", "M₁V₁ = M₂V₂", ["V₂ = M₁V₁ / M₂", "V₂ = (2 × 50) / 0.5"], "V₂ = 200 mL"],
    ["molefraction", "A mixture has 2 mol of A and 3 mol of B. Find the mole fraction of A.", "ایک آمیزے میں A کے 2 مول اور B کے 3 مول ہیں۔ A کا مول جزو معلوم کریں۔", "nA = 2 mol, nB = 3 mol", "xA", "xA = nA / (nA + nB)", "xA = 2 / (2 + 3)", "xA = 0.4"],
    ["percentbymass", "10 g of salt is dissolved to make 100 g of solution. Find the percent by mass.", "10 گرام نمک سے 100 گرام محلول بنایا جاتا ہے۔ کمیت کے لحاظ سے فیصد معلوم کریں۔", "Solute = 10 g, Solution = 100 g", "% by mass", "% by mass = (solute / solution) × 100", "(10 / 100) × 100", "10%"],
    ["percentbyvolume", "20 mL of alcohol is mixed to make 200 mL of solution. Find the percent by volume.", "20 ملی لیٹر الکحل سے 200 ملی لیٹر محلول بنایا جاتا ہے۔ حجم کے لحاظ سے فیصد معلوم کریں۔", "Solute = 20 mL, Solution = 200 mL", "% by volume", "% by volume = (solute / solution) × 100", "(20 / 200) × 100", "10%"],
    ["osmoticpressure", "Find the osmotic pressure of a 0.1 M solution at 300 K (R = 0.0821).", "300 K پر 0.1 M محلول کا اسموٹک دباؤ معلوم کریں (R = 0.0821)۔", "M = 0.1 mol/L, T = 300 K, R = 0.0821", "π", "π = MRT", "π = 0.1 × 0.0821 × 300", "π ≈ 2.46 atm"],
    ["freezingpoint", "Find the freezing point depression for a 2 molal solution in water (Kf = 1.86 °C·kg/mol).", "پانی میں 2 مولال محلول کے نقطۂ انجماد میں کمی معلوم کریں (Kf = 1.86 °C·kg/mol)۔", "Kf = 1.86, m = 2", "ΔTf", "ΔTf = Kf × m", "ΔTf = 1.86 × 2", "ΔTf = 3.72 °C (water freezes at −3.72 °C)"],
    ["boilingpoint", "Find the boiling point elevation for a 1 molal solution in water (Kb = 0.512 °C·kg/mol).", "پانی میں 1 مولال محلول کے نقطۂ ابال میں اضافہ معلوم کریں (Kb = 0.512 °C·kg/mol)۔", "Kb = 0.512, m = 1", "ΔTb", "ΔTb = Kb × m", "ΔTb = 0.512 × 1", "ΔTb = 0.512 °C (water boils at 100.512 °C)"],
    ["lawofconservationofmass", "10 g of A reacts completely with 5 g of B. What is the total mass of products?", "10 گرام A، 5 گرام B سے مکمل تعامل کرتا ہے۔ حاصلات کی کل کمیت کیا ہوگی؟", "mass of A = 10 g, mass of B = 5 g", "Mass of products", "Mass of reactants = Mass of products", "10 + 5", "15 g"],
    ["lawofdefiniteproportions", "Water always has H : O in the mass ratio 1 : 8. How much H and O are in 9 g of water?", "پانی میں H : O کی کمیت کی نسبت ہمیشہ 1 : 8 ہوتی ہے۔ 9 گرام پانی میں H اور O کتنے ہیں؟", "Ratio H : O = 1 : 8, total = 9 g", "Mass of H and O", "Each part = total / (1 + 8)", ["1 part = 9 / 9 = 1 g", "H = 1 × 1, O = 8 × 1"], "H = 1 g, O = 8 g"]
  ];

  var LABELS = {
    en: { title: 'Solved example', q: 'Question', given: 'Given', find: 'Find', formula: 'Formula', sub: 'Substitute', ans: 'Answer', dir: 'ltr' },
    ur: { title: 'حل شدہ مثال', q: 'سوال', given: 'دیا گیا', find: 'معلوم کریں', formula: 'فارمولا', sub: 'قدریں رکھیں', ans: 'جواب', dir: 'rtl' }
  };

  var MAP = {};
  ROWS.forEach(function (r) {
    r[0].split(' ').forEach(function (k) { MAP[k] = r; });
  });

  function norm(s) {
    return String(s).normalize('NFKC').toLowerCase().replace(/\u00b1/g, 'pm').replace(/\u2213/g, 'mp')
      .replace(/\+/g, 'plus').replace(/[-\u2212\u2013]/g, 'minus').replace(/[^a-z0-9]/g, '');
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Math lines stay left-to-right in both languages so numbers read correctly.
  function pane(r, lang) {
    var L = LABELS[lang];
    var subs = Array.isArray(r[6]) ? r[6] : [r[6]];
    var step = function (n, label, body) {
      return '<div class="sx-step"><span class="sx-num">' + n + '</span><div class="sx-body"><div class="sx-label">' + label +
        '</div><div class="sx-math" dir="ltr">' + body + '</div></div></div>';
    };
    return '<div class="sx-pane" data-lang="' + lang + '" dir="' + L.dir + '"' + (lang === 'en' ? '' : ' lang="ur"') + '>' +
      '<div class="sx-q"><b>' + L.q + ':</b> ' + esc(lang === 'ur' ? r[2] : r[1]) + '</div>' +
      step(1, L.given, esc(r[3])) +
      step(2, L.find, esc(r[4])) +
      step(3, L.formula, esc(r[5])) +
      step(4, L.sub, subs.map(esc).join('<br>')) +
      '<div class="sx-ans"><b>' + L.ans + ':</b> <span dir="ltr">' + esc(r[7]) + '</span></div>' +
      '</div>';
  }

  // Returns the HTML block for a formula name, or '' when no example exists.
  window.solvedExampleHtml = function (name, preferUrdu) {
    var r = MAP[norm(name)];
    if (!r) return '';
    var first = preferUrdu ? 'ur' : 'en';
    var second = preferUrdu ? 'en' : 'ur';
    var panes = pane(r, first) + pane(r, second);
    return '<div class="solved-ex" data-active="' + first + '">' +
      '<div class="sx-head"><span class="sx-title">&#9998; ' + LABELS.en.title + ' &middot; ' + LABELS.ur.title + '</span>' +
      '<span class="sx-tabs"><button type="button" class="sx-tab' + (first === 'en' ? ' active' : '') + '" data-sx="en">English</button>' +
      '<button type="button" class="sx-tab' + (first === 'ur' ? ' active' : '') + '" data-sx="ur">اردو</button></span></div>' +
      panes + '</div>';
  };
  window.SOLVED_EXAMPLE_COUNT = Object.keys(MAP).length;

  // English / Urdu switch inside each example block.
  document.addEventListener('click', function (e) {
    var tab = e.target.closest ? e.target.closest('.sx-tab') : null;
    if (!tab) return;
    var box = tab.closest('.solved-ex');
    if (!box) return;
    box.setAttribute('data-active', tab.getAttribute('data-sx'));
    box.querySelectorAll('.sx-tab').forEach(function (b) { b.classList.toggle('active', b === tab); });
    e.stopPropagation();
  });
})();
