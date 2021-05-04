import { Request, Response, NextFunction } from "express"
import { PageCollection } from "../component/page-collection"

export type UpdateEventData = {
    type: "track"
    id: string
    event: "click"|"context"|"hover"
    point: { x: number, y: number }
} | {
    type: "lead"
    id: string
    from: string
}

export type GetEventData = {
    id: string
}

export default function (collection: PageCollection) {
    return async function (req: Request, res: Response, next: NextFunction) {
        if (req.method === "GET") {
            let data = req.params as GetEventData
            let page = await collection.getPage(data.id)
            if (page) {
                // page found
                res.status(200).send(page.serialize())
            } else {
                // page not found
                res.status(404).send()
            }
        } else if (req.method === "POST") {
            let data: UpdateEventData = req.body
            if (data.type === "track") {
                if (data.event && data.point) {
                    // hotspots
                    let page = await collection.getPage(data.id)
                    if (page) {
                        let done = await page.track(data.event, data.point)
                        res.status(200).send({ done })
                    } else {
                        res.status(404).send()
                    }
                } else {
                    res.status(400).send()
                }
            } else if (data.type === "lead") {
                if (data.from) {
                    // leads
                    let page = await collection.getPage(data.id)
                    if (page) {
                        page.lead(data.from)
                        res.status(200).send()
                    } else {
                        res.status(404).send()
                    }
                } else {
                    res.status(400).send()
                }
            } else {
                res.status(400).send()
            }
        }
    }
}