import { Console } from "../Utils/Console";
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


interface requestSMSPortTtyData {
    phone: string
    tty: string
}


interface requestSMSPortTty {
    status: boolean
    data: requestSMSPortTtyData[]
}

export class SMSCode {


    /*
    *** Delete all sms for white list
    */
    public static async deleteSMS(phone: string): Promise<requestSMSAnswer> {

        try {

            const token: string = await Token.sign({ uid: 'uid' }, SecretKey.secret_key_micro, 1000);

            const req: requestSMSPortTty = await Fetch.request('http://localhost:3020/getalltty', { token: token });

            if (req.status) {

                for (const i of req.data) {

                    if (i.phone === phone) {

                        const req: { status: boolean } = await Fetch.request('http://localhost:3020/deleteallmessage', { token: token, port: i.tty });

                        Console.log(`[+] Delete all message to number ${i.phone} Status: ${req.status}`)
                        return { status: req.status }

                    }

                }
            }

            return { status: false }

        }

        catch (e) {
            Logger.write(process.env.ERROR_LOGS, e);
            return { status: false }
        }
    }

    /*
    *** Get sms code for withdraw
    */
    public static async getSMS(phone: string): Promise<requestSMSAnswer> {

        try {

            const token: string = await Token.sign({ uid: 'uid' }, SecretKey.secret_key_micro, 1000);

            const req: requestSMSPortTty = await Fetch.request('http://localhost:3020/getalltty', { token: token });

            console.log(req)

            if (req.status) {

                for (const i of req.data) {

                    if (i.phone === phone) {

                        const req: requestSMSRes = await Fetch.request('http://localhost:3020/getallmessages', { token: token, port: i.tty });

                        console.log(req)

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

                                return { status: true, data: code_sms.join('') }
                            }
                        }

                    }

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



