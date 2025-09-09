import { AttributeIds, OPCUAClient, DataType } from "node-opcua-client";
import { OPC as CONFIG, logger } from "./config.js"
import mssql from "mssql"
import Poller from "./poller.js"

const RESET_DELAY = CONFIG.resetDelay
const INSTANCE_STATUS = {
    READY_TO_TRIGGER: 0, // pripraveny na trigger
    BUSY: 1 // plc ma nove data
}

const initInstance = (session, instance) => {
    const instanceName = instance.name
    logger.debug(`initializing instance ${instanceName}`)
    instance.runtime = {
        status: INSTANCE_STATUS.READY_TO_TRIGGER
    }

    const triggerValue = instance.triggerValue ?? 1
    const acknowledgeValue =  instance.acknowledgeValue ?? 2 
    const writeNode = {
        nodeId: instance.watchNodeId,
        attributeId: AttributeIds.Value,
        value: {
            value: {
                dataType: DataType.Byte,
                value: acknowledgeValue
            }
        }
    }

    const poller = new Poller(session, instance.watchNodeId)

    poller.on("start", () => {
        logger.info(`poller of instance ${instanceName} started`)
    })

    poller.on("poll", async data => {
        if (data.res.statusCode._value) {
            logger.warn(`instance ${instanceName} poll wrong status code 
                ${data.res.statusCode._value} of ${instanceName}, name: ${data.res.statusCode._name}`)
        }

        try {
            if (instance.onPoll) await instance.onPoll(data, { session: session })
        } catch (e) {
            logger.error(`error onPoll: ${e.stack}`)
        }
        
        if (instance.pollOnly) return

        const value = data.res.value.value
        
        if (value !== triggerValue && instance.runtime.status === INSTANCE_STATUS.BUSY) {
            instance.runtime.status = INSTANCE_STATUS.READY_TO_TRIGGER
            logger.debug(`status of instance ${instanceName} reseted after polling non-trigger value ${value}`)
            return
        }
        
        if (value === triggerValue && instance.runtime.status === INSTANCE_STATUS.READY_TO_TRIGGER) {
            writeNode.value.value.value = acknowledgeValue // resetovanie acknowledge value
            instance.runtime.status = INSTANCE_STATUS.BUSY
            logger.debug(`update triggered on instance ${instanceName}, triggerValue ${triggerValue}`)
            try {
                const start = new Date()
                const res = instance.readNode ? await session.read(instance.readNode) : null
                const end = new Date()
                const elapsed = end - start
                logger.debug(`instacne ${instanceName} read data in ${elapsed} ms`)
                const envData = {
                    start: start,
                    end: end,
                    elapsed: elapsed,
                    session: session
                }
                const startOnData = new Date()
                const newAckValue = await instance.onData(res, envData)
                if (typeof newAckValue === 'number' && Number.isInteger(newAckValue)) writeNode.value.value.value = newAckValue
                const endOnData = new Date()
                const elapsedOnData = endOnData - startOnData
                logger.debug(`instance ${instanceName} performed onData function in ${elapsedOnData} ms`)
            } catch (e) {
                logger.error(`error performing log: ${e.stack}`)
            } finally {
                const wrtStart = new Date()
                const writeRes = await session.write(writeNode)
                const wrtEnd = new Date()
                const elapsedWrt = wrtEnd - wrtStart 
                logger.trace(`write response: ${JSON.stringify(writeRes)} of ${instanceName}`)
                if (writeRes.value === 0) {
                    logger.debug(`instance ${instanceName} ack value ${writeNode.value.value.value} written in ${elapsedWrt} ms`)
                } else {
                    throw new Error(`cannot write ack value for instance ${instanceName} 
                        (${writeNode}: ${writeRes.value} ${writeRes.description})`)
                }

                instance.runtime.status = INSTANCE_STATUS.READY_TO_TRIGGER
                logger.debug(`status of instance ${instanceName} reseted after processing data`)
            }
        }
    })

    poller.on("error", err => {
        logger.error(`error on instance ${instanceName}: ${err.message}`)
        if (instance.stopOnError) poller.stop()
        if (err.message.includes("BadConnectionClosed")) {
            logger.warn(`Error BadConnectionClosed, stopping poller ${instanceName}`)
            poller.stop()
            logger.info(`poller of ${instanceName} will restart in  + ${RESET_DELAY}`)
            setTimeout(() => {
                poller.poll({
                    pollingTime: instance.pollingTime ?? 1000,
                    stopOnError: instance.stopOnError ?? false
                }, RESET_DELAY)
            })
        } 
    })

    poller.on("stop", () => {
        logger.info(`instance ${instanceName} stopped`)
    })

    poller.poll({
        pollingTime: instance.pollingTime ?? 1000,
        stopOnError: instance.stopOnError ?? false
    })

    logger.info(`instance ${instanceName} initialized`)

    return poller
}

const startApp = async (resetDelay) => {
    let client, session
    try {
        logger.info(`logger level is set to ${logger.level}`)
        logger.info(`initializing app ${CONFIG.appName}`)
        await mssql.connect(CONFIG.sqlConfig)
        logger.info(`connected to ${CONFIG.sqlConfig.server}/${CONFIG.sqlConfig.database}`)
        
        client = OPCUAClient.create(CONFIG.opcClientOptions)
        await client.connect(CONFIG.opcEndpointURL)
        
        client.on("connection_lost", () => logger.error("connection with server lost"))
        client.on("connection_reestablished", () => {
            logger.info("connction with server reestablished")
            for (const instance of CONFIG.instances) {
                const poller = instance.poller
                if (poller) {
                    poller.poll({
                        pollingTime: instance.pollingTime ?? 1000,
                        stopOnError: instance.stopOnError ?? false
                    })
                }
            }
        })

        logger.info(`connected to OPC server ${CONFIG.opcEndpointURL}`)
        session = await client.createSession()
        logger.info("opc session created")
        
        for (const instance of CONFIG.instances) {
            if (instance.paused) {
                logger.info(`instance ${instance.name} is paused`)
                continue
            }
            const poller = initInstance(session, instance)
            instance.poller = poller
            if (instance.readNode) await session.read(instance.readNode) // nacitam strukturu do pamate aby sa necakalo pri prvom citani ked nabehne trigger
        }
        logger.info("application ready")
    } catch (err) {
        logger.fatal(`error while initializing app ${err.stack}`)
        logger.info(`waiting ${resetDelay}ms for app restart`)

        for (const instance of CONFIG.instances) if (instance.poller) instance.poller.stop("app")

        if (session) {
            try {
                await session.close()
            } catch (e) {
                logger.error(`error while closing opc session`)
            }
        }

        if (client) {
            try {
                await client.disconnect()
            } catch (e) {
                logger.error(`error while disconnecting opc client`)
            }
        }
        
        setTimeout(() => {
            startApp(resetDelay)
        }, resetDelay);
    }
}

startApp(RESET_DELAY)

process.on('unhandledRejection', (reason) => {
    logger.fatal(`Unhandled Rejection: ${JSON.stringify(reason.stack, null, 2)}`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.fatal(`Uncaught Exception: ${JSON.stringify(error, null, 2)}`);
    process.exit(1);
});