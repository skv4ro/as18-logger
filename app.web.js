import Database from "better-sqlite3"
import express from "express"
import mssql from "mssql"
import path from "path"
import { WEB as CONFIG_WEB, SQL_CONFIG, OPC_ALARMY_SQL, OPC as CONFIG_OPC, OPC_DATA_DIELU_SQL, LOGGER_CONFIG, OPC_KONTROLA_PALETKY, OPC_DUMMY_DIELY, OPC_AUDIT_TRAIL } from "./config.js"
import { fileURLToPath } from "url"
import { formatToISODateString } from "./util.js"

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const readSQLite = (start, end, db) => {
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    const sqlStr = `
        SELECT id, level, pid, hostname, msg,
            strftime('%Y-%m-%d %H:%M:%S', time) AS time
        FROM logs
        WHERE time >= ? 
        AND time <= ?
        ORDER BY id DESC;`
    const stmt = db.prepare(sqlStr)
    const res = stmt.all([formatToISODateString(start), formatToISODateString(end)])
    db.close()
    return res
}

const readLogs = (start, end) => {
    const db = new Database(LOGGER_CONFIG.sqlitePath)
    return readSQLite(start, end, db)
}


const readAlarms= async (start, end) => {
    const pool = await mssql.connect(SQL_CONFIG)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    const sqlReq = pool.request()
    sqlReq.input("start", formatToISODateString(start))
    sqlReq.input("end", formatToISODateString(end))
    const res = await sqlReq.query(`
        SELECT alarm_text_0,
            COUNT(*) AS active_alarms,
            FORMAT(MAX(sys_time), 'yyyy-MM-dd HH:mm:ss') AS last_sys_time
        FROM ${OPC_ALARMY_SQL.tableName}
        WHERE sys_time >= @start
        AND sys_time <= @end
        AND State = 1
        GROUP BY alarm_text_0
        ORDER BY active_alarms DESC;
        `)
    pool.close()
    return res
}

const readAlarmData = async (start, end, alarmText) => {
    const pool = await mssql.connect(SQL_CONFIG)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    const sqlReq = pool.request()
    sqlReq.input("start", formatToISODateString(start))
    sqlReq.input("end", formatToISODateString(end))
    sqlReq.input("alarm_text", alarmText)
    const res = await sqlReq.query(`
        SELECT id, state,
            FORMAT(sys_time, 'yyyy-MM-dd HH:mm:ss') AS sys_time,
            FORMAT(time_stamp, 'yyyy-MM-dd HH:mm:ss') AS time_stamp
        FROM ${OPC_ALARMY_SQL.tableName}
        WHERE sys_time >= @start
        AND sys_time <= @end
        AND alarm_text_0 = @alarm_text
        ORDER BY id DESC;
        `)
    pool.close()
    return res
}

const readTableData = async (tableName, start, end) => {
    const pool = await mssql.connect(CONFIG_OPC.sqlConfig)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    const sqlReq = pool.request()
    sqlReq.input("start", formatToISODateString(start))
    sqlReq.input("end", formatToISODateString(end))
    const res = await sqlReq.query(`
        SELECT *
        FROM ${tableName}
        WHERE sys_time >= @start
        AND sys_time <= @end
        ORDER BY id DESC;
    `)
    pool.close()
    return res
}

const makeCsv = recordset => {
    const separator = ";"
    const columns = Object.keys(recordset[0])
    const heades = columns.join(separator)
    const data = [heades]
    for (const result of recordset) {
        const lineData = []
        for (const column of columns) {
            const value = result[column]
            const finalValue = value instanceof Date ? formatToISODateString(value) : value
            lineData.push(finalValue)
        }
        data.push(lineData.join(separator))
    }
    return data.join("\n")
}

app.use(express.static("public"))
app.use(express.json())

app.get("/api/:route", async (req, res) => {
    const route = req.params.route
    const start = req.query.start ? new Date(req.query.start) : new Date()
    const end = req.query.end ? new Date(req.query.end) : new Date()
    try {
        if (route === "logs") {
            const rows = readLogs(start, end)
            res.send(rows)
            return
        }

        if (route === "alarms") {
            const sqlRes = await readAlarms(start, end)
            res.send(sqlRes.recordset)
            return
        }
        if (route === "alarm-list") {
            const sqlRes = await readTableData(OPC_ALARMY_SQL.tableName, start, end)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "alarm") {
            const alarmText = req.query.alarm_text
            const sqlRes = await readAlarmData(start, end, alarmText)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "kontrola-paletky") {
            const sqlRes = await readTableData(OPC_KONTROLA_PALETKY.tableName, start, end)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "data-dielu") {
            const sqlRes = await readTableData(OPC_DATA_DIELU_SQL.tableName, start, end)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "dummy_diely") {
            const sqlRes = await readTableData(OPC_DUMMY_DIELY.tableName, start, end)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "audit-trail") {
            const sqlRes = await readTableData(OPC_AUDIT_TRAIL.tableName, start, end)
            res.send(sqlRes.recordset)
            return
        }

        if (route === "download-csv") {
            const sqlRes = await readTableData(OPC_DATA_DIELU_SQL.tableName, start, end)
            const csv = makeCsv(sqlRes.recordset)
            res.send(csv)
            return
        }
    } catch (err) {
        console.error(err)
        res.send(["server error"])
    }
})

app.get("/:page", (req, res) => {
    const page = req.params.page
    res.sendFile(path.join(__dirname, 'public', `${page}.html`))
})

app.listen(CONFIG_WEB.port)