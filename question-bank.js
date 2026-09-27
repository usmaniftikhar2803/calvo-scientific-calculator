/* ============================================
   CALVO — PRACTICE QUESTION BANK
   Original MCQs written in-house, in the style
   and difficulty level of Pakistani intermediate
   board exams (Matric/FSc, 9th–12th). These are
   NOT scanned or copied from any official board's
   actual past papers — they are practice questions
   covering the same syllabus topics, so students
   can drill concepts without any copyright issue.
   Structure: { topic, question, options[4], correct: index, explanation }
   ============================================ */
const practiceQuestionBank = {

  "Mathematics": [
    {
      topic: "Algebra",
      difficulty: "Easy",
      question: "If 2x + 5 = 17, what is the value of x?",
      options: ["4", "5", "6", "7"],
      correct: 2,
      explanation: "2x = 17 − 5 = 12, so x = 12 ÷ 2 = 6."
    },
    {
      topic: "Algebra",
      difficulty: "Easy",
      question: "What are the roots of x² − 5x + 6 = 0?",
      options: ["x = 1, 6", "x = 2, 3", "x = -2, -3", "x = 2, -3"],
      correct: 1,
      explanation: "Factoring: (x−2)(x−3) = 0, so x = 2 or x = 3."
    },
    {
      topic: "Sets & Functions",
      difficulty: "Easy",
      question: "If A = {1, 2, 3} and B = {2, 3, 4}, what is A ∩ B?",
      options: ["{1, 2, 3, 4}", "{2, 3}", "{1, 4}", "{1, 2, 3}"],
      correct: 1,
      explanation: "Intersection contains only elements common to both sets: 2 and 3."
    },
    {
      topic: "Trigonometry",
      difficulty: "Medium",
      question: "What is the value of sin(90°)?",
      options: ["0", "0.5", "1", "Undefined"],
      correct: 2,
      explanation: "sin(90°) = 1, since at 90° the opposite side equals the hypotenuse."
    },
    {
      topic: "Trigonometry",
      difficulty: "Medium",
      question: "Which identity is always true?",
      options: ["sin²θ + cos²θ = 1", "sin²θ − cos²θ = 1", "sinθ × cosθ = 1", "sinθ + cosθ = 1"],
      correct: 0,
      explanation: "This is the fundamental Pythagorean trigonometric identity, true for all θ."
    },
    {
      topic: "Sequences & Series",
      difficulty: "Medium",
      question: "What is the 5th term of the arithmetic sequence 3, 7, 11, 15, …?",
      options: ["17", "19", "21", "23"],
      correct: 1,
      explanation: "Common difference d = 4, so the 5th term = 3 + 4(5−1) = 3 + 16 = 19."
    },
    {
      topic: "Calculus",
      difficulty: "Medium",
      question: "What is the derivative of x³ with respect to x?",
      options: ["x²", "3x", "3x²", "x³/3"],
      correct: 2,
      explanation: "Using the power rule, d/dx(xⁿ) = n·xⁿ⁻¹, so d/dx(x³) = 3x²."
    },
    {
      topic: "Calculus",
      difficulty: "Hard",
      question: "What is ∫2x dx?",
      options: ["x²", "x² + C", "2x² + C", "x²/2 + C"],
      correct: 1,
      explanation: "The antiderivative of 2x is x², plus a constant of integration C."
    },
    {
      topic: "Matrices",
      difficulty: "Hard",
      question: "For a matrix to have an inverse, its determinant must be:",
      options: ["Equal to 1", "Equal to 0", "Not equal to 0", "A negative number"],
      correct: 2,
      explanation: "A matrix is invertible (non-singular) only when its determinant is non-zero."
    },
    {
      topic: "Coordinate Geometry",
      difficulty: "Hard",
      question: "What is the distance between the points (0, 0) and (3, 4)?",
      options: ["5", "6", "7", "12"],
      correct: 0,
      explanation: "Using the distance formula √(x²+y²) = √(3² + 4²) = √25 = 5."
    }
  ],

  "Physics": [
    {
      topic: "Mechanics",
      difficulty: "Easy",
      question: "What is the SI unit of force?",
      options: ["Joule", "Newton", "Watt", "Pascal"],
      correct: 1,
      explanation: "Force is measured in Newtons (N), defined as kg·m/s²."
    },
    {
      topic: "Mechanics",
      difficulty: "Easy",
      question: "A car accelerates uniformly from rest to 20 m/s in 4 seconds. What is its acceleration?",
      options: ["4 m/s²", "5 m/s²", "8 m/s²", "80 m/s²"],
      correct: 1,
      explanation: "a = (v − u) / t = (20 − 0) / 4 = 5 m/s²."
    },
    {
      topic: "Mechanics",
      difficulty: "Easy",
      question: "Which law states that every action has an equal and opposite reaction?",
      options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Conservation of Energy"],
      correct: 2,
      explanation: "Newton's Third Law describes action-reaction force pairs."
    },
    {
      topic: "Electrostatics",
      difficulty: "Medium",
      question: "What is the SI unit of electric charge?",
      options: ["Volt", "Ampere", "Coulomb", "Ohm"],
      correct: 2,
      explanation: "Electric charge is measured in Coulombs (C)."
    },
    {
      topic: "Electrostatics",
      difficulty: "Medium",
      question: "According to Ohm's Law, if voltage doubles while resistance stays constant, current will:",
      options: ["Double", "Halve", "Stay the same", "Become zero"],
      correct: 0,
      explanation: "I = V/R, so if V doubles and R is constant, I also doubles."
    },
    {
      topic: "Waves",
      difficulty: "Medium",
      question: "What happens to the wavelength of a wave when its frequency increases, if speed stays constant?",
      options: ["Increases", "Decreases", "Stays the same", "Becomes zero"],
      correct: 1,
      explanation: "Since v = fλ and v is constant, wavelength decreases as frequency increases."
    },
    {
      topic: "Thermodynamics",
      difficulty: "Medium",
      question: "What is the boiling point of water at standard atmospheric pressure, in Celsius?",
      options: ["0°C", "50°C", "100°C", "212°C"],
      correct: 2,
      explanation: "Water boils at 100°C (373.15 K) at standard atmospheric pressure."
    },
    {
      topic: "Optics",
      difficulty: "Hard",
      question: "Which type of lens is used to correct short-sightedness (myopia)?",
      options: ["Convex lens", "Concave lens", "Bifocal lens", "Cylindrical lens"],
      correct: 1,
      explanation: "A concave (diverging) lens spreads light rays to correct myopia."
    },
    {
      topic: "Modern Physics",
      difficulty: "Hard",
      question: "What is the approximate speed of light in a vacuum?",
      options: ["3 × 10⁵ m/s", "3 × 10⁶ m/s", "3 × 10⁷ m/s", "3 × 10⁸ m/s"],
      correct: 3,
      explanation: "Light travels at approximately 3 × 10⁸ m/s in a vacuum."
    },
    {
      topic: "Work & Energy",
      difficulty: "Hard",
      question: "A 2 kg object is lifted 5 meters. Taking g = 10 m/s², how much work is done against gravity?",
      options: ["10 J", "50 J", "100 J", "200 J"],
      correct: 2,
      explanation: "W = mgh = 2 × 10 × 5 = 100 Joules."
    }
  ],

  "Chemistry": [
    {
      topic: "Atomic Structure",
      difficulty: "Easy",
      question: "How many electrons can the second electron shell (n=2) hold at maximum?",
      options: ["2", "4", "8", "18"],
      correct: 2,
      explanation: "Maximum electrons per shell = 2n². For n=2, that's 2(2²) = 8."
    },
    {
      topic: "Periodic Table",
      difficulty: "Easy",
      question: "Elements in the same group of the periodic table have the same number of:",
      options: ["Neutrons", "Protons", "Valence electrons", "Total electrons"],
      correct: 2,
      explanation: "Elements in a group share the same number of valence electrons, giving similar chemical properties."
    },
    {
      topic: "Chemical Bonding",
      difficulty: "Easy",
      question: "What type of bond forms when electrons are shared between atoms?",
      options: ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"],
      correct: 1,
      explanation: "A covalent bond forms when two atoms share electron pairs."
    },
    {
      topic: "Stoichiometry",
      difficulty: "Medium",
      question: "How many moles are in 44 grams of CO₂? (Molar mass of CO₂ = 44 g/mol)",
      options: ["0.5 mol", "1 mol", "2 mol", "44 mol"],
      correct: 1,
      explanation: "Moles = mass ÷ molar mass = 44 ÷ 44 = 1 mole."
    },
    {
      topic: "Acids & Bases",
      difficulty: "Medium",
      question: "What is the pH of a neutral solution at 25°C?",
      options: ["0", "7", "10", "14"],
      correct: 1,
      explanation: "A pH of 7 is neutral; below 7 is acidic, above 7 is basic."
    },
    {
      topic: "Acids & Bases",
      difficulty: "Medium",
      question: "Which of these is a strong acid?",
      options: ["Acetic acid", "Carbonic acid", "Hydrochloric acid", "Citric acid"],
      correct: 2,
      explanation: "HCl fully dissociates in water, making it a strong acid."
    },
    {
      topic: "Organic Chemistry",
      difficulty: "Medium",
      question: "What is the general formula for alkanes?",
      options: ["CnH2n", "CnH2n+2", "CnH2n-2", "CnHn"],
      correct: 1,
      explanation: "Alkanes are saturated hydrocarbons with the general formula CnH2n+2."
    },
    {
      topic: "Chemical Reactions",
      difficulty: "Hard",
      question: "In the reaction Zn + 2HCl → ZnCl₂ + H₂, what type of reaction is this?",
      options: ["Combination", "Decomposition", "Displacement", "Neutralization"],
      correct: 2,
      explanation: "Zinc displaces hydrogen from hydrochloric acid — a single displacement reaction."
    },
    {
      topic: "Electrochemistry",
      difficulty: "Hard",
      question: "In an electrochemical cell, oxidation occurs at the:",
      options: ["Cathode", "Anode", "Salt bridge", "Electrolyte"],
      correct: 1,
      explanation: "Oxidation (loss of electrons) always occurs at the anode."
    },
    {
      topic: "States of Matter",
      difficulty: "Hard",
      question: "According to the ideal gas law PV = nRT, if temperature increases at constant volume, pressure will:",
      options: ["Increase", "Decrease", "Stay the same", "Become zero"],
      correct: 0,
      explanation: "At constant volume, P is directly proportional to T, so pressure increases with temperature."
    }
  ],

  "Biology": [
    {
      topic: "Cell Biology",
      difficulty: "Easy",
      question: "Which organelle is known as the 'powerhouse of the cell'?",
      options: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"],
      correct: 2,
      explanation: "Mitochondria produce ATP through cellular respiration, earning this nickname."
    },
    {
      topic: "Cell Biology",
      difficulty: "Easy",
      question: "Which structure is found in plant cells but not animal cells?",
      options: ["Nucleus", "Cell wall", "Mitochondria", "Ribosomes"],
      correct: 1,
      explanation: "Plant cells have a rigid cell wall made of cellulose; animal cells do not."
    },
    {
      topic: "Genetics",
      difficulty: "Easy",
      question: "In a monohybrid cross between two heterozygous (Aa) parents, what fraction of offspring is expected to show the recessive phenotype?",
      options: ["1/4", "1/2", "3/4", "1"],
      correct: 0,
      explanation: "Aa × Aa gives a 1:2:1 ratio (AA:Aa:aa), so 1/4 show the recessive (aa) phenotype."
    },
    {
      topic: "Genetics",
      difficulty: "Medium",
      question: "DNA replication is described as semi-conservative because:",
      options: ["Both strands are destroyed", "Each new DNA molecule has one old and one new strand", "Only RNA is produced", "The process only occurs once per cell"],
      correct: 1,
      explanation: "Each daughter DNA molecule retains one original (parent) strand and one newly synthesized strand."
    },
    {
      topic: "Human Physiology",
      difficulty: "Medium",
      question: "Which chamber of the human heart pumps oxygenated blood to the body?",
      options: ["Right atrium", "Right ventricle", "Left atrium", "Left ventricle"],
      correct: 3,
      explanation: "The left ventricle pumps oxygen-rich blood into the aorta and out to the body."
    },
    {
      topic: "Human Physiology",
      difficulty: "Medium",
      question: "Which enzyme in saliva begins the digestion of starch?",
      options: ["Pepsin", "Amylase", "Lipase", "Trypsin"],
      correct: 1,
      explanation: "Salivary amylase breaks down starch into simpler sugars in the mouth."
    },
    {
      topic: "Ecology",
      difficulty: "Medium",
      question: "What is the primary source of energy for almost all ecosystems on Earth?",
      options: ["Geothermal heat", "The Sun", "Wind", "Ocean currents"],
      correct: 1,
      explanation: "Solar energy drives photosynthesis, which forms the base of most food chains."
    },
    {
      topic: "Botany",
      difficulty: "Hard",
      question: "During photosynthesis, plants absorb which gas from the atmosphere?",
      options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
      correct: 2,
      explanation: "Plants take in CO₂ and use it, along with water and sunlight, to produce glucose and oxygen."
    },
    {
      topic: "Evolution",
      difficulty: "Hard",
      question: "Charles Darwin's theory of evolution is primarily based on the concept of:",
      options: ["Use and disuse of organs", "Natural selection", "Genetic engineering", "Spontaneous generation"],
      correct: 1,
      explanation: "Darwin proposed that organisms with favorable traits are more likely to survive and reproduce — natural selection."
    },
    {
      topic: "Immunology",
      difficulty: "Hard",
      question: "Which blood cells are primarily responsible for fighting infections?",
      options: ["Red blood cells", "White blood cells", "Platelets", "Plasma cells only"],
      correct: 1,
      explanation: "White blood cells (leukocytes) are the immune system's main defense against pathogens."
    }
  ],

  "Statistics": [
    {
      topic: "Descriptive Statistics",
      difficulty: "Easy",
      question: "What is the mean of the data set: 4, 8, 6, 5, 3?",
      options: ["4.6", "5.2", "5.6", "6.0"],
      correct: 1,
      explanation: "Sum = 26, count = 5, mean = 26 ÷ 5 = 5.2."
    },
    {
      topic: "Descriptive Statistics",
      difficulty: "Easy",
      question: "Which measure of central tendency is most affected by extreme outliers?",
      options: ["Mean", "Median", "Mode", "Range"],
      correct: 0,
      explanation: "The mean is pulled significantly by extreme values, unlike the median, which stays stable."
    },
    {
      topic: "Probability",
      difficulty: "Easy",
      question: "A fair six-sided die is rolled once. What is the probability of rolling an even number?",
      options: ["1/6", "1/3", "1/2", "2/3"],
      correct: 2,
      explanation: "There are 3 even numbers (2, 4, 6) out of 6 possible outcomes: 3/6 = 1/2."
    },
    {
      topic: "Probability",
      difficulty: "Medium",
      question: "Two coins are tossed. What is the probability of getting exactly two heads?",
      options: ["1/4", "1/2", "3/4", "1"],
      correct: 0,
      explanation: "Sample space = {HH, HT, TH, TT}. Only 1 outcome is exactly two heads: 1/4."
    },
    {
      topic: "Dispersion",
      difficulty: "Medium",
      question: "What does a standard deviation of 0 indicate about a data set?",
      options: ["The data is highly spread out", "All values are identical", "The mean is 0", "There is no data"],
      correct: 1,
      explanation: "A standard deviation of 0 means there is no variation — every value equals the mean."
    },
    {
      topic: "Correlation",
      difficulty: "Medium",
      question: "A correlation coefficient (r) of -0.9 indicates:",
      options: ["A weak positive relationship", "No relationship", "A strong negative relationship", "A strong positive relationship"],
      correct: 2,
      explanation: "Values close to -1 indicate a strong negative (inverse) linear relationship."
    },
    {
      topic: "Hypothesis Testing",
      difficulty: "Medium",
      question: "In hypothesis testing, what does the null hypothesis (H₀) typically represent?",
      options: ["The result we expect to prove", "No effect or no difference", "The alternative outcome", "A guaranteed conclusion"],
      correct: 1,
      explanation: "The null hypothesis assumes no effect or no difference exists, until evidence suggests otherwise."
    },
    {
      topic: "Distributions",
      difficulty: "Hard",
      question: "In a normal distribution, approximately what percentage of data falls within one standard deviation of the mean?",
      options: ["50%", "68%", "95%", "99.7%"],
      correct: 1,
      explanation: "This is the empirical (68-95-99.7) rule: about 68% of data lies within ±1 standard deviation."
    },
    {
      topic: "Sampling",
      difficulty: "Hard",
      question: "What is the term for selecting a sample where every member of the population has an equal chance of being chosen?",
      options: ["Convenience sampling", "Random sampling", "Judgment sampling", "Quota sampling"],
      correct: 1,
      explanation: "Random sampling gives every population member an equal probability of selection, reducing bias."
    },
    {
      topic: "Descriptive Statistics",
      difficulty: "Hard",
      question: "For the data set 2, 4, 4, 6, 8, what is the mode?",
      options: ["2", "4", "6", "8"],
      correct: 1,
      explanation: "4 appears twice, more often than any other value, making it the mode."
    }
  ],

  "Computer Science": [
    {
      topic: "Number Systems",
      difficulty: "Easy",
      question: "What is the binary equivalent of the decimal number 10?",
      options: ["1010", "1100", "1001", "1110"],
      correct: 0,
      explanation: "10 in decimal = 8 + 2 = 1010 in binary."
    },
    {
      topic: "Number Systems",
      difficulty: "Easy",
      question: "How many bits make one byte?",
      options: ["4", "8", "16", "32"],
      correct: 1,
      explanation: "One byte is defined as 8 bits."
    },
    {
      topic: "Programming Fundamentals",
      difficulty: "Easy",
      question: "Which of these is NOT a typical data type in most programming languages?",
      options: ["Integer", "Boolean", "Float", "Formula"],
      correct: 3,
      explanation: "Integer, Boolean, and Float are standard data types; 'Formula' is not a recognized primitive type."
    },
    {
      topic: "Programming Fundamentals",
      difficulty: "Medium",
      question: "What does a 'for loop' primarily allow a program to do?",
      options: ["Store data permanently", "Repeat a block of code a set number of times", "Connect to the internet", "Compile source code"],
      correct: 1,
      explanation: "A for loop repeats a block of code for a specified number of iterations."
    },
    {
      topic: "Algorithms",
      difficulty: "Medium",
      question: "What is the time complexity of binary search on a sorted array of n elements?",
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
      correct: 2,
      explanation: "Binary search halves the search space each step, giving O(log n) time complexity."
    },
    {
      topic: "Data Structures",
      difficulty: "Medium",
      question: "Which data structure follows the Last-In-First-Out (LIFO) principle?",
      options: ["Queue", "Stack", "Array", "Linked List"],
      correct: 1,
      explanation: "A stack removes the most recently added item first — Last In, First Out."
    },
    {
      topic: "Data Structures",
      difficulty: "Medium",
      question: "Which data structure follows the First-In-First-Out (FIFO) principle?",
      options: ["Stack", "Tree", "Queue", "Graph"],
      correct: 2,
      explanation: "A queue processes items in the order they were added — First In, First Out."
    },
    {
      topic: "Databases",
      difficulty: "Hard",
      question: "In a relational database, what is used to uniquely identify each record in a table?",
      options: ["Foreign key", "Primary key", "Index", "Schema"],
      correct: 1,
      explanation: "A primary key uniquely identifies each row/record in a table."
    },
    {
      topic: "Networking",
      difficulty: "Hard",
      question: "What does 'HTTP' stand for?",
      options: ["HyperText Transfer Protocol", "High Transfer Text Program", "Hyperlink Text Transmission Process", "Home Tool Transfer Protocol"],
      correct: 0,
      explanation: "HTTP stands for HyperText Transfer Protocol, used for transmitting web pages."
    },
    {
      topic: "Logic Gates",
      difficulty: "Hard",
      question: "An AND gate outputs 1 (true) only when:",
      options: ["At least one input is 1", "All inputs are 0", "All inputs are 1", "Exactly one input is 1"],
      correct: 2,
      explanation: "An AND gate outputs 1 only if every one of its inputs is 1."
    }
  ],
  "English": [
    {
      topic: "Grammar",
      difficulty: "Easy",
      question: "Choose the correctly spelled word.",
      options: ["Recieve", "Receive", "Receeve", "Receve"],
      correct: 1,
      explanation: "The correct spelling follows the rule 'i before e except after c': R-E-C-E-I-V-E."
    },
    {
      topic: "Vocabulary",
      difficulty: "Easy",
      question: "What is a synonym for 'enormous'?",
      options: ["Tiny", "Huge", "Narrow", "Quiet"],
      correct: 1,
      explanation: "'Enormous' means very large, which is synonymous with 'huge'."
    },
    {
      topic: "Grammar",
      difficulty: "Medium",
      question: "Identify the correctly punctuated sentence.",
      options: ["Its a beautiful day.", "It's a beautiful day.", "Its' a beautiful day.", "It is' a beautiful day."],
      correct: 1,
      explanation: "'It's' is the contraction of 'it is', which fits this sentence."
    },
    {
      topic: "Grammar",
      difficulty: "Medium",
      question: "Which sentence is written in the passive voice?",
      options: ["The teacher explained the lesson.", "The lesson was explained by the teacher.", "The teacher is explaining the lesson.", "The teacher will explain the lesson."],
      correct: 1,
      explanation: "In the passive voice the subject receives the action; here 'the lesson' receives the action of being explained."
    },
    {
      topic: "Vocabulary",
      difficulty: "Hard",
      question: "Which word means the opposite of 'ancient'?",
      options: ["Antique", "Modern", "Historic", "Old"],
      correct: 1,
      explanation: "'Modern' is the antonym of 'ancient', which means very old."
    }
  ],

  "Urdu Language": [
    {
      topic: "Vocabulary",
      difficulty: "Easy",
      question: "What is the Urdu word for 'book'?",
      options: ["\u06a9\u062a\u0627\u0628", "\u0642\u0644\u0645", "\u0645\u06cc\u0632", "\u06a9\u0631\u0633\u06cc"],
      correct: 0,
      explanation: "'\u06a9\u062a\u0627\u0628' is the Urdu word for 'book'."
    },
    {
      topic: "Vocabulary",
      difficulty: "Easy",
      question: "What is the Urdu word for 'water'?",
      options: ["\u06c1\u0648\u0627", "\u067e\u0627\u0646\u06cc", "\u0622\u06af", "\u0645\u0679\u06cc"],
      correct: 1,
      explanation: "'\u067e\u0627\u0646\u06cc' is the Urdu word for 'water'."
    },
    {
      topic: "Grammar",
      difficulty: "Medium",
      question: "In Urdu grammar, what does '\u0627\u0633\u0645' (Ism) correspond to in English?",
      options: ["Verb", "Noun", "Adjective", "Pronoun"],
      correct: 1,
      explanation: "'\u0627\u0633\u0645' translates to 'noun' \u2014 a word that names a person, place, or thing."
    },
    {
      topic: "Grammar",
      difficulty: "Medium",
      question: "What is '\u0641\u0639\u0644' (Fail) called in English grammar?",
      options: ["Noun", "Adverb", "Verb", "Preposition"],
      correct: 2,
      explanation: "'\u0641\u0639\u0644' means 'verb', a word that expresses an action or state."
    },
    {
      topic: "Literature",
      difficulty: "Hard",
      question: "Allama Iqbal is best known as Pakistan's:",
      options: ["National Poet", "First President", "Founder of PTV", "Cricket Captain"],
      correct: 0,
      explanation: "Allama Muhammad Iqbal is widely regarded as Pakistan's national poet (Shair-e-Mashriq)."
    }
  ],

  "Pakistan Studies": [
    {
      topic: "History",
      difficulty: "Easy",
      question: "In which year did Pakistan gain independence?",
      options: ["1945", "1946", "1947", "1948"],
      correct: 2,
      explanation: "Pakistan came into being on 14 August 1947."
    },
    {
      topic: "Geography",
      difficulty: "Easy",
      question: "Which is the largest province of Pakistan by area?",
      options: ["Punjab", "Sindh", "Balochistan", "Khyber Pakhtunkhwa"],
      correct: 2,
      explanation: "Balochistan is the largest province of Pakistan by land area."
    },
    {
      topic: "History",
      difficulty: "Medium",
      question: "Who is known as the founder of Pakistan?",
      options: ["Allama Iqbal", "Liaquat Ali Khan", "Muhammad Ali Jinnah", "Sir Syed Ahmed Khan"],
      correct: 2,
      explanation: "Muhammad Ali Jinnah, known as Quaid-e-Azam, is regarded as the founder of Pakistan."
    },
    {
      topic: "Geography",
      difficulty: "Medium",
      question: "Which river is the longest in Pakistan?",
      options: ["Jhelum", "Chenab", "Indus", "Ravi"],
      correct: 2,
      explanation: "The Indus River is the longest river in Pakistan, flowing through the entire country."
    },
    {
      topic: "Civics",
      difficulty: "Hard",
      question: "Pakistan's current Constitution was adopted in which year?",
      options: ["1956", "1962", "1973", "1985"],
      correct: 2,
      explanation: "The current Constitution of Pakistan was adopted on 10 April 1973."
    }
  ],

  "Islamiyat": [
    {
      topic: "Beliefs",
      difficulty: "Easy",
      question: "How many Pillars of Islam are there?",
      options: ["Three", "Four", "Five", "Six"],
      correct: 2,
      explanation: "Islam has Five Pillars: Shahadah, Salah, Zakat, Sawm, and Hajj."
    },
    {
      topic: "Beliefs",
      difficulty: "Easy",
      question: "Which is the holy book of Islam?",
      options: ["Torah", "Bible", "Quran", "Zabur"],
      correct: 2,
      explanation: "The Quran is the central religious text of Islam."
    },
    {
      topic: "History",
      difficulty: "Medium",
      question: "In which month is fasting (Sawm) obligatory for Muslims?",
      options: ["Shawwal", "Ramadan", "Muharram", "Rajab"],
      correct: 1,
      explanation: "Muslims fast during the month of Ramadan, the ninth month of the Islamic calendar."
    },
    {
      topic: "History",
      difficulty: "Medium",
      question: "The Hijra refers to the migration of the Prophet (PBUH) from:",
      options: ["Makkah to Madinah", "Madinah to Makkah", "Taif to Makkah", "Jerusalem to Makkah"],
      correct: 0,
      explanation: "The Hijra was the migration of Prophet Muhammad (PBUH) from Makkah to Madinah in 622 CE."
    },
    {
      topic: "Beliefs",
      difficulty: "Hard",
      question: "Which pillar of Islam refers to the pilgrimage to Makkah?",
      options: ["Zakat", "Sawm", "Hajj", "Salah"],
      correct: 2,
      explanation: "Hajj is the pilgrimage to Makkah, obligatory once in a lifetime for those who are able."
    }
  ],

  "Accounting": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "The accounting equation is:",
      options: ["Assets = Liabilities \u2212 Capital", "Assets = Liabilities + Capital", "Capital = Assets + Liabilities", "Liabilities = Assets + Capital"],
      correct: 1,
      explanation: "The fundamental accounting equation states Assets = Liabilities + Capital (Owner's Equity)."
    },
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "Which type of account normally has a debit balance?",
      options: ["Revenue", "Liabilities", "Assets", "Capital"],
      correct: 2,
      explanation: "Asset accounts normally carry a debit balance."
    },
    {
      topic: "Journal",
      difficulty: "Medium",
      question: "The book of original entry is called the:",
      options: ["Ledger", "Trial Balance", "Journal", "Balance Sheet"],
      correct: 2,
      explanation: "Transactions are first recorded in the Journal, the book of original entry."
    },
    {
      topic: "Financial Statements",
      difficulty: "Medium",
      question: "Which statement shows a company's financial position at a point in time?",
      options: ["Income Statement", "Balance Sheet", "Cash Flow Statement", "Trial Balance"],
      correct: 1,
      explanation: "The Balance Sheet reports assets, liabilities, and equity as of a specific date."
    },
    {
      topic: "Depreciation",
      difficulty: "Hard",
      question: "Under the straight-line method, depreciation expense each year is:",
      options: ["Variable", "The same each year", "Decreasing", "Increasing"],
      correct: 1,
      explanation: "Straight-line depreciation spreads the asset's cost evenly, giving the same expense every year."
    }
  ],

  "Business Studies": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "A business owned and run by one person is called a:",
      options: ["Partnership", "Sole Proprietorship", "Corporation", "Cooperative"],
      correct: 1,
      explanation: "A sole proprietorship is owned and operated by a single individual."
    },
    {
      topic: "Marketing",
      difficulty: "Easy",
      question: "The traditional marketing mix is commonly known as the:",
      options: ["4 P's: Product, Price, Place, Promotion", "4 P's: People, Price, Product, Plan", "4 P's: Place, Profit, Product, Price", "4 P's: Promotion, Profit, Plan, Place"],
      correct: 0,
      explanation: "The traditional marketing mix consists of Product, Price, Place, and Promotion."
    },
    {
      topic: "Management",
      difficulty: "Medium",
      question: "Which function of management involves setting goals and deciding how to achieve them?",
      options: ["Organizing", "Planning", "Leading", "Controlling"],
      correct: 1,
      explanation: "Planning is the management function of setting objectives and determining the course of action."
    },
    {
      topic: "Business Types",
      difficulty: "Medium",
      question: "A business that is legally separate from its owners is called a:",
      options: ["Sole Proprietorship", "Partnership", "Corporation", "Franchise"],
      correct: 2,
      explanation: "A corporation has a distinct legal identity separate from its shareholders."
    },
    {
      topic: "Strategy",
      difficulty: "Hard",
      question: "SWOT analysis stands for:",
      options: ["Strengths, Weaknesses, Opportunities, Threats", "Sales, Wages, Output, Tax", "Strategy, Work, Organization, Team", "Structure, Workflow, Operations, Targets"],
      correct: 0,
      explanation: "SWOT analysis evaluates a business's Strengths, Weaknesses, Opportunities, and Threats."
    }
  ],

  "Economics": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "The law of demand states that, other things equal, as price rises, quantity demanded:",
      options: ["Rises", "Falls", "Stays the same", "Doubles"],
      correct: 1,
      explanation: "According to the law of demand, price and quantity demanded are inversely related."
    },
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "What is 'inflation'?",
      options: ["A fall in the general price level", "A rise in the general price level", "A fixed exchange rate", "An increase in exports"],
      correct: 1,
      explanation: "Inflation refers to a sustained rise in the general price level of goods and services."
    },
    {
      topic: "Microeconomics",
      difficulty: "Medium",
      question: "In a perfectly competitive market, individual firms are:",
      options: ["Price makers", "Price takers", "Monopolists", "Regulated by government only"],
      correct: 1,
      explanation: "Firms in perfect competition must accept the market price; they are price takers."
    },
    {
      topic: "Macroeconomics",
      difficulty: "Medium",
      question: "GDP stands for:",
      options: ["Gross Domestic Product", "General Domestic Price", "Gross Development Plan", "Government Debt Payment"],
      correct: 0,
      explanation: "GDP (Gross Domestic Product) measures the total value of goods and services produced in a country."
    },
    {
      topic: "Macroeconomics",
      difficulty: "Hard",
      question: "Which of these is an example of a direct tax?",
      options: ["Sales tax", "Income tax", "Customs duty", "Excise duty"],
      correct: 1,
      explanation: "Income tax is paid directly by individuals or firms to the government, making it a direct tax."
    }
  ],

  "Commerce": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "Commerce mainly deals with the:",
      options: ["Production of goods", "Exchange and distribution of goods", "Manufacturing process only", "Farming activities"],
      correct: 1,
      explanation: "Commerce covers the activities involved in the exchange and distribution of goods and services."
    },
    {
      topic: "Trade",
      difficulty: "Easy",
      question: "Trade conducted between two different countries is called:",
      options: ["Internal trade", "Home trade", "Foreign trade", "Wholesale trade"],
      correct: 2,
      explanation: "Trade conducted between two different countries is known as foreign (international) trade."
    },
    {
      topic: "Banking",
      difficulty: "Medium",
      question: "A cheque that can be transferred simply by handing it over is called a:",
      options: ["Crossed cheque", "Bearer cheque", "Order cheque", "Post-dated cheque"],
      correct: 1,
      explanation: "A bearer cheque is payable to whoever holds it and can be transferred by delivery alone."
    },
    {
      topic: "Insurance",
      difficulty: "Medium",
      question: "Insurance is primarily a means of:",
      options: ["Making profit", "Risk transfer", "Avoiding taxes", "Increasing sales"],
      correct: 1,
      explanation: "Insurance allows individuals or businesses to transfer financial risk to an insurer."
    },
    {
      topic: "Trade",
      difficulty: "Hard",
      question: "A document that acts as proof of ownership of goods shipped by sea is called a:",
      options: ["Invoice", "Bill of Lading", "Bill of Exchange", "Letter of Credit"],
      correct: 1,
      explanation: "A Bill of Lading is issued by a carrier and serves as a receipt and title document for shipped goods."
    }
  ],

  "Psychology": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "Psychology is best defined as the scientific study of:",
      options: ["The brain only", "Behaviour and mental processes", "Social institutions", "Historical events"],
      correct: 1,
      explanation: "Psychology is the scientific study of behaviour and mental processes."
    },
    {
      topic: "Learning",
      difficulty: "Easy",
      question: "Classical conditioning was famously studied by:",
      options: ["Sigmund Freud", "B.F. Skinner", "Ivan Pavlov", "Jean Piaget"],
      correct: 2,
      explanation: "Ivan Pavlov is famous for his classical conditioning experiments with dogs."
    },
    {
      topic: "Memory",
      difficulty: "Medium",
      question: "Short-term memory is also commonly known as:",
      options: ["Sensory memory", "Working memory", "Long-term memory", "Procedural memory"],
      correct: 1,
      explanation: "Short-term memory is often referred to as working memory, used for holding information briefly."
    },
    {
      topic: "Development",
      difficulty: "Medium",
      question: "Who proposed the well-known stages of cognitive development in children?",
      options: ["Sigmund Freud", "Jean Piaget", "Carl Rogers", "B.F. Skinner"],
      correct: 1,
      explanation: "Jean Piaget proposed an influential theory describing stages of cognitive development in children."
    },
    {
      topic: "Personality",
      difficulty: "Hard",
      question: "Which theory suggests personality develops through psychosexual stages?",
      options: ["Freud's theory", "Piaget's theory", "Skinner's theory", "Maslow's theory"],
      correct: 0,
      explanation: "Sigmund Freud's psychoanalytic theory describes personality development through psychosexual stages."
    }
  ],

  "Geography": [
    {
      topic: "Physical Geography",
      difficulty: "Easy",
      question: "Which is the largest continent by area?",
      options: ["Africa", "Asia", "Europe", "Antarctica"],
      correct: 1,
      explanation: "Asia is the largest continent by both area and population."
    },
    {
      topic: "Physical Geography",
      difficulty: "Easy",
      question: "Which is generally considered the longest river in the world?",
      options: ["Amazon", "Nile", "Yangtze", "Mississippi"],
      correct: 1,
      explanation: "The Nile River, at about 6,650 km, is generally regarded as the world's longest river."
    },
    {
      topic: "Climate",
      difficulty: "Medium",
      question: "The imaginary line at 0\u00b0 latitude is called the:",
      options: ["Equator", "Tropic of Cancer", "Prime Meridian", "Arctic Circle"],
      correct: 0,
      explanation: "The Equator is the imaginary line at 0\u00b0 latitude dividing the Earth into Northern and Southern hemispheres."
    },
    {
      topic: "Physical Geography",
      difficulty: "Medium",
      question: "Mount Everest is located in which mountain range?",
      options: ["Andes", "Alps", "Himalayas", "Rockies"],
      correct: 2,
      explanation: "Mount Everest, the world's highest peak, is part of the Himalayan mountain range."
    },
    {
      topic: "Climate",
      difficulty: "Hard",
      question: "Which line of longitude is used as the reference (0\u00b0) for world time zones?",
      options: ["Equator", "Tropic of Capricorn", "Prime Meridian", "International Date Line"],
      correct: 2,
      explanation: "The Prime Meridian (0\u00b0 longitude), passing through Greenwich, is the reference line for world time zones."
    }
  ],

  "History": [
    {
      topic: "World History",
      difficulty: "Easy",
      question: "World War II ended in which year?",
      options: ["1943", "1944", "1945", "1946"],
      correct: 2,
      explanation: "World War II ended in 1945 with the surrender of Germany and Japan."
    },
    {
      topic: "World History",
      difficulty: "Easy",
      question: "Who was the first President of the United States?",
      options: ["Abraham Lincoln", "George Washington", "Thomas Jefferson", "John Adams"],
      correct: 1,
      explanation: "George Washington served as the first President of the United States."
    },
    {
      topic: "Ancient History",
      difficulty: "Medium",
      question: "The pyramids of Giza were built in ancient:",
      options: ["Greece", "Rome", "Egypt", "Persia"],
      correct: 2,
      explanation: "The Pyramids of Giza are ancient structures built in Egypt as tombs for pharaohs."
    },
    {
      topic: "World History",
      difficulty: "Medium",
      question: "The French Revolution began in which year?",
      options: ["1776", "1789", "1804", "1815"],
      correct: 1,
      explanation: "The French Revolution began in 1789, leading to major political and social change in France."
    },
    {
      topic: "World History",
      difficulty: "Hard",
      question: "The Renaissance period began in which country?",
      options: ["France", "England", "Italy", "Spain"],
      correct: 2,
      explanation: "The Renaissance began in Italy in the 14th century before spreading across Europe."
    }
  ],

  "Civics": [
    {
      topic: "Government",
      difficulty: "Easy",
      question: "A country ruled by elected representatives of the people is called a:",
      options: ["Monarchy", "Democracy", "Dictatorship", "Theocracy"],
      correct: 1,
      explanation: "A democracy is a system of government where citizens choose their leaders through elections."
    },
    {
      topic: "Rights",
      difficulty: "Easy",
      question: "The right to vote is also known as:",
      options: ["Civil right", "Suffrage", "Fundamental duty", "Judicial right"],
      correct: 1,
      explanation: "Suffrage refers to the right to vote in political elections."
    },
    {
      topic: "Government",
      difficulty: "Medium",
      question: "Which branch of government is primarily responsible for making laws?",
      options: ["Executive", "Judiciary", "Legislature", "Bureaucracy"],
      correct: 2,
      explanation: "The Legislature is the branch of government responsible for making laws."
    },
    {
      topic: "Government",
      difficulty: "Medium",
      question: "The head of the judiciary in most countries is called the:",
      options: ["Prime Minister", "Chief Justice", "Speaker", "Governor"],
      correct: 1,
      explanation: "The Chief Justice typically heads the judiciary in most countries."
    },
    {
      topic: "Citizenship",
      difficulty: "Hard",
      question: "The doctrine of 'separation of powers' typically divides government into how many main branches?",
      options: ["Two", "Three", "Four", "Five"],
      correct: 1,
      explanation: "Separation of powers typically divides government into three branches: legislative, executive, and judicial."
    }
  ],

  "General Knowledge": [
    {
      topic: "World",
      difficulty: "Easy",
      question: "How many continents are there on Earth?",
      options: ["Five", "Six", "Seven", "Eight"],
      correct: 2,
      explanation: "There are seven continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia."
    },
    {
      topic: "World",
      difficulty: "Easy",
      question: "Which is the largest ocean on Earth?",
      options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
      correct: 3,
      explanation: "The Pacific Ocean is the largest and deepest ocean on Earth."
    },
    {
      topic: "World",
      difficulty: "Medium",
      question: "The official currency of Japan is called the:",
      options: ["Won", "Yuan", "Yen", "Ringgit"],
      correct: 2,
      explanation: "Japan's official currency is the Yen."
    },
    {
      topic: "World",
      difficulty: "Medium",
      question: "Which organization is responsible for coordinating international public health?",
      options: ["UNESCO", "WHO", "UNICEF", "WTO"],
      correct: 1,
      explanation: "The World Health Organization (WHO) coordinates international public health matters."
    },
    {
      topic: "World",
      difficulty: "Hard",
      question: "Which country currently has the largest population in the world?",
      options: ["United States", "India", "China", "Indonesia"],
      correct: 1,
      explanation: "India surpassed China to become the world's most populous country, according to recent United Nations estimates."
    }
  ],

  "Everyday Science": [
    {
      topic: "Biology",
      difficulty: "Easy",
      question: "Which gas do plants absorb from the atmosphere for photosynthesis?",
      options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
      correct: 1,
      explanation: "Plants absorb carbon dioxide from the air and use it, along with sunlight, to make food through photosynthesis."
    },
    {
      topic: "Biology",
      difficulty: "Easy",
      question: "Which part of the human eye controls how much light enters it?",
      options: ["Retina", "Pupil", "Cornea", "Lens"],
      correct: 1,
      explanation: "The pupil expands or contracts to control how much light enters the eye."
    },
    {
      topic: "Chemistry",
      difficulty: "Medium",
      question: "Rusting of iron is an example of a:",
      options: ["Physical change", "Chemical change", "Nuclear change", "No change"],
      correct: 1,
      explanation: "Rusting is a chemical change, as iron reacts with oxygen and moisture to form iron oxide."
    },
    {
      topic: "Biology",
      difficulty: "Medium",
      question: "Which organ in the human body produces insulin?",
      options: ["Liver", "Kidney", "Pancreas", "Stomach"],
      correct: 2,
      explanation: "The pancreas produces insulin, a hormone that regulates blood sugar levels."
    },
    {
      topic: "Physics",
      difficulty: "Hard",
      question: "Sound cannot travel through:",
      options: ["Solids", "Liquids", "Gases", "Vacuum"],
      correct: 3,
      explanation: "Sound needs a medium to travel and cannot pass through a vacuum, as there are no particles to carry the vibrations."
    }
  ],

  "Environmental Science": [
    {
      topic: "Ecology",
      difficulty: "Easy",
      question: "The layer of gases surrounding the Earth is called the:",
      options: ["Biosphere", "Atmosphere", "Lithosphere", "Hydrosphere"],
      correct: 1,
      explanation: "The atmosphere is the layer of gases that surrounds the Earth."
    },
    {
      topic: "Pollution",
      difficulty: "Easy",
      question: "Which gas is mainly responsible for the greenhouse effect?",
      options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
      correct: 2,
      explanation: "Carbon dioxide is a major greenhouse gas that traps heat in the Earth's atmosphere."
    },
    {
      topic: "Ecology",
      difficulty: "Medium",
      question: "A community of interacting organisms and their physical environment is called a(n):",
      options: ["Population", "Ecosystem", "Habitat", "Biome"],
      correct: 1,
      explanation: "An ecosystem consists of living organisms interacting with each other and their physical environment."
    },
    {
      topic: "Conservation",
      difficulty: "Medium",
      question: "Which of the following is a renewable source of energy?",
      options: ["Coal", "Natural gas", "Solar energy", "Petroleum"],
      correct: 2,
      explanation: "Solar energy is renewable because it is continuously replenished by sunlight, unlike fossil fuels."
    },
    {
      topic: "Pollution",
      difficulty: "Hard",
      question: "The depletion of which layer allows more harmful UV rays to reach the Earth's surface?",
      options: ["Ozone layer", "Troposphere", "Ionosphere", "Mesosphere"],
      correct: 0,
      explanation: "The ozone layer absorbs most of the sun's harmful UV radiation; its depletion allows more UV rays to reach Earth."
    }
  ],

  "Astronomy": [
    {
      topic: "Solar System",
      difficulty: "Easy",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1,
      explanation: "Mars is called the Red Planet due to iron oxide (rust) on its surface, giving it a reddish colour."
    },
    {
      topic: "Solar System",
      difficulty: "Easy",
      question: "Which is the closest planet to the Sun?",
      options: ["Earth", "Venus", "Mercury", "Mars"],
      correct: 2,
      explanation: "Mercury is the closest planet to the Sun in our solar system."
    },
    {
      topic: "Stars",
      difficulty: "Medium",
      question: "Our Sun is classified as a:",
      options: ["Red Giant", "White Dwarf", "Yellow Dwarf Star", "Neutron Star"],
      correct: 2,
      explanation: "The Sun is a yellow dwarf star, a relatively average-sized star on the main sequence."
    },
    {
      topic: "Solar System",
      difficulty: "Medium",
      question: "Which planet has the most prominent ring system?",
      options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
      correct: 1,
      explanation: "Saturn is famous for its extensive and prominent system of rings made mostly of ice and rock."
    },
    {
      topic: "Universe",
      difficulty: "Hard",
      question: "Which large galaxy, closest to the Milky Way, is expected to collide with it in the distant future?",
      options: ["Triangulum Galaxy", "Andromeda Galaxy", "Whirlpool Galaxy", "Sombrero Galaxy"],
      correct: 1,
      explanation: "The Andromeda Galaxy is the closest large galaxy to the Milky Way and is expected to collide with it in the distant future."
    }
  ],

  "Health & Nutrition": [
    {
      topic: "Nutrients",
      difficulty: "Easy",
      question: "Which nutrient is the body's main source of energy?",
      options: ["Proteins", "Carbohydrates", "Vitamins", "Minerals"],
      correct: 1,
      explanation: "Carbohydrates are the body's primary and most readily available source of energy."
    },
    {
      topic: "Vitamins",
      difficulty: "Easy",
      question: "A deficiency of Vitamin C can lead to which disease?",
      options: ["Rickets", "Scurvy", "Night blindness", "Anemia"],
      correct: 1,
      explanation: "A lack of Vitamin C can cause scurvy, characterised by bleeding gums and weakness."
    },
    {
      topic: "Vitamins",
      difficulty: "Medium",
      question: "Which vitamin is produced in the skin when exposed to sunlight?",
      options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"],
      correct: 3,
      explanation: "Vitamin D is synthesised in the skin through exposure to sunlight."
    },
    {
      topic: "Fitness",
      difficulty: "Medium",
      question: "Regular aerobic exercise primarily strengthens which system?",
      options: ["Digestive system", "Cardiovascular system", "Skeletal system", "Nervous system"],
      correct: 1,
      explanation: "Aerobic exercise strengthens the heart and lungs, improving overall cardiovascular health."
    },
    {
      topic: "Nutrients",
      difficulty: "Hard",
      question: "Which mineral is essential for the formation of haemoglobin?",
      options: ["Calcium", "Iron", "Potassium", "Zinc"],
      correct: 1,
      explanation: "Iron is a key component of haemoglobin, the protein in red blood cells that carries oxygen."
    }
  ],

  "Banking & Finance": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "A bank account that allows unlimited withdrawals and deposits is called a:",
      options: ["Fixed deposit account", "Current account", "Recurring deposit account", "Term account"],
      correct: 1,
      explanation: "A current account allows frequent, unlimited transactions and is typically used by businesses."
    },
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "The interest paid by a bank to customers on their deposits is called:",
      options: ["Loan interest", "Deposit interest", "Overdraft charge", "Service fee"],
      correct: 1,
      explanation: "Deposit interest is the amount a bank pays customers for keeping their money in an account."
    },
    {
      topic: "Instruments",
      difficulty: "Medium",
      question: "A written document ordering a bank to pay a specific amount is called a:",
      options: ["Invoice", "Cheque", "Receipt", "Ledger"],
      correct: 1,
      explanation: "A cheque is a written order directing a bank to pay a specified sum from the account holder's funds."
    },
    {
      topic: "Institutions",
      difficulty: "Medium",
      question: "The central bank of Pakistan is called the:",
      options: ["National Bank of Pakistan", "State Bank of Pakistan", "Habib Bank Limited", "Bank of Punjab"],
      correct: 1,
      explanation: "The State Bank of Pakistan (SBP) is the central bank responsible for monetary policy in Pakistan."
    },
    {
      topic: "Finance",
      difficulty: "Hard",
      question: "Compound interest differs from simple interest because it is calculated on:",
      options: ["Principal only", "Principal plus accumulated interest", "Interest only", "A fixed rate only"],
      correct: 1,
      explanation: "Compound interest is calculated on the principal plus any interest already accumulated, so it grows faster than simple interest."
    }
  ],

  "Political Science": [
    {
      topic: "Basics",
      difficulty: "Easy",
      question: "The study of government, politics, and public policy is called:",
      options: ["Sociology", "Political Science", "Economics", "Anthropology"],
      correct: 1,
      explanation: "Political Science is the academic discipline that studies government, politics, and public policy."
    },
    {
      topic: "Systems",
      difficulty: "Easy",
      question: "A country where power is concentrated in a single ruler is called a:",
      options: ["Democracy", "Monarchy", "Federation", "Republic"],
      correct: 1,
      explanation: "In a monarchy, power is typically held by a single ruler, such as a king or queen."
    },
    {
      topic: "Systems",
      difficulty: "Medium",
      question: "A political system in which power is divided between a central government and states is called:",
      options: ["Unitary system", "Federal system", "Confederal system", "Monarchy"],
      correct: 1,
      explanation: "In a federal system, power is constitutionally divided between a central authority and constituent states."
    },
    {
      topic: "Ideology",
      difficulty: "Medium",
      question: "Which ideology emphasizes minimal government interference in the economy?",
      options: ["Socialism", "Classical Liberalism (laissez-faire)", "Communism", "Fascism"],
      correct: 1,
      explanation: "Classical liberalism, or laissez-faire, advocates for minimal government intervention in economic affairs."
    },
    {
      topic: "Government",
      difficulty: "Hard",
      question: "In a parliamentary system, the head of government is usually the:",
      options: ["President", "Prime Minister", "Chief Justice", "Governor-General"],
      correct: 1,
      explanation: "In parliamentary systems, the Prime Minister, typically the leader of the majority party, serves as head of government."
    }
  ],

  "Logical Reasoning": [
    {
      topic: "Number Series",
      difficulty: "Easy",
      question: "What comes next in the series: 2, 4, 6, 8, ?",
      options: ["9", "10", "12", "11"],
      correct: 1,
      explanation: "The series increases by 2 each time, so the next number after 8 is 10."
    },
    {
      topic: "Classification",
      difficulty: "Easy",
      question: "Choose the odd one out: Apple, Banana, Carrot, Mango.",
      options: ["Apple", "Banana", "Carrot", "Mango"],
      correct: 2,
      explanation: "Apple, Banana, and Mango are fruits, while Carrot is a vegetable, making it the odd one out."
    },
    {
      topic: "Number Series",
      difficulty: "Medium",
      question: "What comes next in the series: 1, 4, 9, 16, ?",
      options: ["20", "24", "25", "30"],
      correct: 2,
      explanation: "These are perfect squares (1\u00b2, 2\u00b2, 3\u00b2, 4\u00b2...), so the next term is 5\u00b2 = 25."
    },
    {
      topic: "Analogy",
      difficulty: "Medium",
      question: "Pen is to Write as Knife is to:",
      options: ["Sharp", "Cut", "Kitchen", "Metal"],
      correct: 1,
      explanation: "A pen is used to write, just as a knife is used to cut \u2014 the relationship is tool-to-function."
    },
    {
      topic: "Deduction",
      difficulty: "Hard",
      question: "If all roses are flowers and some flowers fade quickly, which of the following must be true?",
      options: ["All roses fade quickly", "Some flowers are roses", "All flowers are roses", "Some roses may fade quickly"],
      correct: 1,
      explanation: "Since all roses are flowers, roses belong to the set of flowers, so it logically follows that some flowers are roses."
    }
  ]
};
