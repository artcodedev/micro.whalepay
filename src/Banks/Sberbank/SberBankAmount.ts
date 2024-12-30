import { SecretKey } from "../../Secure/SeckretKey";
import { Console } from "../../Utils/Console";
import { Fetch } from "../../Utils/Fetch";
import { Token } from "../../Utils/Token";
import { firefox, type Browser, type Locator, type Page } from '@playwright/test'

interface ResponseService {
    status: boolean | null
    type?: Error
}

enum Error {
    CODESMS = "CODESMS",
    DELETESMS = "DELETESMS",
    PROXY = "PROXY",
    LOGIN = "LOGIN",
    NETWORK = "NETWORK",
    NOTFOUNDELEM = "NOTFOUNDELEM",
    PARSE = "PARSE",
    TIMEEND = "TIMEEND",
    SESSIONERROR = "SESSIONERROR",
    OTHER = "OTHER",
    REQVER = "REQVER",
    NONE = "NONE"
}

interface ResponseAmount {
    token: string
    id_card: number
    uid_bank: string
    status: number
    sum: number
}

export class SberBankAmount {

    /*
    *** All variables
    */
    private browser: Browser | undefined;
    private url: string;
    private login: string;
    private pass: string;
    private id_card: number;
    private uid_bank: string
    private number_card: string;
    private DOME_OPERATION: boolean = false;
    private sum: number = 0;

    /*
    *** Count errors
    */
    private Error_OTHER: number = 0;
    private Error_LOGIN: number = 0;
    private Error_PROXY: number = 0;
    private Error_NETWORK: number = 0;
    private Error_NOTFOUNDELEM: number = 0;
    private Error_PARSE: number = 0;
    private Error_SESSIONERROR: number = 0;
    private Error_CODESMS: number = 0
    private Error_DELETESMS: number = 0

    constructor(login: string, pass: string, id_card: number, uid_bank: string, number_card: string) {
        this.login = login;
        this.pass = pass;
        this.id_card = id_card
        this.uid_bank = uid_bank
        this.number_card = number_card
        this.url = 'https://online.sberbank.ru/CSAFront/index.do';
    }

    /*
    *** Response answer when programm is done
    */
    private async response(error: Error | null) {

        const token: string = await Token.sign({ session_uid: '' }, SecretKey.secret_key_micro, 60000);

        const data: ResponseAmount = {
            status: error ? 500 : 200,
            id_card: this.id_card,
            uid_bank: this.uid_bank,
            token: token,
            sum: this.sum
        }

        console.log(data)

        this.DOME_OPERATION = true

        const res = await Fetch.request("http://localhost:5000/api/micro/updateamount", data);

        console.log(res)

    }

    /*
    *** Time sleep (delay)(miliseconds)
    */
    private async delay(time: number): Promise<void> {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    }

    /*
    *** Get amount in string
    */
    private async getAmount(sum: string): Promise<number> {

        const num: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

        const amount: string[] = []

        for (let i of sum) {
            if (num.includes(i)) amount.push(i)
        }

        return Number.parseInt(amount.join(''))
    }

    /*
    *** Close browser
    */
    private async close(): Promise<void> {
        try {

            Console.log('[+] Close browser');
            if (this.browser != undefined) await this.browser.close();
        }
        catch (e) {
            Console.warning('[+] browser is closed')
        }
    }

    /*
    *** All megic here :)
    */
    private async start(): Promise<ResponseService> {

        try {

            this.browser = await firefox.launch({ headless: false, executablePath: '' });
            const page: Page = await this.browser.newPage();

            // defore delete
            try {
                await page.goto(this.url, { timeout: 10000, waitUntil: "domcontentloaded" });
            } catch (e) {
                /*
                *** slow internat 
                */
            }

            await this.delay(3000);

            Console.log('[+] Search input[autocomplete="login"]')
            const login: Locator[] = await page.locator('input[autocomplete="login"]').all();

            if (!login.length) {

                await this.browser.close()

                return { status: false, type: Error.NOTFOUNDELEM };
            }

            login[0].fill(this.login)

            Console.log('[+] Search input[type="password"]')
            const password: Locator[] = await page.locator('input[type="password"]').all();

            if (!password.length) {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            password[0].fill(this.pass)

            Console.log('[+] Search "Войти"')
            const submit: Locator[] = await page.getByText('Войти').all();

            if (submit.length) await submit[0].click();
            else {
                /*
                *** Not found something elems
                */
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(3000);

            const url: string = await page.url();

            /*
            *** if url will not change because show capcha or incorrect password|login
            */

            if (url == this.url) {

                Console.log('[+] Search input[name="captchaCode"]')
                const catcha: Locator[] = await page.locator('input[name="captchaCode"]').all();

                if (catcha.length) {
                    /*
                    *** change proxy
                    */
                    await this.delay(3000);
                    await this.browser.close()
                    Console.log('[+] Need change proxy (show capcha)')
                    return { status: false, type: Error.PROXY };
                }

                Console.log('[+] Search "Неверный логин или пароль"')
                const sub_unde: Locator[] = await page.getByText('Неверный логин или пароль').all();
                if (sub_unde.length) {
                    /*
                    *** fatal error
                    */

                    await this.delay(3000);
                    await this.browser.close()
                    Console.log('[+] Fatal error (login incorect)')
                    return { status: false, type: Error.LOGIN };
                }

            }

            Console.log('[+] Search "Пропустить"')
            const skip: Locator[] = await page.getByText('Пропустить').all();

            if (skip.length) await skip[0].click();
            else {
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(10000);

            Console.log('[+] Get Acard');
            const acard: Locator[] = await page.locator(`a[title="МИР Сберкарта ${this.number_card.slice(this.number_card.length - 4)}"]`).all();

            if (acard.length) await acard[0].click();
            else {
                /*
                *** Not found something elems
                */
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            await this.delay(5000);

            Console.log('[+] Get payment account');
            const payment_account: Locator[] = await page.locator('a[title="Платёжный счёт"]').all();

            if (payment_account.length == 0) {
                /*
                *** Not found something elems
                */
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
            }

            const amount: Locator[] = await payment_account[0].locator(`p`).all();

            if (amount.length == 0) {

                /*
                *** Not found something elems
                */
                await this.browser.close()
                return { status: false, type: Error.NOTFOUNDELEM };
                
            } 

            const sum: string = await amount[0].innerText();

            this.sum = await this.getAmount(sum.split(',')[0]);

            await this.browser.close()

            return sum.length ? {status: true} : { status: false, type: Error.OTHER }

        }
        catch (e) {

            await this.close()

        }

        return { status: false, type: Error.OTHER }

    }

    /*
    *** Start app and check errors
    */
    public async amount(): Promise<void> {

        let staper: boolean = true

        while (staper) {

            if (this.DOME_OPERATION) {
                staper = false
                return
            }

            const start: ResponseService = await this.start();

            if (start.status) {

                await this.response(null)

                staper = false

                return

            }


            if (start.status == false) {

                /* 
                *** Check errors
                */
                Console.error("[+] Status false")

                switch (start.type) {

                    case Error.CODESMS:
                        Console.error('[+] Error.CODESMS')


                        if (this.Error_CODESMS > 2) {
                            await this.response(Error.CODESMS);
                            staper = false
                        }

                        this.Error_CODESMS++

                        break

                    case Error.DELETESMS:
                        Console.error('[+] Error.DELETESMS');

                        if (this.Error_DELETESMS > 2) {
                            await this.response(Error.DELETESMS);
                            staper = false
                        }

                        this.Error_DELETESMS++

                    case Error.OTHER:
                        Console.error('[+] Error.OTHER')

                        if (this.Error_OTHER > 2) {
                            await this.response(Error.OTHER);
                            staper = false
                        }
                        this.Error_OTHER++;
                        break

                    case Error.LOGIN:
                        Console.error('[+] Error.LOGIN')

                        if (this.Error_LOGIN > 3) {
                            await this.response(Error.LOGIN);
                            staper = false
                        }
                        this.Error_LOGIN++;
                        break

                    case Error.NETWORK:
                        Console.error('[+] Error.NETWORK')
                        if (this.Error_NETWORK > 2) {
                            await this.response(Error.NETWORK);
                            staper = false
                        }
                        this.Error_NETWORK++;
                        break

                    case Error.NOTFOUNDELEM:
                        Console.error('[+] Error.NOTFOUNDELEM')
                        if (this.Error_NOTFOUNDELEM > 2) {
                            await this.response(Error.NOTFOUNDELEM);
                            staper = false
                        }
                        this.Error_NOTFOUNDELEM++;
                        break

                    case Error.PARSE:
                        Console.error('[+] Error.PARSE')
                        if (this.Error_PARSE > 2) {
                            await this.response(Error.PARSE);
                            staper = false
                        }
                        this.Error_PARSE++;
                        break

                    case Error.PROXY:
                        Console.error('[+] Error.PROXY')
                        //some do
                        break

                    case Error.SESSIONERROR:
                        Console.error('[+] Error.SESSIONERROR')
                        if (this.Error_SESSIONERROR > 2) {
                            await this.response(Error.SESSIONERROR);
                            staper = false
                        }
                        this.Error_SESSIONERROR++;
                        break

                }
            }
        }

    }
}