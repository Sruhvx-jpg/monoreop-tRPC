import {CreateHTTPContextOptions} from "@trpc/server/adapters/standalone"

export const createContext = ({req, res}: CreateHTTPContextOptions) => ({
    req,
    res
})