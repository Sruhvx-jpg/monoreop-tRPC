class apiErr extends Error{
    statuscode: number
    isOperational: boolean
    constructor(statuscode: number, message: string){
        super(message)
        this.statuscode = statuscode
        this.isOperational = true
    }

    static dataNotFound(message = "DATA NOT FOUND: ++⚠️This is a vanilla template, modify with respect to the use case⚠️++"){
        return new apiErr(404, message)
    }

    static dataAlreadyExist(message = "DATA ALREADY EXIST: ++⚠️This is a vanilla template, modify with respect to the use case⚠️++"){
        return new apiErr(0, message)
    }

    static unauthorizedAccess(message = "UNAUTHORIZED ACCESS: ++⚠️This is a vanilla template, modify with respect to the use case⚠️++"){
        return new apiErr(401, message)
    }

    static unknownErr(message = "UNKNOWN ERROR: ++⚠️This is a vanilla template, modify with respect to the use case⚠️++" ){
        return new apiErr(0, message)
    }
}

export default apiErr