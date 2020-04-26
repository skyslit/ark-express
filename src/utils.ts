import { ArkExpressPackage } from "./package";
import { Response, Request, NextFunction } from "express";
import { validationResult } from 'express-validator';

export type Utils = {
    validate: (validations: any[]) => (req: Request, res: Response, next: NextFunction) => void
    authorize: (roles?: string[]) => (req: Request, res: Response, next: NextFunction) => void
}

export default (_package: ArkExpressPackage): Utils => ({
    validate: (validations: any[]) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }

            const resPayload = { message: 'Validation failed', errors: errors.array() }
            if (resPayload.errors.length > 0) {
                resPayload.message = resPayload.errors[0].msg;
            }

            res.status(422).json(resPayload);
        };
    },
    authorize: (roles?) => {
        roles = roles ? roles : [];
        return (req, res, next) => {
            if (req.user) {
                if (Array.isArray(roles) && roles.length > 0) {
                    if (req.user.roles.some((r) => roles.indexOf(r) > -1)) {
                        return next();
                    }
                } else {
                    return next();
                }
            }

            return res.status(401).json({ message: 'Request unauthorized' });
        }
    }
})