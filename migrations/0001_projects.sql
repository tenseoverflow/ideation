CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, challenge TEXT NOT NULL, updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sessions (projectId TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, data TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO projects(id,name,challenge) VALUES ('bookstore','Community bookstore','How might we make local bookstores feel essential again?');
INSERT INTO sessions(projectId) VALUES ('bookstore');
