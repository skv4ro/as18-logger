import { MessageSecurityMode, SecurityPolicy, AttributeIds } from "node-opcua"
import mssql from "mssql" 
import fs from "fs"
import jsonDiff from "json-diff"
import { 
    createLogger, 
    decodeDT, 
    formatToISODateString, 
    insertSQL, 
    extractText,
    createDTwriteNode,
    createFloatWriteNode,
    createInt16WriteNode,
    createInt32WriteNode,
    createUInt16WriteNode,
    createByteWriteNode,
    createCharWriteNode,
    createStringWriteNode,
    createBooleanWriteNode,
    extractColumnNames
} from "./util.js"

// >>> SQL CONFIG
export const SQL_CONFIG = {
    user: "as15_logger",
    password: "avsys1788",
    database: "as15_logger_db",
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
export const OPC_DATA_DIELU_SQL = {
    tableName: "data_dielu",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "elapsed", datatype: mssql.Int },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "id_dielu", datatype: mssql.NVarChar(40) },
        { name: "diel_nalozeny_do_prip", datatype: mssql.Int },
        { name: "status_dielu", datatype: mssql.Int },
        { name: "doplnkovy_status", datatype: mssql.Int },
        { name: "cislo_paletky_dopr", datatype: mssql.Int },
        { name: "cislo_pozicie_stol", datatype: mssql.Int },
        { name: "cislo_zakazky", datatype: mssql.NVarChar(40) },
        { name: "cislo_dielu", datatype: mssql.NVarChar(40) },
        { name: "milnik_zakazka", datatype: mssql.NVarChar(40) },
        { name: "poradie", datatype: mssql.Int },
        { name: "housing_cislo_dielu", datatype: mssql.NVarChar(40) },
        { name: "housing_sarza", datatype: mssql.NVarChar(40) },
        { name: "housing_we_dokladu", datatype: mssql.NVarChar(40) },
        { name: "gumokov_cislo_dielu", datatype: mssql.NVarChar(40) },
        { name: "gumokov_sarza", datatype: mssql.NVarChar(40) },
        { name: "gumokov_milnik", datatype: mssql.NVarChar(40) },
        { name: "gumokov_vyr_zakazka", datatype: mssql.NVarChar(40) },
        { name: "platnicka_cislo_dielu", datatype: mssql.NVarChar(40) },
        { name: "platnicka_sarza", datatype: mssql.NVarChar(40) },
        { name: "platnicka_we_dokladu", datatype: mssql.NVarChar(40) },
        { name: "skrutky_cislo_dielu", datatype: mssql.NVarChar(40) },
        { name: "skrutky_sarza", datatype: mssql.NVarChar(40) },
        { name: "skrutky_we_dokladu", datatype: mssql.NVarChar(40) },
        // kontrola na dopravniku
        { name: "kont_dopr_cislo_palety", datatype: mssql.Decimal(10, 3) },
        { name: "kont_dopr_a_prestrek_hodnota", datatype: mssql.Int },
        { name: "kont_dopr_a_orientacia_hodnota", datatype: mssql.Int },
        { name: "kont_dopr_a_orientacia_string", datatype: mssql.NVarChar(40) },
        { name: "kont_dopr_b_prestrek_hodnota", datatype: mssql.Int },
        { name: "kont_dopr_b_orientacia_hodnota", datatype: mssql.Int },
        { name: "kont_dopr_b_orientacia_string", datatype: mssql.NVarChar(40) },
        { name: "kont_dopr_status_prestrek", datatype: mssql.Int },
        { name: "kont_dopr_status_orientacia", datatype: mssql.Int },
        { name: "kont_dopr_datetime", datatype: mssql.DateTime2 },
        // lis vkladanie
        { name: "lis_vklad_status", datatype: mssql.Int },
        { name: "lis_vklad_sila", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_max_sila", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_min_sila", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_max_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_min_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "lis_vklad_datetime", datatype: mssql.DateTime2 },
        // kontrola po lisovani
        { name: "kont_lis_status", datatype: mssql.Int },
        { name: "kont_lis_rovnost_zalis", datatype: mssql.Int },
        { name: "kont_lis_meranie_vysky", datatype: mssql.Int },
        { name: "kont_lis_pos_adjust", datatype: mssql.Decimal(10, 3)},
        { name: "kont_lis_rovnost_zalis_1", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_2", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_3", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_4", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_meranie_vysky_hod", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_datetime", datatype: mssql.DateTime2 },
        // nakladanie platnicky
        { name: "nakl_plat_status", datatype: mssql.Int },
        { name: "nakl_plat_hodnota_zdvih", datatype: mssql.Int },
        { name: "nakl_plat_datetime", datatype: mssql.DateTime2 },
        // rolovacia pozicia
        { name: "rol_poz_status", datatype: mssql.Int },
        { name: "rol_poz_sila", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_hodnota_pritl_piest", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_otacky_vretena", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_posuv_pri_rolovani", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_sila_max", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_sila_min", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_pozicia_max", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_pozicia_min", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_interval_mazania", datatype: mssql.Int },
        { name: "rol_poz_cas_mazania", datatype: mssql.Int },
        { name: "rol_poz_aktualny_cyklus", datatype: mssql.Int },
        { name: "rol_poz_mazanie_vykonane", datatype: mssql.Bit },
        { name: "rol_poz_datetime", datatype: mssql.DateTime2 },
        // cistenie po rolovani
        { name: "cist_rol_status", datatype: mssql.Int },
        { name: "cist_rol_datetime", datatype: mssql.DateTime2 },
        // kontrola po rolovani
        { name: "kont_rol_status", datatype: mssql.Int },
        { name: "kont_rol_gm_orientacia_plocha", datatype: mssql.Int },
        { name: "kont_rol_gm_krivost_min", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_gm_krivost_max", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_gm_krivost_priem", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_priem_vonkajsi", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_priem_vnutorny", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vada_plocha_pocet_vad", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_celk_velkost", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_celk_sirka", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_pocet_vad", datatype: mssql.Int },
        { name: "kont_rol_vada_plocha_celk_plocha_vad", datatype: mssql.Int },
        { name: "kont_rol_vyska_platnicky", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vyska_zarolovania", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vyska_gm", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_status_gm_orientacia", datatype: mssql.Int },
        { name: "kont_rol_status_gm_krivost", datatype: mssql.Int },
        { name: "kont_rol_status_priem_vonkajsi", datatype: mssql.Int },
        { name: "kont_rol_status_priem_vnutorny", datatype: mssql.Int },
        { name: "kont_rol_status_vada_kruz", datatype: mssql.Int },
        { name: "kont_rol_status_vada_plocha_prask", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_platnicky", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_zarolovania", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_gm", datatype: mssql.Int },
        { name: "kont_rol_datetime", datatype: mssql.DateTime2 },
        // nakladanie skrutiek
        { name: "nakl_skrut_status", datatype: mssql.Int },
        { name: "nakl_skrut_cas_nalozenia_skrutiek", datatype: mssql.DateTime2 },
        // lisovanie skrutiek
        { name: "lis_skrut_status", datatype: mssql.Int },
        { name: "lis_skrut_datetime", datatype: mssql.DateTime2 },
        { name: "lis_skrut_sila", datatype: mssql.Decimal(10, 3) },
        { name: "lis_skrut_pozicia", datatype: mssql.Decimal(10, 3) },
        { name: "lis_skrut_tlak_hydraulika", datatype: mssql.Decimal(10, 3) },
        { name: "lis_skrut_tlak_vzduchu", datatype: mssql.Decimal(10, 3) },
        // kontrola po lisovani skrutiek
        { name: "kont_skrut_status", datatype: mssql.Int },
        { name: "kont_skrut_datetime", datatype: mssql.DateTime2 },
        // odoberacia pozicia
        { name: "odober_poz_status", datatype: mssql.Int },
        { name: "odober_poz_datetime", datatype: mssql.DateTime2 },
        // laser pozicia
        { name: "laser_poz_status", datatype: mssql.Int },
        { name: "laser_poz_datetime", datatype: mssql.DateTime2 },
        // kontrola kodu
        { name: "kont_kodu_status", datatype: mssql.Int },
        { name: "kont_kodu_nacitany_kod", datatype: mssql.NVarChar(40) },
        { name: "kont_kodu_datetime", datatype: mssql.DateTime2 },
        { name: "kont_kodu_grade", datatype: mssql.Char }
    ]
}

export const OPC_DUMMY_DIELY = {
    tableName: "dummy_diely",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "elapsed", datatype: mssql.Int },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "diel_nalozeny_do_prip", datatype: mssql.Int },
        { name: "status_dielu", datatype: mssql.Int },
        { name: "kont_lis_status", datatype: mssql.Int },
        { name: "kont_lis_rovnost_zalis", datatype: mssql.Int },
        { name: "kont_lis_meranie_vysky", datatype: mssql.Int },
        { name: "kont_lis_pos_adjust", datatype: mssql.Decimal(10, 3)},
        { name: "kont_lis_rovnost_zalis_1", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_2", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_3", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_rovnost_zalis_4", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_meranie_vysky_hod", datatype: mssql.Decimal(10, 3) },
        { name: "kont_lis_datetime", datatype: mssql.DateTime2 },
        { name: "rol_poz_status", datatype: mssql.Int },
        { name: "rol_poz_hodnota_pritl_piest", datatype: mssql.Decimal(10, 3) },
        { name: "rol_poz_datetime", datatype: mssql.DateTime2 },
        { name: "kont_rol_status", datatype: mssql.Int },
        { name: "kont_rol_gm_orientacia_plocha", datatype: mssql.Int },
        { name: "kont_rol_gm_krivost_min", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_gm_krivost_max", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_gm_krivost_priem", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_priem_vonkajsi", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_priem_vnutorny", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vada_plocha_pocet_vad", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_celk_velkost", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_celk_sirka", datatype: mssql.Int },
        { name: "kont_rol_vada_kruz_pocet_vad", datatype: mssql.Int },
        { name: "kont_rol_vada_plocha_celk_plocha_vad", datatype: mssql.Int },
        { name: "kont_rol_vyska_platnicky", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vyska_zarolovania", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_vyska_gm", datatype: mssql.Decimal(10, 3) },
        { name: "kont_rol_status_gm_orientacia", datatype: mssql.Int },
        { name: "kont_rol_status_gm_krivost", datatype: mssql.Int },
        { name: "kont_rol_status_priem_vonkajsi", datatype: mssql.Int },
        { name: "kont_rol_status_priem_vnutorny", datatype: mssql.Int },
        { name: "kont_rol_status_vada_kruz", datatype: mssql.Int },
        { name: "kont_rol_status_vada_plocha_prask", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_platnicky", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_zarolovania", datatype: mssql.Int },
        { name: "kont_rol_status_vyska_gm", datatype: mssql.Int },
        { name: "kont_rol_datetime", datatype: mssql.DateTime2 },
        { name: "kont_kodu_status", datatype: mssql.Int },
        { name: "kont_kodu_nacitany_kod", datatype: mssql.NVarChar(40) },
        { name: "kont_kodu_datetime", datatype: mssql.DateTime2 },
        { name: "kont_kodu_grade", datatype: mssql.Char }
    ]
} 

const dummyDieluColumns = extractColumnNames(OPC_DUMMY_DIELY.columns)

const opcDummyDielyOnData = (res, env) => {
    const elapsed = env.elapsed
    const value = res.value.value
    const now = new Date()
    const formattedNow = formatToISODateString(now)
    const values = []

    values.push(elapsed)
    values.push(formattedNow)
    values.push(value.dielNalozenyDoPripravku)
    values.push(value.statusDielu)
    // kontrola po lisovani
    values.push(value["2_kontrolaPoLisovani"].status)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovania)
    values.push(value["2_kontrolaPoLisovani"].meranieVysky)
    values.push(value["2_kontrolaPoLisovani"].positionAdjustment)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota1)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota2)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota3)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota4)
    values.push(value["2_kontrolaPoLisovani"].meranieVyskyHodnota)
    values.push(formatToISODateString(decodeDT(value["2_kontrolaPoLisovani"].dateTime))) 
    // rolovacia pozicia
    values.push(value["4_rolovaciaPoz"].status)
    values.push(value["4_rolovaciaPoz"].hodnotaSnimacaPritlacnyPiest)
    values.push(formatToISODateString(decodeDT(value["4_rolovaciaPoz"].dateTime)))
    // kontrola po rolovani
    values.push(value["6_kontrolaPoRolovani"].status)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_orientacia_plocha)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.gm_krivost_MIN)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_krivost_MAX)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_krivost_priemer)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.priemer_vonkajsi)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.priemer_vnutorny)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_pocet_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_celkova_velkost)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_celkova_sirka)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_ploche_pocet_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_ploche_celkova_plocha_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_platnicky)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_zarolovania)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_GM)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.GM_orientacia)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.GM_krivost)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.priemer_vonkajsi)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.priemer_vnutorny)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vada_na_kruznici)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy["vada_na_ploche(praskliny)"])
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_platnicky)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_zarolovania)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_GM)
    values.push(formatToISODateString(decodeDT(value["6_kontrolaPoRolovani"].dateTime)))
    // kontrola kodu
    values.push(value["12_kontrolaKodu"].status)
    values.push(value["12_kontrolaKodu"].nacitanyKod)
    values.push(formatToISODateString(decodeDT(value["12_kontrolaKodu"].dateTime)))
    values.push(String.fromCharCode(value["12_kontrolaKodu"].grade))

    return insertSQL(OPC_DUMMY_DIELY.tableName, dummyDieluColumns, values)
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
    values.push(value.dielNalozenyDoPripravku)
    values.push(value.statusDielu)
    values.push(value.doplnkovyStatusDielu)
    values.push(value.cisloPaletkyDopravnik)
    values.push(value.cisloPozicieStol)
    values.push(value.zakazka.cisloZakazky)
    values.push(value.zakazka.cisloDielu)
    values.push(value.zakazka.milnik)
    values.push(value.zakazka.poradie)
    values.push(value.zakazka.housing.cisloDielu)
    values.push(value.zakazka.housing.sarza)
    values.push(value.zakazka.housing.wEdokladu)
    values.push(value.zakazka.gumoKov.cisloDielu)
    values.push(value.zakazka.gumoKov.sarza)
    values.push(value.zakazka.gumoKov.milnik)
    values.push(value.zakazka.gumoKov.vyrobnaZakazka)
    values.push(value.zakazka.platnicka.cisloDielu)
    values.push(value.zakazka.platnicka.sarza)
    values.push(value.zakazka.platnicka.wEdokladu)
    values.push(value.zakazka.skrutky.cisloDielu),
    values.push(value.zakazka.skrutky.sarza),
    values.push(value.zakazka.skrutky.wEdokladu),
    // kontrola na dopravniku
    values.push(value["0_kontrolaNaDopravniku"].cisloPalety)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_a.prestrek_hodnota)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_a.orientacia_hodnota)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_a.orientacia_string)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_b.prestrek_hodnota)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_b.orientacia_hodnota)
    values.push(value["0_kontrolaNaDopravniku"].namerane_hodnoty_strana_b.orientacia_string)
    values.push(value["0_kontrolaNaDopravniku"].statusy_kontrol.prestrek)
    values.push(value["0_kontrolaNaDopravniku"].statusy_kontrol.orientacia)
    values.push(formatToISODateString(decodeDT(value["0_kontrolaNaDopravniku"].dateTime)))
    // lis vkladanie
    values.push(value["1_lisovaciaVkladaciaPoz"].status)
    values.push(value["1_lisovaciaVkladaciaPoz"].sila)
    values.push(value["1_lisovaciaVkladaciaPoz"].pozicia)
    values.push(value["1_lisovaciaVkladaciaPoz"].maxSila)
    values.push(value["1_lisovaciaVkladaciaPoz"].minSila)
    values.push(value["1_lisovaciaVkladaciaPoz"].maxPozicia)
    values.push(value["1_lisovaciaVkladaciaPoz"].minPozicia)
    values.push(formatToISODateString(decodeDT(value["1_lisovaciaVkladaciaPoz"].dateTime)))
    // kontrola po lisovani
    values.push(value["2_kontrolaPoLisovani"].status)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovania)
    values.push(value["2_kontrolaPoLisovani"].meranieVysky)
    values.push(value["2_kontrolaPoLisovani"].positionAdjustment)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota1)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota2)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota3)
    values.push(value["2_kontrolaPoLisovani"].rovnostZalisovaniaHodnota4)
    values.push(value["2_kontrolaPoLisovani"].meranieVyskyHodnota)
    values.push(formatToISODateString(decodeDT(value["2_kontrolaPoLisovani"].dateTime))) 
    // nakladanie platnicky
    values.push(value["3_nakladaniePlatnicky"].status)
    values.push(value["3_nakladaniePlatnicky"].hodnotaSnimacaZdvihu)
    values.push(formatToISODateString(decodeDT(value["3_nakladaniePlatnicky"].dateTime)))
    // rolovacia pozicia
    values.push(value["4_rolovaciaPoz"].status)
    values.push(value["4_rolovaciaPoz"].sila)
    values.push(value["4_rolovaciaPoz"].pozicia)
    values.push(value["4_rolovaciaPoz"].hodnotaSnimacaPritlacnyPiest)
    values.push(value["4_rolovaciaPoz"].otackyVretena)
    values.push(value["4_rolovaciaPoz"].posuvPriRolovani)
    values.push(value["4_rolovaciaPoz"].maxSila)
    values.push(value["4_rolovaciaPoz"].minSila)
    values.push(value["4_rolovaciaPoz"].maxPozicia)
    values.push(value["4_rolovaciaPoz"].minPozicia)
    values.push(value["4_rolovaciaPoz"].nastavenyIntervalMazania),
    values.push(value["4_rolovaciaPoz"].casMazania),
    values.push(value["4_rolovaciaPoz"].aktualnyCyklus),
    values.push(value["4_rolovaciaPoz"].mazanieVykonane),
    values.push(formatToISODateString(decodeDT(value["4_rolovaciaPoz"].dateTime)))
    // cistenie po rolovani
    values.push(value["5_cisteniePoRolovani"].status)
    values.push(formatToISODateString(decodeDT(value["5_cisteniePoRolovani"].dateTime)))
    // kontrola po rolovani
    values.push(value["6_kontrolaPoRolovani"].status)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_orientacia_plocha)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.gm_krivost_MIN)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_krivost_MAX)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.GM_krivost_priemer)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.priemer_vonkajsi)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.priemer_vnutorny)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_pocet_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_celkova_velkost)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_kruznici_celkova_sirka)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_ploche_pocet_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vada_na_ploche_celkova_plocha_vad)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_platnicky)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_zarolovania)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.hodnoty.vyska_GM)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.GM_orientacia)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.GM_krivost)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.priemer_vonkajsi)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.priemer_vnutorny)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vada_na_kruznici)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy["vada_na_ploche(praskliny)"])
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_platnicky)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_zarolovania)
    values.push(value["6_kontrolaPoRolovani"].dataProfilomer.statusy.vyska_GM)
    values.push(formatToISODateString(decodeDT(value["6_kontrolaPoRolovani"].dateTime)))
    // nakladanie skrutiek
    values.push(value["7_nakladanieSkrutiek"].status)
    values.push(formatToISODateString(decodeDT(value["7_nakladanieSkrutiek"].casNalozeniaSkrutiek)))
    // lisovanie skrutiek
    values.push(value["8_lisovanieSkrutiek"].status)
    values.push(formatToISODateString(decodeDT(value["8_lisovanieSkrutiek"].dateTime)))
    values.push(value["8_lisovanieSkrutiek"].sila)
    values.push(value["8_lisovanieSkrutiek"].pozicia)
    values.push(value["8_lisovanieSkrutiek"].tlakHydraulika)
    values.push(value["8_lisovanieSkrutiek"].tlakVzduch)
    // kontrola po lisovani 
    values.push(value["9_kontrolaPoLisovaniSkrutiek"].status)
    values.push(formatToISODateString(decodeDT(value["9_kontrolaPoLisovaniSkrutiek"].dateTime)))
    // odoberacia pozicia
    values.push(value["10_odoberaciaPozicia"].status)
    values.push(formatToISODateString(decodeDT(value["10_odoberaciaPozicia"].dateTime)))
    // laser pozicia
    values.push(value["11_laserPozicia"].status)
    values.push(formatToISODateString(decodeDT(value["11_laserPozicia"].dateTime)))
    // kontrola kodu
    values.push(value["12_kontrolaKodu"].status)
    values.push(value["12_kontrolaKodu"].nacitanyKod)
    values.push(formatToISODateString(decodeDT(value["12_kontrolaKodu"].dateTime)))
    values.push(String.fromCharCode(value["12_kontrolaKodu"].grade))

    return insertSQL(OPC_DATA_DIELU_SQL.tableName, dataDielyColumns, values)
}

const opcDataDieluOnDataRouter = (res, env) => {
    const value = res.value.value
    if (value.dielNalozenyDoPripravku >= 101 && value.dielNalozenyDoPripravku <= 110) {
        opcDummyDielyOnData(res, env)
    } else {
        opcDataDieluOnData(res, env)
    }
}

const opcHmiData = async (res, env) => {
    const idDielu = res.value.value
    const sqlReq = new mssql.Request()
    sqlReq.input("id_dielu", idDielu)
    const sqlRes = await sqlReq.query(`
        SELECT *
        FROM ${OPC_DATA_DIELU_SQL.tableName}
        WHERE id_dielu = @id_dielu
        ORDER BY id DESC;
        `)
    const dataDielu = sqlRes.recordset[0]

    const nodes = [
        // DATA DIELU
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."CisloPaletkyDopravnik"', dataDielu.cislo_paletky_dopr),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."CisloPozicieStol"', dataDielu.cislo_pozicie_stol),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."ID_dielu"', idDielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."CisloDielu"', dataDielu.cislo_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."CisloZakazky"', dataDielu.cislo_zakazky),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."GumoKov"."CisloDielu"', dataDielu.gumokov_cislo_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."GumoKov"."Milnik"', dataDielu.gumokov_milnik),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."GumoKov"."Sarza"', dataDielu.gumokov_sarza),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."GumoKov"."VyrobnaZakazka"', dataDielu.gumokov_vyr_zakazka),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Housing"."CisloDielu"', dataDielu.housing_cislo_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Housing"."Sarza"', dataDielu.housing_sarza),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Housing"."WEdokladu"', dataDielu.housing_we_dokladu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Milnik"', dataDielu.milnik_zakazka),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Platnicka"."CisloDielu"', dataDielu.platnicka_cislo_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Platnicka"."Sarza"', dataDielu.platnicka_sarza),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Platnicka"."WEdokladu"', dataDielu.platnicka_we_dokladu),
        createUInt16WriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Poradie"', dataDielu.poradie),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."dielNalozenyDoPripravku"', dataDielu.diel_nalozeny_do_prip),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."doplnkovyStatusDielu"', dataDielu.doplnkovy_status),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."statusDielu"', dataDielu.status_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Skrutky"."CisloDielu"', dataDielu.skrutky_cislo_dielu),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Skrutky"."Sarza"', dataDielu.skrutky_sarza),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."Zakazka"."Skrutky"."WEdokladu"', dataDielu.skrutky_we_dokladu),
        
        // KONTROLA NA DOPRAVNIKU
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."cisloPalety"', dataDielu.kont_dopr_cislo_palety),
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."DateTime"', dataDielu.kont_dopr_datetime),
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_A"."Orientacia_hodnota"', dataDielu.kont_dopr_a_orientacia_hodnota),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_A"."Orientacia_string"', dataDielu.kont_dopr_a_orientacia_string),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_A"."Prestrek_hodnota"', dataDielu.kont_dopr_a_prestrek_hodnota),
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_B"."Orientacia_hodnota"', dataDielu.kont_dopr_b_orientacia_hodnota),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_B"."Orientacia_string"', dataDielu.kont_dopr_b_orientacia_string),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Namerane_hodnoty_strana_B"."Prestrek_hodnota"', dataDielu.kont_dopr_b_prestrek_hodnota),
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Statusy_kontrol"."Orientacia"', dataDielu.kont_dopr_status_orientacia),
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."0_KontrolaNaDopravniku"."Statusy_kontrol"."Prestrek"', dataDielu.kont_dopr_status_prestrek),

        // LISOVACIA VKLADACIA POZICIA
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."DateTime"', dataDielu.lis_vklad_datetime),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."MaxPozicia"', dataDielu.lis_vklad_max_pozicia),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."MaxSila"', dataDielu.lis_vklad_max_sila),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."MinPozicia"', dataDielu.lis_vklad_min_pozicia),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."MinSila"', dataDielu.lis_vklad_min_sila),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."Pozicia"', dataDielu.lis_vklad_pozicia),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."Sila"', dataDielu.lis_vklad_sila),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."1_LisovaciaVkladaciaPoz"."Status"', dataDielu.lis_vklad_status),

        // KONTROLA PO LISOVANI
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."DateTime"', dataDielu.kont_lis_datetime),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."MeranieVysky"', dataDielu.kont_lis_meranie_vysky),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."MeranieVyskyHodnota"', dataDielu.kont_lis_meranie_vysky_hod),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."PositionAdjustment"', dataDielu.kont_lis_pos_adjust),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."RovnostZalisovania"', dataDielu.kont_lis_rovnost_zalis),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."RovnostZalisovaniaHodnota1"', dataDielu.kont_lis_rovnost_zalis_1),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."RovnostZalisovaniaHodnota2"', dataDielu.kont_lis_rovnost_zalis_2),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."RovnostZalisovaniaHodnota3"', dataDielu.kont_lis_rovnost_zalis_3),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."RovnostZalisovaniaHodnota4"', dataDielu.kont_lis_rovnost_zalis_4),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."2_KontrolaPoLisovani"."Status"', dataDielu.kont_lis_status),

        // NAKLADANIE PLATNICKY
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."3_NakladaniePlatnicky"."DateTime"', dataDielu.nakl_plat_datetime),
        createInt16WriteNode('ns=3;s="HMIdatabaza"."data"."3_NakladaniePlatnicky"."HodnotaSnimacaZdvihu"', dataDielu.nakl_plat_hodnota_zdvih),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."3_NakladaniePlatnicky"."Status"', dataDielu.nakl_plat_status),

        // ROLOVACIA POZICIA
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."DateTime"', dataDielu.rol_poz_datetime),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."HodnotaSnimacaPritlacnyPiest"', dataDielu.rol_poz_hodnota_pritl_piest),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."MaxPozicia"', dataDielu.rol_poz_pozicia_max),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."MaxSila"', dataDielu.rol_poz_sila_max),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."MinPozicia"', dataDielu.rol_poz_pozicia_min),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."MinSila"', dataDielu.rol_poz_sila_min),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."OtackyVretena"', dataDielu.rol_poz_otacky_vretena),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."PosuvPriRolovani"', dataDielu.rol_poz_posuv_pri_rolovani),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."Pozicia"', dataDielu.rol_poz_pozicia),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."Sila"', dataDielu.rol_poz_sila),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."Status"', dataDielu.rol_poz_status),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."NastavenyIntervalMazania"', dataDielu.rolovacia_poz_interval_mazania),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."AktualnyCyklus"', dataDielu.rolovacia_poz_akt_cyklus),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."CasMazania"', dataDielu.rolovacia_poz_cas_mazania),
        createBooleanWriteNode('ns=3;s="HMIdatabaza"."data"."4_RolovaciaPoz"."MazanieVykonane"', dataDielu.rolovacia_poz_mazanie_vykonane),

        // CISTENIE PO ROLOVANI
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."5_CisteniePoRolovani"."DateTime"', dataDielu.cist_rol_datetime),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."5_CisteniePoRolovani"."Status"', dataDielu.cist_rol_status),

        // KONTROLA PO ROLOVANI
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."GM_krivost_MAX"', dataDielu.kont_rol_gm_krivost_max),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."GM_krivost_priemer"', dataDielu.kont_rol_gm_krivost_priem),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."GM_orientacia_plocha"', dataDielu.kont_rol_gm_orientacia_plocha),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Gm_krivost_MIN"', dataDielu.kont_rol_gm_krivost_min),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Priemer_vnutorny"', dataDielu.kont_rol_priem_vnutorny),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Priemer_vonkajsi"', dataDielu.kont_rol_priem_vonkajsi),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vada_na_kruznici_celkova_sirka"', dataDielu.kont_rol_vada_kruz_celk_sirka),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vada_na_kruznici_celkova_velkost"', dataDielu.kont_rol_vada_kruz_celk_velkost),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vada_na_kruznici_pocet_vad"', dataDielu.kont_rol_vada_kruz_pocet_vad),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vada_na_ploche_celkova_plocha_vad"', dataDielu.kont_rol_vada_plocha_celk_plocha_vad),
        createInt32WriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vada_na_ploche_pocet_vad"', dataDielu.kont_rol_vada_plocha_pocet_vad),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vyska_GM"', dataDielu.kont_rol_vyska_gm),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vyska_platnicky"', dataDielu.kont_rol_vyska_platnicky),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Hodnoty"."Vyska_zarolovania"', dataDielu.kont_rol_vyska_zarolovania),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."GM_krivost"', dataDielu.kont_rol_status_gm_krivost),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."GM_orientacia"', dataDielu.kont_rol_status_gm_orientacia),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Priemer_vnutorny"', dataDielu.kont_rol_status_priem_vnutorny),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Priemer_vonkajsi"', dataDielu.kont_rol_status_priem_vonkajsi),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Vada_na_kruznici"', dataDielu.kont_rol_status_vada_kruz),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Vada_na_ploche(praskliny)"', dataDielu.kont_rol_status_vada_plocha_prask),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Vyska_platnicky"', dataDielu.kont_rol_status_vyska_platnicky),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Vyska_zarolovania"', dataDielu.kont_rol_status_vyska_zarolovania),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DataProfilomer"."Statusy"."Vyska_GM"', dataDielu.kont_rol_status_vyska_gm),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."Status"', dataDielu.kont_rol_status),
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."6_KontrolaPoRolovani"."DateTime"', dataDielu.kont_rol_datetime),

        // NAKLADANIE SKRUTIEK
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."7_NakladanieSkrutiek"."CasNalozeniaSkrutiek"', dataDielu.nakl_skrut_cas_nalozenia_skrutiek),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."7_NakladanieSkrutiek"."Status"', dataDielu.nakl_skrut_status),

        // LISOVANIE SKRUTIEK
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."DateTime"', dataDielu.lis_skrut_datetime),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."Pozicia"', dataDielu.lis_skrut_pozicia),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."Sila"', dataDielu.lis_skrut_sila),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."Status"', dataDielu.lis_skrut_status),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."TlakHydraulika"', dataDielu.lis_skrut_tlak_hydraulika),
        createFloatWriteNode('ns=3;s="HMIdatabaza"."data"."8_LisovanieSkrutiek"."TlakVzduch"', dataDielu.lis_skrut_tlak_vzduchu),

        // KONTROLA PO LISOVANI SKRUTIEK
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."9_KontrolaPoLisovaniSkrutiek"."DateTime"', dataDielu.kont_skrut_datetime),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."9_KontrolaPoLisovaniSkrutiek"."Status"', dataDielu.kont_skrut_status),

        // ODOBERACIA POZICIA
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."10_OdoberaciaPozicia"."DateTime"', dataDielu.odober_poz_datetime),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."10_OdoberaciaPozicia"."Status"', dataDielu.odober_poz_status),

        // LASER POZICIA
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."11_LaserPozicia"."DateTime"', dataDielu.laser_poz_datetime),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."11_LaserPozicia"."Status"', dataDielu.laser_poz_status),

        // KONTROLA KODU
        createDTwriteNode('ns=3;s="HMIdatabaza"."data"."12_KontrolaKodu"."DateTime"', dataDielu.kont_kodu_datetime),
        createStringWriteNode('ns=3;s="HMIdatabaza"."data"."12_KontrolaKodu"."NacitanyKod"', dataDielu.kont_kodu_nacitany_kod),
        createByteWriteNode('ns=3;s="HMIdatabaza"."data"."12_KontrolaKodu"."Status"', dataDielu.kont_kodu_status),
        createCharWriteNode('ns=3;s="HMIdatabaza"."data"."12_KontrolaKodu"."grade"', dataDielu.kont_kodu_grade)
    ]

    const writeRes = await env.session.write(nodes)
    let bad = 0
    for (let i = 0; i < writeRes.length; i++) {
        const nodeRes = writeRes[i]
        const node = nodes[i]
        if (nodeRes.value !== 0) {
            logger.warn(`HMI write: statusCode bad for ${node?.nodeId}`) 
            bad++
        }
    }
    if (bad === 0) logger.debug(`HMI write: all write nodes good`)
}

export const OPC_KONTROLA_PALETKY = {
    tableName: "kontrola_paletky",
    columns: [
        { name: "id", datatype: mssql.Int, primaryKey: true, identity: true },
        { name: "sys_time", datatype: mssql.DateTime2 },
        { name: "id_int", datatype: mssql.Int },
        { name: "id_string", datatype: mssql.NVarChar(40) },
        { name: "sarza_gm", datatype: mssql.NVarChar(40) },
        { name: "sarza_housing", datatype: mssql.NVarChar(40) },
        { name: "housing_status", datatype: mssql.Int },
        { name: "gm_status", datatype: mssql.Int },
        { name: "dummy_status", datatype: mssql.Int },
        { name: "a_orientacia_hodnota", datatype: mssql.Int },
        { name: "a_orientacia_string", datatype: mssql.NVarChar(40) },
        { name: "a_prestrek_hodnota", datatype: mssql.Decimal(10, 3) },
        { name: "b_orientacia_hodnota", datatype: mssql.Int },
        { name: "b_orientacia_string", datatype: mssql.NVarChar(40) },
        { name: "b_prestrek_hodnota", datatype: mssql.Decimal(10, 3) },
        { name: "status_orientacia", datatype: mssql.Int },
        { name: "status_prestrek", datatype: mssql.Int },
        { name: "datetime", datatype: mssql.DateTime2 }
    ]   
}

const kontrolaPaletkyColumns = extractColumnNames(OPC_KONTROLA_PALETKY.columns)

const opcKontrolaPaletky = res => {
    const value = res.value.value
    const now = new Date()
    const values = []
    values.push(formatToISODateString(now))
    values.push(value.ID_INT)
    values.push(value.ID_STRING)
    values.push(value.sarzaGM)
    values.push(value.sarzaHausing)
    values.push(value.statusy.housing_status)
    values.push(value.statusy.GM_status)
    values.push(value.statusy.dummy_status)
    values.push(value.namerane_hodnoty_strana_a.orientacia_hodnota)
    values.push(value.namerane_hodnoty_strana_a.orientacia_string)
    values.push(value.namerane_hodnoty_strana_a.prestrek_hodnota)
    values.push(value.namerane_hodnoty_strana_b.orientacia_hodnota)
    values.push(value.namerane_hodnoty_strana_b.orientacia_string)
    values.push(value.namerane_hodnoty_strana_b.prestrek_hodnota)
    values.push(value.statusy_kontrol.prestrek)
    values.push(value.statusy_kontrol.orientacia)
    values.push(formatToISODateString(decodeDT(value.dateTime)))
    return insertSQL(OPC_KONTROLA_PALETKY.tableName, kontrolaPaletkyColumns, values)
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

opcAuditTrailVypinanieKontrolDMCGrade

// >>> OPC CONFIG
export const OPC = {
    appName: "avsys-opc-logger",
    resetDelay: 10000, // cas kolko ma aplikacia cakat na znovuspustenie pri chybe
    opcEndpointURL: "opc.tcp://10.100.1.10:4840",
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
            pollingTime: 250,
            watchNodeId: 'ns=3;s="DataDielyStol"."StatusUlozenia"',
            readNode: { nodeId: 'ns=3;s="DataDielyStol"."Databaza"', attribudeId: AttributeIds.Value },
            sql: OPC_DATA_DIELU_SQL,
            onData: opcDataDieluOnDataRouter
        },
        {
            name: "Data dielu NOK",
            pollingTime: 250,
            watchNodeId: 'ns=3;s="DataDielyStol"."StatusUlozeniaNOK"',
            readNode: { nodeId: 'ns=3;s="DataDielyStol"."DatabazaNOK"', attribudeId: AttributeIds.Value },
            sql: OPC_DATA_DIELU_SQL,
            onData: opcDataDieluOnData
        },
        {
            name: "Data HMI",
            watchNodeId: 'ns=3;s="HMIdatabaza"."trigger"',
            readNode: { nodeId: 'ns=3;s="HMIdatabaza"."IDdielu"', attribudeId: AttributeIds.Value },
            onData: opcHmiData
        },
        {
            name: "Kontrola paletky",
            watchNodeId: 'ns=3;s="Data_paletka_databaza"."status_ulozenia"',
            readNode: { nodeId: 'ns=3;s="Data_paletka_databaza"."paletka"', attribudeId: AttributeIds.Value },
            sql: OPC_KONTROLA_PALETKY,
            onData: opcKontrolaPaletky
        },
        {
            name: "Audit Trail PLC",
            watchNodeId: 'ns=3;s="SQL_AuditTrail"."triggerZapisDatDoPlc"',
            readNode: { nodeId: 'ns=3;s="DataReceptura"."PrePLC"', attribudeId: AttributeIds.Value },
            onData: opcAuditTrailPLC,
        },
        {
            name: "Audit Trail HMI",
            watchNodeId: 'ns=3;s="SQL_AuditTrail"."triggerUlozenieHMIdat"',
            readNode: { nodeId: 'ns=3;s="DataReceptura"."HMI"', attribudeId: AttributeIds.Value },
            onData: opcAuditTrailHMI,
        },
        {
            name: "Audit Trail vypinanie kontrol D_VST",
            watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."D_VST_Vypinanie kontrol"',
            pollOnly: true,
            onPoll: opcAuditTrailVypinanieKontrolD_VST,
        },
        {
            name: "Audit Trail vypinanie kontrol po lisovani",
            watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."KontrolaPoLisovania"',
            pollOnly: true,
            onPoll: opcAuditTrailVypinanieKontrolPoLis,
        },
        {
            name: "Audit Trail vypinanie kontroly profilomer",
            watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."KontrolyProfilomer"',
            pollOnly: true,
            onPoll: opcAuditTrailVypinanieKontrolProfilomer,
        },
        {
            name: "Audit Trail vypinanie kontroly DMC_GRADE",
            watchNodeId: 'ns=3;s="HMI_vypinanie_kontrol"."DMC_GRADE"',
            pollOnly: true,
            onPoll: opcAuditTrailVypinanieKontrolDMCGrade,
        }
    ]
}

// >>> WEB CONFIG
export const WEB = {
    port: 3000
}