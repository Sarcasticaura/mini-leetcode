window.defaultProblems = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    description: "Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.<br><br>You may assume that each input would have exactly one solution, and you may not use the same element twice.<br><br>You can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
    // Write your code here
    
}`,
      python: `def twoSum(nums, target):
    # Write your code here
    pass`
    },
    functionName: "twoSum",
    paramNames: ["nums", "target"],
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] }
    ],
    validationCases: [
      { input: [[1, 5, 8, 12, 14], 20], expected: [2, 3] },
      { input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
      { input: [[5, 25, 75, 100], 125], expected: [1, 3] }
    ]
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Strings",
    description: "Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.<br><br>An input string is valid if:<br>1. Open brackets must be closed by the same type of brackets.<br>2. Open brackets must be closed in the correct order.<br>3. Every close bracket has a corresponding open bracket of the same type.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only: '()[]{}'"
    ],
    examples: [
      {
        input: 's = "()"',
        output: "true"
      },
      {
        input: 's = "()[]{}"',
        output: "true"
      },
      {
        input: 's = "(]"',
        output: "false"
      }
    ],
    starterCode: {
      javascript: `function isValid(s) {
    // Write your code here
    
}`,
      python: `def isValid(s):
    # Write your code here
    pass`
    },
    functionName: "isValid",
    paramNames: ["s"],
    testCases: [
      { input: ["()"], expected: true },
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["([)]"], expected: false }
    ],
    validationCases: [
      { input: ["{[]}"], expected: true },
      { input: ["["], expected: false },
      { input: ["]"], expected: false },
      { input: ["(((((())))))"], expected: true }
    ]
  },
  {
    id: "palindrome-number",
    title: "Palindrome Number",
    difficulty: "Easy",
    category: "Math",
    description: "Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is a palindrome, and <code>false</code> otherwise.<br><br>An integer is a palindrome when it reads the same backward as forward. For example, <code>121</code> is palindrome while <code>123</code> is not.",
    constraints: [
      "-2^31 <= x <= 2^31 - 1"
    ],
    examples: [
      {
        input: "x = 121",
        output: "true",
        explanation: "121 reads as 121 from left to right and from right to left."
      },
      {
        input: "x = -121",
        output: "false",
        explanation: "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome."
      }
    ],
    starterCode: {
      javascript: `function isPalindrome(x) {
    // Write your code here
    
}`,
      python: `def isPalindrome(x):
    # Write your code here
    pass`
    },
    functionName: "isPalindrome",
    paramNames: ["x"],
    testCases: [
      { input: [121], expected: true },
      { input: [-121], expected: false },
      { input: [10], expected: false }
    ],
    validationCases: [
      { input: [0], expected: true },
      { input: [12321], expected: true },
      { input: [123456], expected: false },
      { input: [-101], expected: false }
    ]
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    category: "Strings",
    description: "Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code>, and <code>false</code> otherwise.<br><br>An <b>Anagram</b> is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    examples: [
      {
        input: 's = "anagram", t = "nagaram"',
        output: "true"
      },
      {
        input: 's = "rat", t = "car"',
        output: "false"
      }
    ],
    starterCode: {
      javascript: `function isAnagram(s, t) {
    // Write your code here
    
}`,
      python: `def isAnagram(s, t):
    # Write your code here
    pass`
    },
    functionName: "isAnagram",
    paramNames: ["s", "t"],
    testCases: [
      { input: ["anagram", "nagaram"], expected: true },
      { input: ["rat", "car"], expected: false }
    ],
    validationCases: [
      { input: ["a", "ab"], expected: false },
      { input: ["ab", "a"], expected: false },
      { input: ["awesome", "someawe"], expected: true },
      { input: ["listen", "silent"], expected: true }
    ]
  },
  {
    id: "fibonacci-number",
    title: "Fibonacci Number",
    difficulty: "Easy",
    category: "Math",
    description: "The <b>Fibonacci numbers</b>, commonly denoted <code>F(n)</code> form a sequence, called the <b>Fibonacci sequence</b>, such that each number is the sum of the two preceding ones, starting from <code>0</code> and <code>1</code>. That is:<br><br><code>F(0) = 0, F(1) = 1</code><br><code>F(n) = F(n - 1) + F(n - 2)</code>, for <code>n > 1</code>.<br><br>Given <code>n</code>, calculate <code>F(n)</code>.",
    constraints: [
      "0 <= n <= 30"
    ],
    examples: [
      {
        input: "n = 2",
        output: "1",
        explanation: "F(2) = F(1) + F(0) = 1 + 0 = 1."
      },
      {
        input: "n = 3",
        output: "2",
        explanation: "F(3) = F(2) + F(1) = 1 + 1 = 2."
      }
    ],
    starterCode: {
      javascript: `function fib(n) {
    // Write your code here
    
}`,
      python: `def fib(n):
    # Write your code here
    pass`
    },
    functionName: "fib",
    paramNames: ["n"],
    testCases: [
      { input: [2], expected: 1 },
      { input: [3], expected: 2 },
      { input: [4], expected: 3 },
      { input: [9], expected: 34 }
    ],
    validationCases: [
      { input: [0], expected: 0 },
      { input: [1], expected: 1 },
      { input: [15], expected: 610 },
      { input: [25], expected: 75025 }
    ]
  }
];
