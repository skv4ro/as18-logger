import { SQL_CONFIG, OPC_ALARMY_SQL, OPC_DATA_DIELU_SQL, OPC_KONTROLA_PALETKY, OPC_DUMMY_DIELY, OPC_AUDIT_TRAIL } from "./config.js"
import mssql from "mssql"
import readline from "node:readline"
import chalk from "chalk"

const tables = [
    { name: OPC_ALARMY_SQL.tableName, sql: OPC_ALARMY_SQL },
    { name: OPC_DATA_DIELU_SQL.tableName, sql: OPC_DATA_DIELU_SQL },
    { name: OPC_KONTROLA_PALETKY.tableName, sql: OPC_KONTROLA_PALETKY },
    { name: OPC_DUMMY_DIELY.tableName, sql: OPC_DUMMY_DIELY },
    { name: OPC_AUDIT_TRAIL.tableName, sql: OPC_AUDIT_TRAIL }
]

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const resolveDataType = datatype => {
    if (datatype === mssql.Int) return "INT"
    if (datatype === mssql.DateTime) return "DATETIME"
    if (datatype === mssql.DateTime2) return "DATETIME2"
    if (datatype.type === mssql.NVarChar) return `NVARCHAR(${datatype.length})`
    if (datatype.type === mssql.Decimal) return `DECIMAL(${datatype.precision}, ${datatype.scale})`
    if (datatype === mssql.Bit) return "BIT"
    if (datatype === mssql.Real) return "REAL"
    if (datatype === mssql.Char) return "CHAR"
    return ""
}

const createTable = async (sqlConfig, tableName, columns) => {
    const req = new mssql.Request()
    const cols = columns.map(col => {
        return `${col.name} ${resolveDataType(col.datatype)} ${col.unique ? "UNIQUE" : ""} ${col.identity ? "IDENTITY(1,1)" : ""} ${col.primaryKey ? "PRIMARY KEY" : ""}`
    })
    const query = `CREATE TABLE ${tableName} (
        ${cols.join(",")}
        )`
    await req.query(query)
    console.log(chalk.greenBright(`Tabulka ${tableName} v databaze ${sqlConfig.database} bola vytvorena`))
}

const processUserInput = async userInput => {
    const tablesToCreate = []
    if (userInput.includes("-") && userInput.includes(",")) tablesToCreate.push("wtf")
    else if (userInput.includes("-")) {
        const indexes = userInput.split("-")
        if (indexes.length > 2) tablesToCreate.push("wtf")
        else {
            const low = parseInt(indexes[0])
            const high = parseInt(indexes[1])
            if (isNaN(low) || isNaN(high) || low > high) tablesToCreate.push("wtf")
            else {
                for (let index = low; index <= high; index++) {
                    tablesToCreate.push(index)
                }
            }
        } 
    } else if (userInput.includes(",")) {
        const indexes = userInput.split(",")
        for (const index of indexes) {
            tablesToCreate.push(parseInt(index))
        }
    } else {
        tablesToCreate.push(parseInt(userInput))
    }
    
    console.log(chalk.blue("Pripajam databazu ..."))
    const pool = await mssql.connect(SQL_CONFIG)
    console.log(chalk.blue("Databaza pripojena"))

    for (const index of tablesToCreate) {
        if (isNaN(index) || tables.length - 1 < index) {
            console.log(chalk.yellowBright("zle zadane cislo tabulky"))
            continue
        }
        const table = tables[index]
        console.log(chalk.white(`Vytvaram tabulku ${table.sql.tableName}`))
        try {
            
            await createTable(SQL_CONFIG, table.sql.tableName, table.sql.columns)
            
        } catch (e) {
            console.log(chalk.redBright(`Tabulku ${table.sql.tableName} sa nepodarilo vytvorit: ${e.message}`))
        }
    }

    console.log(chalk.blue("Odpajam databazu ..."))
    await pool.close()
    console.log(chalk.blue("Databaza odpojena"))
}

console.log("Dostupne tabulky:")
tables.forEach((table, i) => {
    console.log(`  ${chalk.cyanBright(i)}: ${table.name}`)
})
console.log()
rl.question("Vyberte cisla tabulkiek, ktore chcete vytvorit (napr: 3 alebo 1,3,5 alebo 3-6): ", userInput => {
    rl.close()
    processUserInput(userInput)
})