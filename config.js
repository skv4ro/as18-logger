import { MessageSecurityMode, SecurityPolicy, AttributeIds } from "node-opcua"
import mssql from "mssql" 
import fs from "fs"
import jsonDiff from "json-diff"
import { 
    createLogger, 
    dtToISO,
    formatToISODateString,
    insertSQL, 
    extractText,
    extractColumnNames
} from "./util.js"

// >>> SQL CONFIG
export const SQL_CONFIG = {
    user: "as18_logger",
    password: "avsys1788",
    database: "as18_logger_db",
    server: "localhost",
    options: {
        trustServerCertificate: true,
    }
}

// >>> LOGGER CONFIG
export const LOGGER_CONFIG = {
    level: "debug", // trace, debug, info, warn, error, fatal
    sqlitePath: "logs/log.db" // sqlite databaza s datami logov systemu
}
export const logger = createLogger(LOGGER_CONFIG.sqlitePath, LOGGER_CONFIG.level)

// >>> ALARMY CONFIG
export const OPC_ALARMY_SQL = {
    tableName: "alarmy",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "state", datatype: mssql.Int },
        { name: "alarm_text_0", datatype: mssql.NVarChar(256) },
        { name: "zariadenie", datatype: mssql.NVarChar(32) },
        { name: "time_stamp", datatype: mssql.DateTime2 }
    ]
}

const alarmyColumns = extractColumnNames(OPC_ALARMY_SQL.columns)

const opcAlarmyOnData = (res) => {
    const value = res.value.value
    const now = new Date()
    const values = []
    values.push(formatToISODateString(now))
    values.push(value.state)
    values.push(value.alarmText[0])
    values.push(extractText(value.alarmText[0]))
    values.push(formatToISODateString(value.timeStamp))
    return insertSQL(OPC_ALARMY_SQL.tableName, alarmyColumns, values)
}

// >>> DATA DIELU CONFIG
const lisStructCols = prefix => {
    const cols = [
        { name: "status_lisovanie_od_lisu", datatype: mssql.Int },
        { name: "rezim_lisovania", datatype: mssql.Int },
        { name: "nastavena_pozicia_lis_min", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_pozicia_lis_max", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_poz_ochrany_nastroja_koniec", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_max_poloha_dorazu", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_lisovacia_sila_min", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_lisovacia_sila", datatype: mssql.Decimal(10, 3) },
        { name: "nastavena_lisovacia_sila_max", datatype: mssql.Decimal(10, 3) },
        { name: "nastaveny_cas_vydrze_na_tlaku", datatype: mssql.Int },
        { name: "dosiahnuta_sila_lisovacia", datatype: mssql.Decimal(10, 3) },
        { name: "dosiahnuta_poz_lisovania", datatype: mssql.Decimal(10, 3) },
        { name: "dosiahnuta_sila_na_zaciatku_lis", datatype: mssql.Decimal(10, 3) },
        { name: "dosiahnuta_sila_na_zaciatku_lis_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "dosiahnuta_max_sila_pocas_lis", datatype: mssql.Decimal(10, 3), },
        { name: "max_sila_dosiahnuta_v_pozicii", datatype: mssql.Decimal(10, 3) },
        { name: "dosiahnuta_sila_pocas_ochrany_nastroja", datatype: mssql.Decimal(10, 3) },
        { name: "datetime_zalisovania", datatype: mssql.DateTime2, },
        { name: "status_nastroj_global", datatype: mssql.Int },
        { name: "status_nastroja_kont_skrutky_lis2", datatype: mssql.Int },
        { name: "datetime_vlozenia_bracketu", datatype: mssql.DateTime2 },
        { name: "datetime_vlozenia_gm_adapter", datatype: mssql.DateTime2 },
    ]
    
    return cols.map(col => { return { name: prefix + "_" + col.name, datatype: col.datatype } })
}

const lisStructVals = value => {
    return [
        value.lis.statusLisovanieOdLisu,
        value.lis.rezimLisovania,
        value.lis.nastavenaPoziciaLisovacia_min,
        value.lis.nastavenaPoziciaLisovaciaMax,
        value.lis.nastavenaPoziciaOchranyNastrojaKoniec,
        value.lis.nastavenaMaximalnaPolohaDorazu,
        value.lis.nastavenaLisovaciaSila_min,
        value.lis.nastavenaLisovaciaSila,
        value.lis.nastavenaLisovaciaSila_max,
        value.lis.nastavenyCasVydrzeNaTlaku,
        value.lis.dosiahnutaSilaLisovacia,
        value.lis.dosiahnutaPoziciaLisovacia,
        value.lis.dosiahnutaSilaNaZaciatkuLisovania,
        value.lis.dosiahnutaSilaNaZaciatkuLisovaniaPozicia,
        value.lis.dosiahnutaMaxSilaPocasLisovania,
        value.lis.maxSilaDosiahnutaVpozicii,
        value.lis.dosiahnutaSilaPocasOchranyNastroja,
        dtToISO(value.lis.dateTimeZalisovania),
        value.nastroj.statusNastrojaGlobal,
        value.nastroj.statusNastrojaKontrSkrutkyLis2,
        value.nastroj.dateTimeVlozeniaBracketu,
        dtToISO(value.nastroj.dateTimeVlozeniaBracketu),
        dtToISO(value.nastroj.dateTimeVlozeniaGM_adapter),
    ]
}

export const OPC_DATA_DIELU_SQL = {
    tableName: "data_dielu",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "elapsed", datatype: mssql.Int },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "id_dielu", datatype: mssql.NVarChar(40) },
        { name: "receptura", datatype: mssql.NVarChar(40) },
        { name: "status_dielu", datatype: mssql.Int },
        { name: "doplnkovy_status", datatype: mssql.Int },
        { name: "status_pre_robot", datatype: mssql.Int },
        ...(lisStructCols)("lis1"),
        ...(lisStructCols)("lis2"),
        { name: "laser_status", datatype: mssql.Int },
        { name: "laser_datetime", datatype: mssql.DateTime2 },
        { name: "kont_dmc_status", datatype: mssql.Int },
        { name: "kont_dmc_precitany_dmc", datatype: mssql.NVarChar(40) },
        { name: "kont_dmc_zhoda", datatype: mssql.Int },
        { name: "kont_dmc_datetime", datatype: mssql.DateTime2 },
    ]
}

const dataDielyColumns = extractColumnNames(OPC_DATA_DIELU_SQL.columns)

const opcDataDieluOnData = (res, env) => {
    const elapsed = env.elapsed
    const value = res.value.value
    const now = new Date()
    const formattedNow = formatToISODateString(now)
    const idDielu = value.ID_dielu
    const values = []
    
    values.push(elapsed)
    values.push(formattedNow)
    values.push(idDielu)
    values.push(value.receptura)
    values.push(value.statusDielu)
    values.push(value.doplnkovyStatusDielu)
    values.push(value.statusPreRobot)
    values.push(...lisStructVals(value.lis1))
    values.push(...lisStructVals(value.lis2))
    values.push(value.laser.status)
    values.push(dtToISO(value.laser.dateTime))
    values.push(value.kontrolaDMC.status)
    values.push(value.kontrolaDMC.precitanyDMC)
    values.push(value.kontrolaDMC.zhoda)
    values.push(dtToISO(value.kontrolaDMC.dateTime))

    return insertSQL(OPC_DATA_DIELU_SQL.tableName, dataDielyColumns, values)
}

export const OPC_AUDIT_TRAIL = {
    tableName: "audit_trail",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "source", datatype: mssql.NVarChar(40) },
        { name: "var_name", datatype: mssql.NVarChar(40) },
        { name: "old_value", datatype: mssql.NVarChar(20) },
        { name: "new_value", datatype:mssql.NVarChar(20) },
        { name: "person_name", datatype: mssql.NVarChar(40) },
        { name: "person_id", datatype: mssql.NVarChar(20) },
        { name: "recipe_name", datatype: mssql.NVarChar(20) }
    ]
}

const extractChanges = (obj, parentKey = '') => {
    const changes = [];
  
    for (const key in obj) {
      const value = obj[key];
      const path = parentKey ? `${parentKey}.${key}` : key;
  
      if (
        typeof value === 'object' &&
        value !== null &&
        '__old' in value &&
        '__new' in value
      ) {
        changes.push({ path, old: value.__old, new: value.__new });
      } else if (typeof value === 'object' && value !== null) {
        changes.push(...extractChanges(value, path));
      }
    }
  
    return changes;
}

const cacheAuditTrail = {}
const auditTrailColumns = extractColumnNames(OPC_AUDIT_TRAIL.columns)

const processAuditTrail = async (res, env, dataFile, source) => {
    const newJson = res.value.value
    const now = new Date()
    let oldJson = cacheAuditTrail[source]
    try {
        if (oldJson === undefined) {
            const oldDataStr = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, "utf-8") : undefined
            oldJson = JSON.parse(oldDataStr)
        }
    } catch (e) { 
        logger.warn(`cannot parse plc json from file ${dataFile}`)
    }
    const newDataStr = JSON.stringify(newJson, null, 2)
    fs.writeFileSync(dataFile, newDataStr, "utf-8")
    if (oldJson === undefined) return
    
    const diff = jsonDiff.diff(oldJson, newJson)
    cacheAuditTrail[source] = newJson
    if (diff === undefined) return

    const changes = extractChanges(diff)
    logger.debug(`${changes.length} changes found in ${source}`)

    const userNameNode = { nodeId: 'ns=3;s="SQL_AuditTrail"."MenoNacitane_z_kluca"' }
    const userIdNode = { nodeId: 'ns=3;s="SQL_AuditTrail"."OsobneCislo"' }
    const recipeNameNode = { nodeId: 'ns=3;s="DataReceptura"."Nazov"' }
    const moreData = await env.session.read([userNameNode, userIdNode, recipeNameNode])
    const userName = moreData[0].value.value
    const userId = moreData[1].value.value
    const recipeName = moreData[2].value.value

    for (const change of changes) {
        const values = []
        values.push(formatToISODateString(now))
        values.push(source)
        values.push(change.path)
        values.push(change.old + '')
        values.push(change.new + '')
        values.push(userName + '')
        values.push(userId + '')
        values.push(recipeName + '')
        await insertSQL(OPC_AUDIT_TRAIL.tableName, auditTrailColumns, values)
    }
}

const opcAuditTrailPLC = (res, env) => {
    processAuditTrail(res, env, "data.receptury.plc.json", "receptury.plc")
}

const opcAuditTrailHMI = (res, env) => {
    processAuditTrail(res, env, "data.receptury.hmi.json", "receptury.hmi")
}

const opcAuditTrailVypinanieKontrolD_VST = (data, env) => {
    processAuditTrail(data.res, env, "data.vypinaniekontrol.d_vst.json", "vypinanie_kontrol.d_vst")
}

const opcAuditTrailVypinanieKontrolPoLis = (data, env) => {
    processAuditTrail(data.res, env, "data.vypinaniekontrol.po_lis.json", "vypinanie_kontrol.po_lis")
}

const opcAuditTrailVypinanieKontrolProfilomer = (data, env) => {
    processAuditTrail(data.res, env, "data.vypinaniekontrol.profilomer.json", "vypinanie_kontrol.profilomer")
}

const opcAuditTrailVypinanieKontrolDMCGrade = (data, env) => {
    processAuditTrail(data.res, env, "data.vypinaniekontrol.dmc_grade.json", "vypinanie_kontrol.dmc_grade")
}

// >>> OPC CONFIG
export const OPC = {
    appName: "avsys-opc-logger",
    resetDelay: 10000, // cas kolko ma aplikacia cakat na znovuspustenie pri chybe
    opcEndpointURL: "opc.tcp://10.101.1.10:4840",
    opcClientOptions: {
        applicationName: "avsys_opcua_logger",
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        endpointMustExist: false,
        keepSessionAlive: true,
        connectionStrategy: {
            maxRetry: -1, // kolkokrat ma skusat znovu sa pripojit ked dojde k odpojeniu, -1 je nekonecno
            initialDelay: 1000, // ako dlho ma cakat kym sa pokusi znovu pripojit po odpojeni
            maxDelay: 10000 // ako dlho ma pockat medzi jednodlivymi pokusmi o pripojenie
        }
    },
    sqlConfig: SQL_CONFIG,
    instances: [
        {
            paused: false, // vypnute/zapnute logovanie (true = vypnute)
            pollingTime: 1000, // ako casto ma kontrolovat ci su nove data v milisekundach
            stopOnError: false, // ci sa ma vypnut logovanie ked nastane error
            triggerValue: 1, // hodnota trigger tagu ked su nove data
            acknowledgeValue: 2, // hodnota trigger tagu, ktoru ma zapisat ked sa data spracuju
            name: "Alarmy", // nazov instancie (pre prehlad v logoch aplikacie)
            watchNodeId: 'ns=3;s="UlozeneAlarmy"."statusUloz"', // aky tag v plc ma sledovat ci su nove data 
            readNode: { nodeId: 'ns=3;s="UlozeneAlarmy"."PreSQL"."alarm"', attribudeId: AttributeIds.Value }, // aky tag/strukturu ma citat ked su nove data
            sql: OPC_ALARMY_SQL, // sql schema
            onData: opcAlarmyOnData // funkcia pre spracovanie ked su nove data
        },
        {
            name: "Data dielu",
            watchNodeId: 'ns=3;s="DataDielyStol"."StatusUlozenia"',
            readNode: { nodeId: 'ns=3;s="DataDielyStol"."Databaza"', attribudeId: AttributeIds.Value },
            sql: OPC_DATA_DIELU_SQL,
            onData: opcDataDieluOnData
        },
        // {
        //     name: "Audit Trail PLC",
        //     watchNodeId: 'ns=3;s="SQL_AuditTrail"."triggerZapisDatDoPlc"',
        //     readNode: { nodeId: 'ns=3;s="DataReceptura"."PrePLC"', attribudeId: AttributeIds.Value },
        //     onData: opcAuditTrailPLC,
        // },
        // {
        //     name: "Audit Trail HMI",
        //     watchNodeId: 'ns=3;s="SQL_AuditTrail"."triggerUlozenieHMIdat"',
        //     readNode: { nodeId: 'ns=3;s="DataReceptura"."HMI"', attribudeId: AttributeIds.Value },
        //     onData: opcAuditTrailHMI,
        // },
        // {
        //     name: "Audit Trail vypinanie kontrol D_VST",
        //     watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."D_VST_Vypinanie kontrol"',
        //     pollOnly: true,
        //     onPoll: opcAuditTrailVypinanieKontrolD_VST,
        // },
        // {
        //     name: "Audit Trail vypinanie kontrol po lisovani",
        //     watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."KontrolaPoLisovania"',
        //     pollOnly: true,
        //     onPoll: opcAuditTrailVypinanieKontrolPoLis,
        // },
        // {
        //     name: "Audit Trail vypinanie kontroly profilomer",
        //     watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."KontrolyProfilomer"',
        //     pollOnly: true,
        //     onPoll: opcAuditTrailVypinanieKontrolProfilomer,
        // },
        // {
        //     name: "Audit Trail vypinanie kontroly DMC_GRADE",
        //     watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."DMC_GRADE"',
        //     pollOnly: true,
        //     onPoll: opcAuditTrailVypinanieKontrolDMCGrade,
        // }
    ]
}

// >>> WEB CONFIG
export const WEB = {
    port: 3000
}