import type { Scheme } from "@/lib/schemeseva-types";

export interface FetchSchemeDetailsInput {
    schemes: Scheme[];
    schemeId: string;
}

export const fetchSchemeDetailsTool = {
    name: "fetchSchemeDetails",
    description:
        "Fetch one already-retrieved scheme record by id without duplicating catalog business logic.",
    async execute(input: FetchSchemeDetailsInput): Promise<Scheme | null> {
        return input.schemes.find((scheme) => scheme.id === input.schemeId) ?? null;
    },
};
