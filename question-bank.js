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
  ]
};
