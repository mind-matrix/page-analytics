import { getBrowserInstance } from "../core/browser"
import tf from "@tensorflow/tfjs-node"
import uniqid from "uniqid"

export interface IPageConfig {
    view: {
        width: number
        height: number
        downsample: number
        encoding: "binary"|"base64"
    }
    hotspot: {
        track: ("click"|"context"|"hover")[]
    }
}

export class PageConfig {
    constructor(public view = {
        width: 1024,
        height: 768,
        downsample: 0.8,
        encoding: <"binary"|"base64">"binary"
    }, public hotspot = {
        track: <("click"|"context"|"hover")[]>["click"]
    }) { }
    
    serialize(): IPageConfig {
        return {
            view: this.view,
            hotspot: this.hotspot
        }
    }
    
    static from (data: IPageConfig) {
        return new PageConfig(data.view)
    }
}

export interface IPageCache {
    view: string | Buffer | null
    tracking: {
        click: number[][] | null
        context: number[][] | null
        hover: number[][] | null
    }
}

export class PageCache {
    constructor(public view: string | Buffer | null = null,
        public tracking = {
            click: <number[][] | null>null,
            context: <number[][] | null>null,
            hover: <number[][] | null>null
        }) { }
    
    serialize(): IPageCache {
        return {
            view: this.view,
            tracking: this.tracking
        }
    }
    
    static from (data: IPageCache) {
        return new PageCache(data.view, data.tracking)
    }
}

export interface IPage {
    id: string
    url: string
    config: IPageConfig
    cache: IPageCache
    leads: { [k: string]: number }
}

export class Page {

    constructor(private url: string, private config: PageConfig = new PageConfig(), private cache: PageCache = new PageCache(), public leads: { [k: string]: number } = {}, private id: string = uniqid('page-')) { }

    async view(nocache: boolean = false) {
        if (this.cache.view && !nocache) return this.cache.view
        let browser = await getBrowserInstance()
        let page = await browser.newPage()
        await page.goto(this.url)
        await page.setViewport({ width: this.config.view.width, height: this.config.view.height })
        this.cache.view = <string | Buffer>await page.screenshot({ fullPage: true, quality: this.config.view.downsample, encoding: this.config.view.encoding })
        let width = this.config.view.width
        let height = this.config.view.height
        for ( let tracker of this.config.hotspot.track ) {
            if (this.cache.tracking[tracker] !== null) {
                this.cache.tracking[tracker] = <number[][]>(await tf.image.resizeNearestNeighbor([this.cache.tracking[tracker]!], [ width, height ]).array())[0]
            } else {
                this.cache.tracking[tracker] = <number[][]>await tf.zeros([ width, height ]).array()
            }
        }
        page.close()
        return this.cache.view
    }

    async hotspot(event: "click"|"context"|"hover") {
        if (event in this.config.hotspot.track) {
            if (!this.cache.tracking[event]) await this.view()
            return tf.sigmoid(this.cache.tracking[event]!)
        } else {
            return null
        }
    }

    async track(event: "click"|"context"|"hover", point: { x: number, y: number }) {
        if (event in this.config.hotspot.track) {
            if (!this.cache.tracking[event]) await this.view()
            let x = Math.min(this.cache.tracking[event]!.length - 1, Math.round(point.x))
            let y = Math.min(this.cache.tracking[event]![0]!.length - 1, Math.round(point.y))
            this.cache.tracking[event]![x][y] += 1
            return true
        } else {
            return false
        }
    }

    lead(fromUrl: string) {
        if (fromUrl in this.leads) {
            this.leads[fromUrl] += 1
        } else {
            this.leads[fromUrl] = 1
        }
    }

    serialize(): IPage {
        return {
            id: this.id,
            url: this.url,
            config: this.config.serialize(),
            cache: this.cache.serialize(),
            leads: this.leads
        }
    }

    static from(data: IPage) {
        return new Page(data.url, PageConfig.from(data.config), PageCache.from(data.cache), data.leads, data.id)
    }
}