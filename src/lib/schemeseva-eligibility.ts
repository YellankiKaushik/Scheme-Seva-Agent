import type {
    CitizenProfile,
    EligibilityResult,
    Scheme,
} from "./schemeseva-types";

/**
 * Deterministic rule-based eligibility checker (Eligibility Agent core).
 * Hard-fail criteria exclude a scheme entirely. Missing soft data → medium.
 */
export function checkEligibility(
    scheme: Scheme,
    profile: CitizenProfile,
): EligibilityResult {
    const rules = scheme.eligibility ?? {};
    const reasons: string[] = [];
    const missing: string[] = [];
    let hardFail = false;

    const state = profile.state?.toLowerCase().trim();
    const occupation = profile.occupation?.toLowerCase().trim();
    const hasBPL = profile.hasBPL ?? profile.isBPL;
    const isDisabled = profile.isDisabled ?? profile.disability;

    // State scope — hard fail
    if (rules.states && rules.states.length > 0) {
        if (!state || !rules.states.map((s) => s.toLowerCase()).includes(state)) {
            hardFail = true;
        } else {
            reasons.push(`Available in your state (${profile.state}).`);
        }
    }

    // Age
    if (rules.minAge != null && profile.age != null && profile.age < rules.minAge) hardFail = true;
    if (rules.maxAge != null && profile.age != null && profile.age > rules.maxAge) hardFail = true;
    if (
        (rules.minAge != null || rules.maxAge != null) &&
        profile.age != null &&
        !hardFail
    ) {
        reasons.push(`Age ${profile.age} is within the eligible range.`);
    }

    // Gender
    if (rules.genders && rules.genders.length > 0) {
        if (!profile.gender || !rules.genders.includes(profile.gender)) hardFail = true;
        else reasons.push(`Scheme targets ${rules.genders.join("/")}.`);
    }

    // Category
    if (rules.categories && rules.categories.length > 0) {
        if (!profile.category) {
            missing.push("Caste/category certificate");
        } else if (!rules.categories.includes(profile.category)) {
            hardFail = true;
        } else {
            reasons.push(`Category ${profile.category.toUpperCase()} is eligible.`);
        }
    }

    // Income
    if (rules.maxAnnualIncome != null && profile.annualIncome != null) {
        if (profile.annualIncome > rules.maxAnnualIncome) hardFail = true;
        else
            reasons.push(
                `Annual income ₹${profile.annualIncome.toLocaleString("en-IN")} is within the ₹${rules.maxAnnualIncome.toLocaleString("en-IN")} limit.`,
            );
    } else if (rules.maxAnnualIncome != null && profile.annualIncome == null) {
        missing.push("Income certificate");
    }

    // Occupation
    if (rules.occupations && rules.occupations.length > 0) {
        if (!occupation) {
            missing.push("Occupation proof");
        } else {
            const match = rules.occupations.some(
                (o) => occupation.includes(o.toLowerCase()) || o.toLowerCase().includes(occupation),
            );
            if (!match) hardFail = true;
            else reasons.push(`Matches occupation category (${rules.occupations.join(", ")}).`);
        }
    }

    // Aadhaar / bank / BPL / disability / landholding
    if (rules.requiresAadhaar && profile.hasAadhaar === false) missing.push("Aadhaar");
    if (rules.requiresBankAccount && profile.hasBankAccount === false)
        missing.push("Bank account in applicant's name");
    if (rules.requiresBPL && hasBPL === false) hardFail = true;
    if (rules.requiresBPL && hasBPL == null) missing.push("BPL / SECC verification");
    if (rules.disability && !isDisabled) hardFail = true;
    if (
        rules.maxLandAcres != null &&
        profile.landAcres != null &&
        profile.landAcres > rules.maxLandAcres
    ) {
        hardFail = true;
    } else if (rules.maxLandAcres != null && profile.landAcres == null) {
        missing.push("Landholding proof");
    } else if (rules.maxLandAcres != null && profile.landAcres != null) {
        reasons.push(`Landholding ${profile.landAcres} acres is within the ${rules.maxLandAcres} acre limit.`);
    }

    if (hardFail) {
        return {
            schemeId: scheme.id,
            schemeName: scheme.schemeName,
            confidence: "none",
            reasons: [],
            missingDocuments: [],
            benefitAmount: scheme.benefitAmount,
            sourceUrl: scheme.sourceUrl,
            lastVerified: scheme.lastVerified,
        };
    }

    const confidence: "high" | "medium" = missing.length === 0 ? "high" : "medium";
    if (reasons.length === 0) {
        reasons.push("Your profile matches this scheme's broad eligibility.");
    }

    return {
        schemeId: scheme.id,
        schemeName: scheme.schemeName,
        confidence,
        reasons,
        missingDocuments: missing,
        benefitAmount: scheme.benefitAmount,
        sourceUrl: scheme.sourceUrl,
        lastVerified: scheme.lastVerified,
    };
}

/**
 * Discovery Agent (semantic-ish): score every scheme against the profile using
 * keyword + attribute overlap. Returns top N candidate schemes.
 */
export function discoverCandidates(schemes: Scheme[], profile: CitizenProfile, topN = 20): Scheme[] {
    const profText = [
        profile.occupation,
        profile.state,
        profile.category,
        profile.gender,
        profile.notes,
        (profile.isDisabled ?? profile.disability) ? "disability pwd divyang" : "",
        profile.isWidow ? "widow" : "",
        profile.isMinority ? "minority" : "",
        profile.landAcres ? "farmer land" : "",
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const scored = schemes.map((s) => {
        let score = 0;
        for (const kw of s.keywords) {
            if (profText.includes(kw.toLowerCase())) score += 2;
        }
        // Slight boost for matching state scope
        if (
            s.stateScope === "central" ||
            (profile.state && s.stateScope === profile.state.toLowerCase())
        ) {
            score += 1;
        }
        if (profile.occupation && s.eligibility.occupations) {
            const occ = profile.occupation.toLowerCase();
            if (s.eligibility.occupations.some((o) => occ.includes(o.toLowerCase()))) score += 3;
        }
        return { scheme: s, score };
    });

    return scored
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map((x) => x.scheme);
}
