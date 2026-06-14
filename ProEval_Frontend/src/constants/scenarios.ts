export interface ScenarioMember {
  name: string;
  role: string;
  tech: string;
  func: string;
  mods: string;
}

export interface ScenarioPhase1 {
  title: string;
  domain: string;
  abstract: string;
  objectives: string;
  methodology: string;
  stack: string;
}

export interface ScenarioPhase2 {
  github: string;
  presentationUrl: string;
  notes: string;
  milestones: string[];
  risks: string[];
}

export interface ScenarioFinal {
  summary: string;
  contributions: string;
  demo: string;
  github: string;
}

export interface TestScenario {
  id: string;
  label: string;
  phase1: ScenarioPhase1;
  clarifications: string[];
  members: ScenarioMember[];
  phase2: ScenarioPhase2;
  final: ScenarioFinal;
}

export const TINY_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

export const TINY_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMzAwIDE0NF0vQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PnN0cmVhbQpCVAovRjEgMTIgVGYKNTAgMTAwIFRkCihQcm9FdmFsIFRlc3QgQXJ0aWZhY3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTMgMDAwMDAgbiAKMDAwMDAwMDEwNCAwMDAwMCBuIAowMDAwMDAwMTc5IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjk2CiUlRU9G";

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "streamtalk",
    label: "StreamTalk",
    phase1: {
      title: "StreamTalk: Real-Time Dynamic Discussion Platform",
      domain: "Full-Stack Web Development",
      abstract:
        "StreamTalk is a full-stack discussion platform built for real-time community and team collaboration. It combines a modern Next.js experience with managed chat infrastructure and secure identity so focused groups can create topic-based rooms, exchange messages instantly, and work with a polished, production-style communication flow.",
      objectives:
        "Real-Time Performance: achieve low-latency messaging and state sync.\nSecure Access: implement reliable authentication and protected chat access.\nScalable Organization: support dynamic topic-based rooms.\nRich Interactivity: include presence, message flow, and media-ready interaction.\nModern UX: deliver a responsive interface across devices.",
      methodology:
        "The application uses Next.js App Router for a hybrid rendering architecture, Stream.io for managed chat and presence, and Clerk for secure identity and session management. The build is organized around server-side auth middleware, reusable chat container components, and webhook-driven event handling for user lifecycle and room coordination.",
      stack:
        "Next.js\nReact\nTailwind CSS\nStream.io Chat SDK\nClerk\nVercel",
    },
    clarifications: [
      "The first beneficiaries are student cohorts, niche communities, and small product teams that need fast, organized conversations without the clutter of generic chat apps.",
      "This project is different because it combines managed real-time infrastructure, production-grade authentication, and a polished App Router architecture instead of a basic demo chat clone.",
      "The smallest useful MVP is one authenticated global room with live messaging, presence indicators, and a clean deployed experience.",
    ],
    members: [
      {
        name: "Rishabh Dubey",
        role: "Backend / Team Leader",
        tech: "Next.js API Routes, Clerk, Stream.io Server SDK",
        func: "Own token generation, server-side auth checks, webhook handling, and room permissions.",
        mods: "Auth middleware, Stream admin client, room orchestration",
      },
      {
        name: "Aditi Sharma",
        role: "Frontend Engineer",
        tech: "React, Tailwind CSS, Stream Chat React SDK",
        func: "Build the messaging UI, room navigation, message list, and responsive interaction states.",
        mods: "Chat container, message list, message composer",
      },
      {
        name: "Naman Verma",
        role: "Security & QA",
        tech: "Clerk, Next.js middleware, manual QA",
        func: "Validate auth flows, session security, and edge-case behavior around room access.",
        mods: "Auth testing checklist, protected route coverage, QA scripts",
      },
    ],
    phase2: {
      github: "https://github.com/RishabhDubeyCS/Steamtalk.git",
      presentationUrl: "https://docs.google.com/presentation/d/streamtalk-phase2",
      notes:
        "Successfully integrated Stream.io Chat SDK and Clerk authentication. The core real-time messaging engine and presence tracking are operational, the App Router structure is in place, and the team is finishing dynamic room creation and interface polish.",
      milestones: [
        "Integrated Clerk authentication",
        "Connected Stream.io chat engine",
        "Built initial messaging UI and presence states",
      ],
      risks: [
        "Edge cases around reconnection and room switching",
        "Final mobile responsiveness polish",
      ],
    },
    final: {
      summary:
        "StreamTalk delivers a production-style chat experience that feels more credible than a standard student clone because it combines managed real-time infrastructure, protected identity, and intentional room-based collaboration. The final build demonstrates strong system integration, front-end execution, and deployment readiness.",
      contributions:
        "Rishabh Dubey: Led backend architecture, auth integration, and webhook orchestration.\n\nAditi Sharma: Built the primary user experience including room navigation, message rendering, and responsive UI behavior.\n\nNaman Verma: Validated secure access flow, protected route handling, and end-to-end quality checks.",
      demo: "https://youtu.be/streamtalk-demo",
      github: "https://github.com/RishabhDubeyCS/Steamtalk.git",
    },
  },
  {
    id: "dns-security",
    label: "Decentralized DNS Security",
    phase1: {
      title: "Decentralized DNS Security Platform",
      domain: "Cybersecurity / Blockchain Infrastructure",
      abstract:
        "This project replaces vulnerable centralized DNS control points with a blockchain-backed security platform. DNS records are stored as verifiable blockchain entries, reducing the risk of tampering, hijacking, and single-point failure while improving user ownership and infrastructure transparency.",
      objectives:
        "Eliminate centralized DNS failure points.\nEnsure tamper-resistant record storage.\nAutomate domain lifecycle logic with smart contracts.\nImprove transparency and verifiability.\nGive users stronger control over digital identity.",
      methodology:
        "The system uses wallet-based authentication for secure user actions, a backend validation layer for request processing, Solidity smart contracts for domain logic, and a custom resolver layer that bridges blockchain-backed records with conventional DNS-style lookup workflows.",
      stack: "Ethereum\nSolidity\nDjango\nMetaMask\nPython\nNode.js",
    },
    clarifications: [
      "The first beneficiaries are institutions and organizations that cannot tolerate DNS hijacking or prolonged availability risks, especially in education, government, or enterprise settings.",
      "The project stands out because it is not just a website with blockchain branding; it changes the trust model of DNS management by moving record control and verification into decentralized infrastructure.",
      "The smallest MVP includes wallet login, smart-contract-backed record creation, and a resolver proof-of-concept that returns blockchain-backed domain data.",
    ],
    members: [
      {
        name: "Muskan Yadav",
        role: "System Architect / Leader",
        tech: "Django, MetaMask, Web3 tooling",
        func: "Coordinate platform design, backend request validation, and end-to-end integration.",
        mods: "Backend API, request validation layer, control flow",
      },
      {
        name: "Harsh Meena",
        role: "Blockchain Engineer",
        tech: "Solidity, Hardhat, Ethers",
        func: "Build smart contracts for domain ownership, lifecycle control, and verifiable state updates.",
        mods: "Registry contract, renewal logic, ownership transfer",
      },
      {
        name: "Pooja Saini",
        role: "Network / Resolver Engineer",
        tech: "Python, Node.js, DNS protocol",
        func: "Design the custom resolver bridge and validate how blockchain records are returned to clients.",
        mods: "Custom DNS resolver, lookup bridge, validation utility",
      },
    ],
    phase2: {
      github: "https://github.com/Muskann55/DNS-BLOCKCHAIN-",
      presentationUrl: "https://docs.google.com/presentation/d/dns-security-phase2",
      notes:
        "MetaMask integration is complete, the registry smart contract is deployed to a test network, and the team has a working proof of concept for registering and resolving blockchain-backed records through a custom resolver prototype.",
      milestones: [
        "Integrated MetaMask authentication",
        "Deployed registry smart contract to testnet",
        "Built initial resolver proof of concept",
      ],
      risks: [
        "Resolver reliability across more edge cases",
        "Explaining blockchain tradeoffs clearly to evaluators",
      ],
    },
    final: {
      summary:
        "The platform demonstrates a credible cybersecurity infrastructure concept by moving DNS trust away from centralized control. The final build is strongest as a systems-and-security project because it combines contract logic, resolver behavior, and a clear anti-hijacking security motivation.",
      contributions:
        "Muskan Yadav: Led integration, request validation, and overall platform design.\n\nHarsh Meena: Built the smart contracts and ownership logic for decentralized domain control.\n\nPooja Saini: Implemented resolver-side behavior and validated blockchain-backed DNS lookup flow.",
      demo: "https://youtu.be/dns-blockchain-demo",
      github: "https://github.com/Muskann55/DNS-BLOCKCHAIN-",
    },
  },
  {
    id: "phishing-detection",
    label: "AI Phishing Detection",
    phase1: {
      title: "AI Phishing Detection System",
      domain: "AI / Cybersecurity",
      abstract:
        "This project is an AI-assisted phishing defense tool that classifies suspicious emails, URLs, and fake websites in real time. It focuses on identifying social engineering signals and dangerous intent rather than depending only on static blacklists, giving smaller organizations a more adaptive protection layer.",
      objectives:
        "Detect suspicious patterns in emails and URLs.\nGenerate immediate threat alerts.\nUse NLP for intent-aware analysis.\nContinuously improve detection quality with learned patterns.",
      methodology:
        "Users submit messages, URLs, or email text into a web-based dashboard. The backend applies a classification and NLP pipeline, maps risk levels into human-readable outcomes, and stores structured alert data so admins can review patterns and update safety responses over time.",
      stack: "React\nPython\nDjango\nScikit-learn\nNLP tooling\nMySQL",
    },
    clarifications: [
      "The first beneficiaries are schools, small offices, and growing teams that are vulnerable to phishing but do not have full-time security teams or advanced filtering infrastructure.",
      "The project becomes more distinct by emphasizing intent-aware NLP analysis and explainable alert reasoning instead of simple blacklist-based filtering.",
      "The smallest MVP includes a dashboard for message input, one working classification pipeline, and real-time safe or dangerous output with clear explanation.",
    ],
    members: [
      {
        name: "Aniket Parihar",
        role: "ML / Backend Lead",
        tech: "Python, Django, Scikit-learn",
        func: "Own the classification pipeline, training logic, and API integration for alert generation.",
        mods: "Classification engine, dataset pipeline, backend inference API",
      },
      {
        name: "Harshit Prajapati",
        role: "Frontend Engineer",
        tech: "React, JavaScript, dashboard UX",
        func: "Build the scanning dashboard, alert views, and user-facing threat communication.",
        mods: "Input dashboard, threat alert panel, result interaction flow",
      },
      {
        name: "Ritika Jain",
        role: "Data & Security Analyst",
        tech: "Dataset curation, evaluation metrics, rule analysis",
        func: "Maintain phishing samples, evaluate model output, and document detection blind spots.",
        mods: "Dataset review, risk evaluation notes, validation matrix",
      },
    ],
    phase2: {
      github: "https://github.com/Muskann55/Ai-Phishing-Detection-System.git",
      presentationUrl: "https://docs.google.com/presentation/d/phishing-phase2",
      notes:
        "The team has trained initial intent-analysis models, exposed the backend inference API, and integrated the dashboard with real-time results. The remaining work is improving evaluation rigor and making the outputs more trustworthy and explainable.",
      milestones: [
        "Prepared phishing sample dataset",
        "Built backend classification endpoint",
        "Connected dashboard to live model output",
      ],
      risks: [
        "False positives affecting user trust",
        "Need for stronger evaluation metrics and explanation quality",
      ],
    },
    final: {
      summary:
        "The final system demonstrates a practical cybersecurity assistant that can flag risky communication patterns in real time. Its strongest value comes from combining explainable alerting with adaptive intent-aware analysis rather than relying only on hard-coded threat lists.",
      contributions:
        "Aniket Parihar: Built the ML pipeline, backend inference flow, and dataset-driven detection logic.\n\nHarshit Prajapati: Designed and implemented the user dashboard and alert interaction experience.\n\nRitika Jain: Evaluated model behavior, organized phishing samples, and documented detection quality and edge cases.",
      demo: "https://youtu.be/ai-phishing-demo",
      github: "https://github.com/Muskann55/Ai-Phishing-Detection-System.git",
    },
  },
];

export function getScenarioById(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find((scenario) => scenario.id === id);
}
