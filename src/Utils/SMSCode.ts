import { SecretKey } from "../Secure/SeckretKey";
import { Fetch } from "./Fetch";
import { Logger } from "./Logger";
import { Token } from "./Token";



interface requestSMSRes {
    status: number
    data: FetchSMS[]
}

interface FetchSMS {
    id: string
    phone: string,
    date: string,
    message: string,
}

interface requestSMSAnswer {
    status: boolean
    data?: FetchSMS[]
}

export class SMSCode {

    private static async parseAllSMS() { }

    private static async requestSMS(): Promise<requestSMSAnswer> {

        try {
            const token: string = await Token.sign({ uid: 'uid' }, SecretKey.secret_key_micro, 1000);

            const req: requestSMSRes = await Fetch.request('http://localhost:3005/getallmessages', {token: token});

            if (req.status) {}

            return {status: false}

        }

        catch (e) {
            Logger.write(process.env.ERROR_LOGS, e);
            return {status: false}
        }
    }

    public static async getSMS(phone: string) {



    }
} 