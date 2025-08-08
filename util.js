import crypro from "crypto"
import pino from "pino"
import mssql from "mssql"
import { DataType, AttributeIds, VariantArrayType } from "node-opcua"

export const createLogger = (sqlitePath, level) => {
    const transport = pino.transport({
        targets: [
            { target: 'pino-pretty', level: level },
            { target: "./pino-sqlite-transport.js", level: level, options: { dbPath: sqlitePath }}
        ]
    })
    const logger = pino(transport)
    logger.level = level
    return logger
}


export const sha1 = msg => {
    return crypro
    .createHash("sha1")
    .update(msg)
    .digest("hex")
}

export const formatToISODateString = date => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const miliseconds = date.getMilliseconds().toString().padStart(3, '0')

    const sqliteDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${miliseconds}Z`;
    return sqliteDateTime;
}

export const formatAlarmDateToISODateString = dateStr => {
    const addedT = dateStr.replace(" ", "T")
    const addedZ = addedT + "Z"
    return addedZ
}

// transformuje s7 wstring pole bajtov na string
// prve styri bajty su meta, zvysok je sprava az po par bajtov 00
// kodovanie je v ucs-2 (utf-16) BigEndian
export const decodeWStringByteArray = byteArray => {

    const startIndex = 4;
    let currentIndex = startIndex;
    const messageArray = [];

    while (currentIndex < byteArray.length - 1 &&
            !(byteArray[currentIndex] === 0 && byteArray[currentIndex + 1] === 0)) {
        messageArray.push(byteArray[currentIndex], byteArray[currentIndex + 1]);
        currentIndex += 2;
    }

    const decoder = new TextDecoder('utf-16be');
    const messageString = decoder.decode(new Uint8Array(messageArray));
    return messageString
}

export const decodeLDT = epochInNanoseconds => {
    const epoch = epochInNanoseconds / 1000000
    const date = new Date(epoch)
    const offset = date.getTimezoneOffset()
    const result = new Date(date.getTime() + offset * 60 * 1000)
    return result
}

export const decodeDTL = dtl => {
    return new Date(
        dtl.YEAR, 
        dtl.MONTH - 1, 
        dtl.DAY, 
        dtl.HOUR, 
        dtl.MINUTE, 
        dtl.SECOND)
}

export const decodeDT = dt => {
    if (!Array.isArray(dt) || dt.length !== 8) {
        throw new Error("Invalid input: Expected an array of 8 bytes.");
    }
    
    // Extract values using BCD decoding
    const bcdToDecimal = (bcd) => ((bcd >> 4) * 10 + (bcd & 0x0F));
    
    let year = bcdToDecimal(dt[0]);
    year += (year >= 90) ? 1900 : 2000; // Adjust year according to S7 rules
    
    const month = bcdToDecimal(dt[1]);
    const day = bcdToDecimal(dt[2]);
    const hour = bcdToDecimal(dt[3]);
    const minute = bcdToDecimal(dt[4]);
    const second = bcdToDecimal(dt[5]);
    
    // Milliseconds are split across byte 6 and part of byte 7
    const ms = (bcdToDecimal(dt[6]) * 10) + (bcdToDecimal(dt[7] >> 4));
    
    return new Date(year, month - 1, day, hour, minute, second, ms);
}

export const encodeDT = date => {
    if (!(date instanceof Date)) {
        throw new Error("Invalid input: Expected a Date object.");
    }
    
    const decimalToBCD = (dec) => ((Math.floor(dec / 10) << 4) | (dec % 10));
    
    let year = date.getFullYear();
    let bcdYear = decimalToBCD(year >= 2000 ? year - 2000 : year - 1900);
    
    return [
        bcdYear,
        decimalToBCD(date.getMonth() + 1),
        decimalToBCD(date.getDate()),
        decimalToBCD(date.getHours()),
        decimalToBCD(date.getMinutes()),
        decimalToBCD(date.getSeconds()),
        decimalToBCD(Math.floor(date.getMilliseconds() / 10)),
        (decimalToBCD(date.getMilliseconds() % 10) << 4) | ((date.getDay() + 1) % 7)
    ];
}

export const insertSQL = (tableName, names, values) => {
    const request = new mssql.Request()
    for (let i = 0; i < names.length; i++) {
        const name = names[i]
        const value = values[i]
        request.input(name, value)
    }
    const params = names.map(name => "@" + name)
    const query = `
        INSERT INTO ${tableName} (${names.join(",")})
        VALUES (${params.join(",")})
    `
    return request.query(query)
}

export const convertDateToUTC = (date) => {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

export const extractText = str => {
    const match = str.match(/\[(.*?)\]/);
    return match ? match[1] : null;
}

export const createWriteNode = (nodeId, dataType, value, arrayType) => {
    const node =  {
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
        value: {
            value: {
                dataType: dataType,
                value: value
            }
        }
    }
    if (arrayType) node.arrayType = arrayType
    return node
}

export const createDTwriteNode = (nodeId, value) => {
    const finalValue = value instanceof Date ? encodeDT(convertDateToUTC(value)) : [144, 1, 1, 0, 0, 0, 0, 2]  
    return createWriteNode(nodeId, DataType.Byte, finalValue, VariantArrayType.Array)
}

export const createFloatWriteNode = (nodeId, value) => {
    const finalValue = isNaN(value) || value === null ? 0 : value
    return createWriteNode(nodeId, DataType.Float, finalValue)
}

export const createInt16WriteNode = (nodeId, value) => {
    const finalValue = isNaN(value) || value === null ? 0 : value
    return createWriteNode(nodeId, DataType.Int16, finalValue)
}

export const createInt32WriteNode = (nodeId, value) => {
    const finalValue = isNaN(value) || value === null ? 0 : value
    return createWriteNode(nodeId, DataType.Int32, finalValue)
}

export const createUInt16WriteNode = (nodeId, value) => {
    const finalValue = isNaN(value) || value === null ? 0 : value
    return createWriteNode(nodeId, DataType.UInt16, finalValue)
}

export const createByteWriteNode = (nodeId, value) => {
    const finalValue = isNaN(value) || value === null ? 0 : value
    return createWriteNode(nodeId, DataType.Byte, finalValue)
}

export const createCharWriteNode = (nodeId, value) => {
    const finalValue = typeof value === "string" || value === '' ? value.charCodeAt(0) : 0
    return createWriteNode(nodeId, DataType.Byte, finalValue)
}

export const createStringWriteNode = (nodeId, value) => {
    const finalValue = typeof value === "string" ? value : ''
    return createWriteNode(nodeId, DataType.String, finalValue)
}

export const createBooleanWriteNode = (nodeId, value) => {
    const finalValue = typeof value === "boolean" ? value : false
    return createWriteNode(nodeId, DataType.Boolean, finalValue)
}

export const extractColumnNames = columns => columns.filter(col => !col.primaryKey).map(col => col.name)