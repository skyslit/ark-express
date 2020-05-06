
export { ArkExpressPackage } from './package';
export { ArkExpressModule } from './module';
import 'express-session';

declare global {
    namespace Express {
        interface Request {
            user: {
                _id: string
                roles: string[]
            },
            context: any
        }
    }
}