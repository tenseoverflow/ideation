export const CHALLENGE = "How might we make local bookstores feel essential again?";
export type MuseRequest = { projectId: string; challenge?: string; technique: "Photo sparks" | "Role play"; role?: string; stimulus?: string; thoughts: string[] };
export type MuseResponse = { ideas: string[] };
