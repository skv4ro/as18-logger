import build from "pino-abstract-transport";
import Database from "better-sqlite3";
import { formatToISODateString } from "./util.js";

export default async function (options = { dbPath }) {
    const { dbPath } = options
    const db = new Database(dbPath)
    const stmp = db.prepare(`
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY,
        level INTEGER,
        time DATETIME,
        pid INTEGER,
        hostname TEXT,
        msg TEXT
    );`)
    stmp.run()

    return build (
        async (source) => {
            for await (let log of source) {
                try {
                    const error = log.err ? JSON.stringify(log.err, null, 2).replace(/\\n/g, "\n") : ""
                    const sqlStr = "INSERT INTO logs (level, time, pid, hostname, msg) VALUES (?, ?, ?, ?, ?);"
                    const stmt2 = db.prepare(sqlStr)
                    stmt2.run([log.level, formatToISODateString(new Date(log.time)), log.pid, log.hostname, log.msg + error])
                } catch (e) {
                    console.error(e)
                }
            }
        }
    );
}