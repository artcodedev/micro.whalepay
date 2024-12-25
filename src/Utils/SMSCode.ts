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
    data?: string
}

export class SMSCode {

    public static async deleteSMS(): Promise<requestSMSAnswer> {

        try {
            const token: string = await Token.sign({ uid: 'uid' }, SecretKey.secret_key_micro, 1000);

            const req: requestSMSRes = await Fetch.request('http://localhost:3005/deleteallmessage', { token: token });

            return { status: req.status ? true : false }

        }

        catch (e) {
            Logger.write(process.env.ERROR_LOGS, e);
            return { status: false }
        }
    }

    public static async getSMS(): Promise<requestSMSAnswer> {

        try {

            const token: string = await Token.sign({ uid: 'uid' }, SecretKey.secret_key_micro, 1000);

            const req: requestSMSRes = await Fetch.request('http://localhost:3005/getallmessages', { token: token });

            if (req.status) {

                if (req.data.length) {
                    const num: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

                    const code_sms: string[] = []

                    for (let i of req.data.reverse()) {

                        const message: string = i.message.toLowerCase();

                        if (message.includes("код")) {
                            const position = message.indexOf('код');

                            for (let p = position; p < message.length; p++) {

                                if (num.includes('.')) {
                                    break
                                }

                                if (num.includes(message[p])) {
                                    code_sms.push(message[p])
                                }
                            }

                        }
                    }

                    return {status: true, data: code_sms.join('')}
                }
            }

            return { status: false }

        }

        catch (e) {
            Logger.write(process.env.ERROR_LOGS, e);
            return { status: false }
        }
    }

} 