export type MatchInput = {
  skills: string[]
  experienceYears: number
  preferredLocation?: string
  preferredMode?: string
  jobSkills: string[]
  minExperience: number
  location?: string
  mode?: string
}

export type MatchResult = {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  reasons: string[]
}

const normalize = (value: string) => value.toLowerCase().trim()

export function calculateMatch(input: MatchInput): MatchResult {
  const candidateSkills = new Set(input.skills.map(normalize))
  const required = input.jobSkills.map(normalize)
  const matchedSkills = required.filter((skill) => candidateSkills.has(skill))
  const missingSkills = required.filter((skill) => !candidateSkills.has(skill))

  const skillScore = required.length ? (matchedSkills.length / required.length) * 60 : 60
  const experienceScore = input.experienceYears >= input.minExperience ? 20 : Math.max(0, 20 - (input.minExperience - input.experienceYears) * 5)
  const locationScore = !input.preferredLocation || !input.location || normalize(input.location).includes(normalize(input.preferredLocation)) || normalize(input.preferredLocation).includes(normalize(input.location)) ? 10 : 4
  const modeScore = !input.preferredMode || !input.mode || normalize(input.preferredMode) === normalize(input.mode) ? 10 : 3
  const score = Math.min(99, Math.round(skillScore + experienceScore + locationScore + modeScore))

  const reasons = [
    `${matchedSkills.length} of ${required.length} listed skills match`,
    input.experienceYears >= input.minExperience ? 'Experience meets the role requirement' : 'Experience is slightly below the role requirement',
    locationScore >= 10 ? 'Location preference aligns' : 'Location preference differs',
    modeScore >= 10 ? 'Work mode aligns' : 'Work mode differs',
  ]

  return { score, matchedSkills, missingSkills, reasons }
}
