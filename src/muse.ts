export const CHALLENGE = "How might we make local bookstores feel essential again?";
export type MuseRequest = { projectId: string; imageUrl?: string; challenge?: string; technique: "Photo sparks" | "Role play" | "Worst idea"; role?: string; stimulus: string; thoughts?: string[] };
export type MuseResponse = { ideas: string[] };

export type Photo = { id: string; url: string; alt: string; credit: string; profileUrl: string; pageUrl: string };
