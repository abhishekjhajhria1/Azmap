/**
 * Web development paths.
 *
 * The *ordering* here is a fact about the ecosystem — you cannot usefully learn
 * React before JavaScript, or Kubernetes before containers — and the community
 * has converged on it for good reasons. The prose is ours: every `why` is
 * written for this product, in this voice, to answer the one question a
 * checklist never does, which is *why is this step here at all*.
 */

import type { RoadmapDef } from "../types.js";

export const frontend: RoadmapDef = {
  id: "frontend",
  title: "Front-End Developer",
  goal: "Build and ship interfaces people actually use",
  blurb: "From a blank HTML file to a component-driven app you can deploy.",
  kind: "skill",
  units: [
    { id: "foundations", title: "The page itself", note: "What the browser is given." },
    { id: "language", title: "The language", note: "Making it move." },
    { id: "framework", title: "Working at scale", note: "What teams reach for once pages get big." },
    { id: "ship", title: "Getting it out", note: "The half of the job nobody teaches." },
  ],
  path: [
    { id: "html", unit: "foundations", title: "HTML", why: "Structure first. Everything else — styling, scripting, screen readers — attaches to it.", domain: "web", progress: "known" },
    { id: "css", unit: "foundations", title: "CSS", why: "The rules that turn structure into something worth looking at.", domain: "css", needs: ["html"], progress: "known" },
    { id: "boxmodel", unit: "foundations", title: "The box model", why: "Why your element is 8px wider than you asked for. Learn it once, stop guessing.", domain: "css", needs: ["css"] },
    { id: "flexgrid", unit: "foundations", title: "Flexbox & Grid", why: "How real layouts are composed. Almost every alignment bug is a gap here.", domain: "css", needs: ["boxmodel"] },
    { id: "responsive", unit: "foundations", title: "Responsive design", why: "One layout, every screen. Not a phase of the work — a property of it.", domain: "css", needs: ["flexgrid"] },
    { id: "js", unit: "language", title: "JavaScript", why: "The only language the browser runs. Everything else compiles down to it.", domain: "js", needs: ["html"], progress: "in_progress" },
    { id: "dom", unit: "language", title: "The DOM", why: "The page as an object you can read and change. This is what a framework is hiding.", domain: "js", needs: ["js"] },
    { id: "events", unit: "language", title: "Events", why: "How a click becomes code. Bubbling explains most 'why did that fire' mysteries.", domain: "js", needs: ["dom"] },
    { id: "es6", unit: "language", title: "Modern JS", why: "Destructuring, modules, arrow functions — the syntax every tutorial assumes.", domain: "js", needs: ["js"] },
    { id: "async", unit: "language", title: "Async & promises", why: "Nothing waits in a browser. Understanding why is the difference between working and lucky.", domain: "js", needs: ["es6"] },
    { id: "fetch", unit: "language", title: "Fetch & APIs", why: "Real apps show real data. This is where the network enters your mental model.", domain: "js", needs: ["async"] },
    { id: "npm", unit: "framework", title: "npm & modules", why: "How code you didn't write gets into code you did.", domain: "tooling", needs: ["es6"] },
    { id: "git", unit: "framework", title: "Git", why: "Undo for your whole project, and the only way more than one person can work.", domain: "tooling" },
    { id: "react", unit: "framework", title: "React", why: "UI as functions of data. The mental shift is the point, not the syntax.", domain: "react", needs: ["es6", "events"] },
    { id: "state", unit: "framework", title: "State", why: "Where truth lives and who's allowed to change it. Most UI bugs are really this.", domain: "react", needs: ["react"] },
    { id: "effects", unit: "framework", title: "Effects & data fetching", why: "Talking to the outside world without tearing the UI. Easy to get subtly wrong.", domain: "react", needs: ["state", "fetch"] },
    { id: "router", unit: "framework", title: "Routing", why: "Turning one page into an app with a back button that works.", domain: "react", needs: ["react"] },
    { id: "a11y", unit: "ship", title: "Accessibility", why: "Keyboard, contrast, labels. Building for everyone rather than for people like you.", domain: "web", needs: ["dom"] },
    { id: "perf", unit: "ship", title: "Performance", why: "Users leave slow pages. Learn to measure before you optimise.", domain: "tooling", needs: ["react"] },
    { id: "build", unit: "ship", title: "Build & deploy", why: "Work nobody can visit isn't finished.", domain: "tooling", needs: ["npm", "react"] },
  ],
  branches: [
    { id: "typescript", title: "TypeScript", why: "Types catch the mistakes your users would have found for you.", domain: "js", needs: ["es6"] },
    { id: "tailwind", title: "Tailwind CSS", why: "Styling without leaving the markup, once you already know CSS.", domain: "css", needs: ["flexgrid"] },
    { id: "testing", title: "Component testing", why: "Confidence that a change didn't quietly break something else.", domain: "tooling", needs: ["react"] },
    { id: "ssr", title: "Server rendering", why: "Faster first paint and pages search engines can read.", domain: "react", needs: ["router"] },
    { id: "animation", title: "Animation", why: "Motion that explains what changed instead of decorating it.", domain: "css", needs: ["responsive"] },
  ],
};

export const backend: RoadmapDef = {
  id: "backend",
  title: "Back-End Developer",
  goal: "Build services that hold data and stay up",
  blurb: "Requests, storage, and the failure modes nobody warns you about.",
  kind: "skill",
  units: [
    { id: "basics", title: "Groundwork", note: "A language and how the internet actually moves." },
    { id: "data", title: "Data", note: "Where state lives." },
    { id: "api", title: "Interfaces", note: "How the outside world asks for things." },
    { id: "prod", title: "Production", note: "What changes when real people depend on it." },
  ],
  path: [
    { id: "lang", unit: "basics", title: "A server language", why: "Pick one — Node, Python, Go — and get fluent. The concepts transfer; the syntax doesn't matter yet.", domain: "tech" },
    { id: "terminal", unit: "basics", title: "The terminal", why: "Servers have no windows. This is the interface.", domain: "tooling" },
    { id: "git2", unit: "basics", title: "Git", why: "Branching, merging, reading history to find when something broke.", domain: "tooling", needs: ["terminal"] },
    { id: "http", unit: "basics", title: "HTTP", why: "Methods, status codes, headers. Most 'weird bug' reports are HTTP misunderstandings.", domain: "web" },
    { id: "sqlbasics", unit: "data", title: "SQL", why: "The language of data that has to be right. Still the highest-leverage thing to learn here.", domain: "tech", needs: ["lang"] },
    { id: "modelling", unit: "data", title: "Data modelling", why: "Schema decisions outlive your code. Getting them wrong is the expensive kind of wrong.", domain: "tech", needs: ["sqlbasics"] },
    { id: "indexes", unit: "data", title: "Indexes & queries", why: "Why the same query is instant on your laptop and dead in production.", domain: "tech", needs: ["modelling"] },
    { id: "transactions", unit: "data", title: "Transactions", why: "How two things happen together or not at all. The idea behind every money bug.", domain: "tech", needs: ["modelling"] },
    { id: "rest", unit: "api", title: "REST APIs", why: "The default shape of a service, and the conventions that make it predictable.", domain: "web", needs: ["http", "lang"] },
    { id: "validation", unit: "api", title: "Validation", why: "Never trust input. Every boundary is a place to be strict.", domain: "web", needs: ["rest"] },
    { id: "auth", unit: "api", title: "Auth", why: "Sessions, tokens, hashing. The area where a small mistake is a large incident.", domain: "tech", needs: ["rest", "transactions"] },
    { id: "caching", unit: "prod", title: "Caching", why: "The cheapest speed there is, and a fine way to serve stale data forever.", domain: "tech", needs: ["indexes"] },
    { id: "queues", unit: "prod", title: "Queues & jobs", why: "Work that shouldn't happen inside a request. Email, exports, anything slow.", domain: "tech", needs: ["rest"] },
    { id: "logging", unit: "prod", title: "Logging & metrics", why: "You cannot fix what you cannot see. Do this before you need it.", domain: "tech", needs: ["rest"] },
    { id: "testingbe", unit: "prod", title: "Testing", why: "The thing that lets you change code you no longer remember writing.", domain: "tooling", needs: ["validation"] },
    { id: "deployment", unit: "prod", title: "Deployment", why: "From your machine to a machine strangers can reach.", domain: "tooling", needs: ["logging"] },
  ],
  branches: [
    { id: "nosql", title: "NoSQL", why: "When the shape of your data genuinely isn't tabular.", domain: "tech", needs: ["modelling"] },
    { id: "graphql", title: "GraphQL", why: "Letting clients ask for exactly what they need — and the costs of that.", domain: "web", needs: ["rest"] },
    { id: "websockets", title: "WebSockets", why: "When the server needs to speak first.", domain: "web", needs: ["http"] },
    { id: "ratelimit", title: "Rate limiting", why: "Staying up when someone points a script at you.", domain: "tech", needs: ["caching"] },
  ],
};

export const devops: RoadmapDef = {
  id: "devops",
  title: "DevOps & Infrastructure",
  goal: "Run software reliably, and know when it isn't",
  blurb: "The path from 'works on my machine' to 'works at 3am unattended'.",
  kind: "skill",
  units: [
    { id: "os", title: "The machine", note: "What you're actually deploying onto." },
    { id: "package", title: "Packaging", note: "Making software portable." },
    { id: "automate", title: "Automation", note: "Doing it the same way every time." },
    { id: "observe", title: "Knowing", note: "Reliability is mostly information." },
  ],
  path: [
    { id: "linux", unit: "os", title: "Linux", why: "Almost everything runs on it. Processes, permissions, the filesystem.", domain: "tech" },
    { id: "shell", unit: "os", title: "Shell scripting", why: "Automating the ten commands you keep typing.", domain: "tooling", needs: ["linux"] },
    { id: "networking", unit: "os", title: "Networking", why: "DNS, ports, TLS. 'It can't connect' is almost always one of these three.", domain: "tech", needs: ["linux"] },
    { id: "containers", unit: "package", title: "Containers", why: "Shipping the environment with the code. The idea that ended most deploy arguments.", domain: "tech", needs: ["linux"] },
    { id: "compose", unit: "package", title: "Multi-container apps", why: "An app is rarely one process. Running the whole thing locally.", domain: "tech", needs: ["containers"] },
    { id: "registry", unit: "package", title: "Registries & images", why: "Where builds live, and why image size is a real cost.", domain: "tech", needs: ["containers"] },
    { id: "ci", unit: "automate", title: "CI", why: "Tests that run whether or not anyone remembers to run them.", domain: "tooling", needs: ["shell"] },
    { id: "cd", unit: "automate", title: "CD", why: "Deploying often, in small pieces, so each one is boring.", domain: "tooling", needs: ["ci", "registry"] },
    { id: "iac", unit: "automate", title: "Infrastructure as code", why: "Servers you can recreate from a file instead of from memory.", domain: "tech", needs: ["networking"] },
    { id: "orchestration", unit: "automate", title: "Orchestration", why: "Many containers, many machines, one description of what should be running.", domain: "tech", needs: ["compose", "iac"] },
    { id: "monitoring", unit: "observe", title: "Monitoring", why: "Metrics and dashboards: the difference between knowing and hoping.", domain: "tech", needs: ["cd"] },
    { id: "alerting", unit: "observe", title: "Alerting", why: "Waking the right person for the right reason, and nobody otherwise.", domain: "tech", needs: ["monitoring"] },
    { id: "backups", unit: "observe", title: "Backups & recovery", why: "A backup you have never restored is a rumour.", domain: "tech", needs: ["iac"] },
    { id: "secrets", unit: "observe", title: "Secrets", why: "Credentials out of the repo, out of the logs, and rotatable.", domain: "tech", needs: ["cd"] },
  ],
  branches: [
    { id: "k8s", title: "Kubernetes", why: "The industry default for orchestration — and a lot of complexity to earn.", domain: "tech", needs: ["orchestration"] },
    { id: "tracing", title: "Distributed tracing", why: "Following one request across many services.", domain: "tech", needs: ["monitoring"] },
    { id: "chaos", title: "Failure testing", why: "Breaking it on purpose, on a Tuesday, instead of by accident on a Sunday.", domain: "tech", needs: ["alerting"] },
  ],
};

export const systemDesign: RoadmapDef = {
  id: "system-design",
  title: "System Design",
  goal: "Reason about systems too big to hold in your head",
  blurb: "The trade-offs behind every architecture diagram, in the order they start to matter.",
  kind: "skill",
  units: [
    { id: "primitives", title: "Primitives", note: "The parts everything is assembled from." },
    { id: "scale", title: "Scaling", note: "What breaks first, and what you do about it." },
    { id: "hard", title: "The hard parts", note: "Where distributed systems stop being intuitive." },
  ],
  path: [
    { id: "latency", unit: "primitives", title: "Latency numbers", why: "Memory, disk, network, across an ocean. Knowing the orders of magnitude settles most arguments.", domain: "theory" },
    { id: "storage", unit: "primitives", title: "Storage engines", why: "How a database actually writes to disk, and why that shapes what it's good at.", domain: "theory", needs: ["latency"] },
    { id: "cachingsd", unit: "primitives", title: "Caching strategies", why: "Read-through, write-through, invalidation. Cheap wins with expensive failure modes.", domain: "theory", needs: ["latency"] },
    { id: "loadbalance", unit: "scale", title: "Load balancing", why: "Spreading work, and what happens to the requests in flight when a box dies.", domain: "theory", needs: ["latency"] },
    { id: "replication", unit: "scale", title: "Replication", why: "More copies means more reads and more ways to disagree.", domain: "theory", needs: ["storage"] },
    { id: "sharding", unit: "scale", title: "Sharding", why: "Splitting data that no longer fits, and picking a key you won't regret.", domain: "theory", needs: ["replication"] },
    { id: "queuessd", unit: "scale", title: "Async & queues", why: "Decoupling producers from consumers so a spike becomes a backlog, not an outage.", domain: "theory", needs: ["loadbalance"] },
    { id: "cap", unit: "hard", title: "Consistency models", why: "Strong, eventual, causal. Most 'it showed the old value' bugs are a choice made here.", domain: "theory", needs: ["replication"] },
    { id: "idempotency", unit: "hard", title: "Idempotency & retries", why: "Networks deliver twice. Designing for that is cheaper than detecting it.", domain: "theory", needs: ["queuessd"] },
    { id: "backpressure", unit: "hard", title: "Backpressure", why: "Refusing work you can't do beats collapsing while accepting all of it.", domain: "theory", needs: ["queuessd"] },
    { id: "failure", unit: "hard", title: "Failure & degradation", why: "Deciding in advance which features die first, while you're calm.", domain: "theory", needs: ["backpressure", "cap"] },
  ],
  branches: [
    { id: "consensus", title: "Consensus", why: "How several machines agree on one answer. The foundation under leader election.", domain: "theory", needs: ["cap"] },
    { id: "eventsourcing", title: "Event sourcing", why: "Storing what happened rather than what is. Powerful, and hard to walk back.", domain: "theory", needs: ["idempotency"] },
    { id: "multiregion", title: "Multi-region", why: "Serving users a continent away, and the consistency bill that comes with it.", domain: "theory", needs: ["sharding"] },
  ],
};
