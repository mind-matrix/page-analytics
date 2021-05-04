import { IPage, Page } from "./page"

export abstract class PageCollection {
    
    abstract getPage: (id: string) => Promise<Page | null>

    abstract addPage: (url: string) => Promise<Page | null>

    abstract removePage: (id: string) => Promise<Page | null>

    async getFunnel(id: string, opts: { maxDepth: number } = { maxDepth: 4 }) {
        let start = await this.getPage(id)
        if (!start) throw Error("cannot find page")
        let funnel = [ start ]
        for (let i=0; i < opts.maxDepth; i++) {
            if (!Object.keys(start!.leads).length) return funnel
            let next: string = Object.keys(start!.leads).reduce((a, b) => start!.leads[a] > start!.leads[b] ? a : b)
            start = await this.getPage(next)
            if (!start) return funnel
            funnel.push(start)
        }
        return funnel
    }
}