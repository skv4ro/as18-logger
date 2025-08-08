export default class Poller {
    /** @type {import("node-opcua").ClientSession} */
    #session = null
    #watchNode = null
    #polling = false
    #pollingTime = 1000
    #onPoll = []
    #onStop = []
    #onError = []
    #onStart = []
    #currentInerval = null

    constructor (session, watchNode) {
        this.#session = session
        this.#watchNode = watchNode
    }

    get isPolling () {
        return this.#polling
    }
    
    on (eventType, callback) {
        if (eventType === "poll") this.#onPoll.push(callback)
        if (eventType === "stop") this.#onStop.push(callback)
        if (eventType === "error") this.#onError.push(callback)
        if (eventType === "start") this.#onStart.push(callback)
    }

    poll (options = {}) {
        if (this.#polling) return // already polling
        this.#onStart.forEach(callback => callback())
        this.#polling = true

        const pollingTime = options.pollingTime ?? this.#pollingTime
        if (pollingTime > 0) this.#pollingTime = pollingTime
        else throw new Error("Wrong polling time " + pollingTime)

        const stopOnError = options.stopOnError ?? false

        this.#currentInerval = setInterval(async () => {
            if (!this.isPolling) return
            try {
                const start = new Date()
                const res = await this.#session.read({
                    nodeId: this.#watchNode
                })
                if (!this.isPolling) return
                const end = new Date()
                const elapsed = end - start
                const data = {
                    date: end,
                    elapsed: elapsed,
                    res: res,
                }
                this.#onPoll.forEach(callback => callback(data))
            } catch (e) {
                this.#onError.forEach(callback => callback(e))
                if (stopOnError) {
                    this.#polling = false
                    this.stop()
                }
            }
        }, pollingTime);
    }

    stop () {
        if (this.#currentInerval !== null) clearInterval(this.#currentInerval)
        this.#polling = false
        this.#onStop.forEach(callback => callback())
    }
}