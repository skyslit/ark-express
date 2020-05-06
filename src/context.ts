import { Request, Response, NextFunction } from "express";

export const serverContext = {
    initializeContext: (req: Request, res: Response, next: NextFunction) => {
        req.context = {} as any;
        next();
    },
    contextHandler: (req: Request, res: Response, next: NextFunction) => {
        if (req.context) {
            res.json(req.context);
        } else {
            next();
        }
    }
}