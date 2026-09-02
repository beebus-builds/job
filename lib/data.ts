export type Job = { id:string; title:string; company:string; logo:string; location:string; mode:string; type:string; salary:string; posted:string; match:number; tags:string[]; description:string; skills:string[]; stage?:string };
export const jobs: Job[] = [
{id:'j1',title:'Frontend Engineer',company:'Linear',logo:'L',location:'Remote',mode:'Remote',type:'Full-time',salary:'$120k–$165k',posted:'2h ago',match:96,tags:['React','TypeScript','Next.js'],description:'Build polished product experiences for a fast-moving product team.',skills:['React','TypeScript','Next.js','CSS']},
{id:'j2',title:'Full Stack Developer',company:'Vercel',logo:'V',location:'Remote · US/EU',mode:'Remote',type:'Full-time',salary:'$130k–$180k',posted:'5h ago',match:92,tags:['Next.js','Node.js','Postgres'],description:'Work across the stack on the platform powering the web.',skills:['Next.js','Node.js','PostgreSQL','React']},
{id:'j3',title:'Product Engineer',company:'Notion',logo:'N',location:'New York / Remote',mode:'Hybrid',type:'Full-time',salary:'$125k–$170k',posted:'1d ago',match:88,tags:['React','Product','AI'],description:'Turn ambiguous product problems into simple, delightful software.',skills:['React','TypeScript','Product Design','AI']},
{id:'j4',title:'React Developer',company:'Raycast',logo:'R',location:'Remote',mode:'Remote',type:'Contract',salary:'$70–$95/hr',posted:'1d ago',match:84,tags:['React','MacOS','APIs'],description:'Create delightful interfaces for a developer-focused product.',skills:['React','TypeScript','API Design']}
];
export const applications = [
{job:'Frontend Engineer',company:'Linear',date:'Sep 2',status:'Interview',match:96},
{job:'Full Stack Developer',company:'Vercel',date:'Sep 1',status:'Applied',match:92},
{job:'Product Engineer',company:'Notion',date:'Aug 30',status:'Screening',match:88},
];
export const candidates = [
{name:'Maya Chen',role:'Senior Frontend Engineer',match:97,location:'Singapore',skills:['React','TypeScript','Next.js'],status:'Shortlist',experience:'6 yrs'},
{name:'Arjun Mehta',role:'Full Stack Engineer',match:94,location:'Berlin, Germany',skills:['Next.js','Node.js','Postgres'],status:'Review',experience:'5 yrs'},
{name:'Sofia Rossi',role:'Product Engineer',match:91,location:'Milan, Italy',skills:['React','AI','TypeScript'],status:'Screen',experience:'4 yrs'},
{name:'Noah Williams',role:'Frontend Developer',match:86,location:'London, UK',skills:['React','CSS','JavaScript'],status:'New',experience:'3 yrs'},
];
