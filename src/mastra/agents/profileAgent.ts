// Mastra-style Profile Agent. Wraps the existing extractProfile server fn.
import { extractProfile } from "@/lib/schemeseva.functions";

export const profileAgent = {
    name: "ProfileAgent",
    description:
        "Extracts a Zod-validated CitizenProfile from free text. Required: state, age, gender, category, annualIncome, occupation, hasBPL, hasAadhaar, hasBankAccount. Asks one clarification if any critical field is missing.",
    async run(text: string) {
        return extractProfile({ data: { text } });
    },
};
