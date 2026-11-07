/**
 * Skill Configuration for Resume & Job Matcher
 * 
 * Central maintainable configuration defining technical skills, categories,
 * canonical display names, and alias pattern matching rules.
 * 
 * Designed to prevent false-positive subword matches (e.g. Java inside JavaScript,
 * C inside CSS, Go inside Google) while handling case-insensitivity and aliases.
 */

const SKILLS_DATABASE = [
  // ==========================================================================
  // 1. Programming Languages
  // ==========================================================================
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Programming Languages',
    // Matches JavaScript, JS, ECMAScript
    patterns: [
      /\bjavascript\b/i,
      /\bjs\b/i,
      /\becmascript\b/i
    ]
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'Programming Languages',
    patterns: [
      /\btypescript\b/i,
      /\bts\b/i
    ]
  },
  {
    id: 'python',
    name: 'Python',
    category: 'Programming Languages',
    patterns: [
      /\bpython\b/i,
      /\bpython3\b/i,
      /\bpy\b/i
    ]
  },
  {
    id: 'java',
    name: 'Java',
    category: 'Programming Languages',
    // Critical: negative lookahead ensures 'Java' does not match 'JavaScript'
    patterns: [
      /\bjava\b(?!script)/i,
      /\bcore\s+java\b/i,
      /\bjava\s*(8|11|17|21)\b/i
    ]
  },
  {
    id: 'cpp',
    name: 'C++',
    category: 'Programming Languages',
    patterns: [
      /(?:^|[^\w])c\+\+(?:$|[^\w])/i,
      /\bcpp\b/i,
      /\bc\s+plus\s+plus\b/i
    ]
  },
  {
    id: 'c',
    name: 'C',
    category: 'Programming Languages',
    // Carefully match C language without matching standalone letters or 'CSS'
    patterns: [
      /\bc\s+programming\b/i,
      /\bc\s+language\b/i,
      /\bansi\s+c\b/i,
      /(?:^|[^\w])c\/(?:c\+\+|cpp)(?:$|[^\w])/i,
      /(?:^|[^\w])(?:c\+\+|cpp)\/c(?:$|[^\w])/i
    ]
  },
  {
    id: 'csharp',
    name: 'C#',
    category: 'Programming Languages',
    patterns: [
      /(?:^|[^\w])c#(?:$|[^\w])/i,
      /\bcsharp\b/i,
      /\bc\s+sharp\b/i
    ]
  },
  {
    id: 'golang',
    name: 'Go',
    category: 'Programming Languages',
    // Use golang or 'go language' / 'go programming' to avoid false positives with English verb 'go'
    patterns: [
      /\bgolang\b/i,
      /\bgo\s+language\b/i,
      /\bgo\s+programming\b/i,
      /\bgo\s+developer\b/i
    ]
  },
  {
    id: 'rust',
    name: 'Rust',
    category: 'Programming Languages',
    // Strictly whole word to prevent 'trust' or 'frustrated'
    patterns: [
      /\brust\b/i,
      /\brustlang\b/i
    ]
  },
  {
    id: 'php',
    name: 'PHP',
    category: 'Programming Languages',
    patterns: [
      /\bphp\b/i,
      /\bphp8\b/i,
      /\bphp7\b/i
    ]
  },
  {
    id: 'ruby',
    name: 'Ruby',
    category: 'Programming Languages',
    patterns: [
      /\bruby\b/i,
      /\bruby\s+on\s+rails\b/i
    ]
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    category: 'Programming Languages',
    patterns: [
      /\bkotlin\b/i
    ]
  },
  {
    id: 'swift',
    name: 'Swift',
    category: 'Programming Languages',
    patterns: [
      /\bswift\b/i
    ]
  },

  // ==========================================================================
  // 2. Web & Frameworks
  // ==========================================================================
  {
    id: 'react',
    name: 'React',
    category: 'Web Development',
    patterns: [
      /\breact\b/i,
      /\breact\.?js\b/i,
      /\breactjs\b/i
    ]
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'Web Development',
    patterns: [
      /\bnext\.?js\b/i,
      /\bnextjs\b/i
    ]
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    category: 'Web Development',
    patterns: [
      /\bnode\.?js\b/i,
      /\bnodejs\b/i,
      /\bnode\b/i
    ]
  },
  {
    id: 'expressjs',
    name: 'Express.js',
    category: 'Web Development',
    patterns: [
      /\bexpress\.?js\b/i,
      /\bexpressjs\b/i,
      /\bexpress\b/i
    ]
  },
  {
    id: 'html',
    name: 'HTML',
    category: 'Web Development',
    patterns: [
      /\bhtml\b/i,
      /\bhtml5\b/i
    ]
  },
  {
    id: 'css',
    name: 'CSS',
    category: 'Web Development',
    patterns: [
      /\bcss\b/i,
      /\bcss3\b/i,
      /\bcascading\s+style\s+sheets\b/i
    ]
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    category: 'Web Development',
    patterns: [
      /\btailwind\b/i,
      /\btailwindcss\b/i,
      /\btailwind\s+css\b/i
    ]
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap',
    category: 'Web Development',
    patterns: [
      /\bbootstrap\b/i,
      /\bbootstrap\s*[45]\b/i
    ]
  },
  {
    id: 'vuejs',
    name: 'Vue.js',
    category: 'Web Development',
    patterns: [
      /\bvue\.?js\b/i,
      /\bvuejs\b/i,
      /\bvue\b/i
    ]
  },
  {
    id: 'angular',
    name: 'Angular',
    category: 'Web Development',
    patterns: [
      /\bangular\b/i,
      /\bangular\.?js\b/i,
      /\bangularjs\b/i
    ]
  },
  {
    id: 'django',
    name: 'Django',
    category: 'Web Development',
    patterns: [
      /\bdjango\b/i
    ]
  },
  {
    id: 'flask',
    name: 'Flask',
    category: 'Web Development',
    patterns: [
      /\bflask\b/i
    ]
  },
  {
    id: 'springboot',
    name: 'Spring Boot',
    category: 'Web Development',
    patterns: [
      /\bspring\s+boot\b/i,
      /\bspringboot\b/i,
      /\bspring\s+framework\b/i
    ]
  },
  {
    id: 'restapi',
    name: 'REST APIs',
    category: 'Web Development',
    patterns: [
      /\brest\s+apis?\b/i,
      /\brestful\s+apis?\b/i,
      /\brestful\b/i,
      /\brest\s+web\s+services\b/i
    ]
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    category: 'Web Development',
    patterns: [
      /\bgraphql\b/i
    ]
  },
  {
    id: 'redux',
    name: 'Redux',
    category: 'Web Development',
    patterns: [
      /\bredux\b/i,
      /\bredux\s+toolkit\b/i,
      /\brtk\b/i
    ]
  },

  // ==========================================================================
  // 3. Databases & Storage
  // ==========================================================================
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'Databases',
    patterns: [
      /\bmysql\b/i
    ]
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'Databases',
    patterns: [
      /\bpostgresql\b/i,
      /\bpostgres\b/i,
      /\bpgsql\b/i
    ]
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'Databases',
    patterns: [
      /\bmongodb\b/i,
      /\bmongo\b/i
    ]
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'Databases',
    patterns: [
      /\bsql\b/i,
      /\bstructured\s+query\s+language\b/i,
      /\brelational\s+databases?\b/i
    ]
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'Databases',
    patterns: [
      /\bredis\b/i
    ]
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    category: 'Databases',
    patterns: [
      /\bsqlite\b/i,
      /\bsqlite3\b/i
    ]
  },
  {
    id: 'oracle',
    name: 'Oracle Database',
    category: 'Databases',
    patterns: [
      /\boracle\s+database\b/i,
      /\boracle\s+db\b/i,
      /\boracle\s+sql\b/i
    ]
  },
  {
    id: 'firebase',
    name: 'Firebase',
    category: 'Databases',
    patterns: [
      /\bfirebase\b/i,
      /\bfirestore\b/i
    ]
  },

  // ==========================================================================
  // 4. Core Computer Science Fundamentals
  // ==========================================================================
  {
    id: 'dsa',
    name: 'DSA (Data Structures & Algorithms)',
    category: 'Core Computer Science',
    patterns: [
      /\bdsa\b/i,
      /\bdata\s+structures?\s+(?:and|&)\s+algorithms?\b/i,
      /\bdata\s+structures?\b/i,
      /\balgorithms?\b/i
    ]
  },
  {
    id: 'oop',
    name: 'OOP (Object-Oriented Programming)',
    category: 'Core Computer Science',
    patterns: [
      /\boop\b/i,
      /\boops\b/i,
      /\bobject[\s-]oriented\s+programming\b/i,
      /\bobject[\s-]oriented\s+concepts\b/i
    ]
  },
  {
    id: 'dbms',
    name: 'DBMS',
    category: 'Core Computer Science',
    patterns: [
      /\bdbms\b/i,
      /\bdatabase\s+management\s+systems?\b/i
    ]
  },
  {
    id: 'os',
    name: 'Operating Systems',
    category: 'Core Computer Science',
    patterns: [
      /\boperating\s+systems?\b/i,
      /\bos\s+fundamentals\b/i,
      /\bos\s+concepts\b/i
    ]
  },
  {
    id: 'cn',
    name: 'Computer Networks',
    category: 'Core Computer Science',
    patterns: [
      /\bcomputer\s+networks?\b/i,
      /\bcomputer\s+networking\b/i,
      /\bnetworking\s+fundamentals\b/i,
      /\btcp\/ip\b/i
    ]
  },
  {
    id: 'systemdesign',
    name: 'System Design',
    category: 'Core Computer Science',
    patterns: [
      /\bsystem\s+design\b/i,
      /\bhigh[\s-]level\s+design\b/i,
      /\blow[\s-]level\s+design\b/i,
      /\bhld\b/i,
      /\blld\b/i,
      /\bdistributed\s+systems\b/i
    ]
  },

  // ==========================================================================
  // 5. Tools, DevOps & Cloud Platforms
  // ==========================================================================
  {
    id: 'git',
    name: 'Git',
    category: 'Tools & Cloud',
    patterns: [
      /\bgit\b(?!hub|lab)/i,
      /\bgit\s+version\s+control\b/i
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Tools & Cloud',
    patterns: [
      /\bgithub\b/i
    ]
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'Tools & Cloud',
    patterns: [
      /\bdocker\b/i,
      /\bdockerize\b/i,
      /\bdockerized\b/i,
      /\bcontainerization\b/i
    ]
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'Tools & Cloud',
    patterns: [
      /\bkubernetes\b/i,
      /\bk8s\b/i
    ]
  },
  {
    id: 'aws',
    name: 'AWS',
    category: 'Tools & Cloud',
    patterns: [
      /\baws\b/i,
      /\bamazon\s+web\s+services\b/i,
      /\bamazon\s+aws\b/i
    ]
  },
  {
    id: 'azure',
    name: 'Azure',
    category: 'Tools & Cloud',
    patterns: [
      /\bazure\b/i,
      /\bmicrosoft\s+azure\b/i
    ]
  },
  {
    id: 'gcp',
    name: 'GCP (Google Cloud)',
    category: 'Tools & Cloud',
    patterns: [
      /\bgcp\b/i,
      /\bgoogle\s+cloud\b/i,
      /\bgoogle\s+cloud\s+platform\b/i
    ]
  },
  {
    id: 'linux',
    name: 'Linux',
    category: 'Tools & Cloud',
    patterns: [
      /\blinux\b/i,
      /\bubuntu\b/i,
      /\bbash\b/i,
      /\bshell\s+scripting\b/i
    ]
  },
  {
    id: 'cicd',
    name: 'CI/CD',
    category: 'Tools & Cloud',
    patterns: [
      /\bci\/cd\b/i,
      /\bcontinuous\s+integration\b/i,
      /\bcontinuous\s+deployment\b/i,
      /\bjenkins\b/i
    ]
  },
  {
    id: 'postman',
    name: 'Postman',
    category: 'Tools & Cloud',
    patterns: [
      /\bpostman\b/i
    ]
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'Tools & Cloud',
    patterns: [
      /\bjira\b/i
    ]
  }
];

module.exports = {
  SKILLS_DATABASE
};
