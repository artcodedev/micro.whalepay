
import jsonwebtoken, { JwtPayload }from "jsonwebtoken";
import { SecretKey } from "./Secure/SeckretKey";
import { Logger } from "./Utils/Logger";


export class Token {

    public static async VarifyToket(token: string): Promise<boolean> {

        try {
            const varify: string | JwtPayload = jsonwebtoken.verify(token, SecretKey.secret_key_micro);
            return varify ? true : false;

        } catch (e) {
            Logger.write(process.env.ERROR_LOGS, e);
            return false
        }

    }
}