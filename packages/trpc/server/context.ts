import { CreateExpressContextOptions } from "@trpc/server/adapters/express"
import { createCookieFactory, deleteCookieFactory, getCookieFactory } from "./utils/cookie"

export interface TRPCContext {
    req: CreateExpressContextOptions["req"];
    res: CreateExpressContextOptions["res"];
    createCookie: ReturnType <typeof createCookieFactory>
    getCookie: ReturnType <typeof getCookieFactory>
    deleteCookie: ReturnType <typeof deleteCookieFactory>
}

export async function createContext({req, res}: CreateExpressContextOptions): Promise<TRPCContext> {
    const ctx: TRPCContext = {
        req,
        res,
        createCookie: createCookieFactory(res),
        getCookie: getCookieFactory(req),
        deleteCookie: deleteCookieFactory(res),
    }

    return ctx
}

export type context = Awaited<ReturnType<typeof createContext>>