export const CHALLENGE = "How might we make local bookstores feel essential again?";
export type MuseRequest = { projectId: string; challenge?: string; technique: "Photo sparks" | "Role play" | "Worst idea"; role?: string; stimulus: string };
export type MuseResponse = { ideas: string[] };
