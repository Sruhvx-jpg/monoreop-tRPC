import { CookieOptions, Request, Response } from "express"
import { TRPCContext } from "../context"

const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE
const ONE_DAY = 24 * ONE_HOUR
const ONE_MONTH = 30 * ONE_DAY
const ONE_YEAR = 1 * ONE_MONTH

const defaultCookieOption: CookieOptions = ({
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: ONE_YEAR
})

//================================================== factory function ===========================================
export function createCookieFactory(res: Response) {
    return function createCookie(name: string, value: string, options: CookieOptions = defaultCookieOption) {
        res.cookie(name, value, options)
    }
}

export function getCookieFactory(req: Request) {
    return function getCookie(name: string) {
        return req.cookies?.[name]
    }
}



export function deleteCookieFactory(res: Response) {
    return function deleteCookie(name: string) {
        res.clearCookie(name)
    }
}



// ======================================================== auth/access token  =============================================
export function setAuthToken(ctx: TRPCContext, accessToken: string) {
    return ctx.createCookie("authentication_token", accessToken)
}

export function getAuthToken(ctx: TRPCContext) {
    return ctx.getCookie("authentication_token")
}

export function deleteAuthToken(ctx: TRPCContext) {
    ctx.deleteCookie("authentication_token")
}